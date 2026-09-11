import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { meetsMfaPolicy } from '../_shared/user-authorization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateMemberRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'viewer' | 'salesperson';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify who is calling
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Utilizador não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!await meetsMfaPolicy(supabaseUser, currentUser.id)) {
      return new Response(JSON.stringify({ error: 'MFA_REQUIRED' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { email, password, full_name, role, profile_id, organization_id } = await req.json();
    if (typeof organization_id !== 'string' || !organization_id) {
      return new Response(JSON.stringify({ error: 'Organização obrigatória' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const organizationId = organization_id;

    // ---- Validate user limit based on subscription plan ----
    // Get org plan (+ per-org override and billing-exempt flag)
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('plan, max_users_override, billing_exempt')
      .eq('id', organizationId)
      .single();

    const planId = orgData?.plan || 'starter';

    // Get plan limits from subscription_plans
    const { data: planData } = await supabaseAdmin
      .from('subscription_plans')
      .select('max_users, name')
      .eq('id', planId)
      .single();

    // Effective limit: per-org override always wins; null/undefined = unlimited.
    // Billing-exempt orgs (demos, internal, partners) skip the limit entirely.
    // (grandfathering / negociações pontuais via max_users_override por org)
    const overrideUsers = orgData?.max_users_override;
    const effectiveMaxUsers =
      overrideUsers !== null && overrideUsers !== undefined ? overrideUsers : planData?.max_users;

    if (!orgData?.billing_exempt && effectiveMaxUsers !== null && effectiveMaxUsers !== undefined) {
      // Count active members
      const { count: memberCount } = await supabaseAdmin
        .from('organization_members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (memberCount !== null && memberCount >= effectiveMaxUsers) {
        return new Response(
          JSON.stringify({
            error: `Limite de ${effectiveMaxUsers} utilizadores atingido para o plano ${planData?.name || planId}. Faça upgrade para adicionar mais membros.`
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: isAuthorized, error: permissionError } = await supabaseAdmin.rpc('is_org_admin', {
      _user_id: currentUser.id, _org_id: organizationId,
    });

    if (permissionError || isAuthorized !== true) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem adicionar membros' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body


    // Validate input
    if (typeof email !== 'string' || typeof password !== 'string' || typeof full_name !== 'string' || !email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A password deve ter pelo menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['admin', 'viewer', 'salesperson'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Perfil inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile_id) {
      const { data: orgProfile, error } = await supabaseAdmin.from('organization_profiles')
        .select('id, base_role').eq('id', profile_id).eq('organization_id', organizationId).maybeSingle();
      if (error || !orgProfile || orgProfile.base_role !== role) {
        return new Response(JSON.stringify({ error: 'Perfil inválido para esta organização' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar utilizadores existentes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    let userId: string;

    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Conta existente. Utilize um convite aceite pelo titular.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar utilizador: ' + createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!newUser.user) {
        return new Response(
          JSON.stringify({ error: 'Erro ao criar utilizador' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log(`New user created: ${userId}`);
    }

    console.log(`Processing user: ${userId}`);

    // Update profile with organization_id and full_name
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name.trim()
      })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError);
      throw updateProfileError;
    }

    // Add to organization_members table
    const memberData: Record<string, unknown> = {
      user_id: userId,
      organization_id: organizationId,
      role: role,
      is_active: true,
      joined_at: new Date().toISOString(),
    };
    if (profile_id) memberData.profile_id = profile_id;

    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .upsert(memberData, { onConflict: 'user_id,organization_id' });

    if (memberError) {
      throw memberError;
    }



    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        email: normalizedEmail
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
