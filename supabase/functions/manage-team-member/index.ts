import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageMemberRequest {
  action: 'change_password' | 'change_role' | 'toggle_status';
  user_id: string;
  new_password?: string;
  new_role?: 'admin' | 'viewer' | 'salesperson';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's token to verify they're authenticated
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if current user is admin
    const { data: currentUserRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id);

    if (rolesError) {
      console.error('Roles error:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = currentUserRoles?.some(r => r.role === 'admin' || r.role === 'super_admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem gerir membros' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user's organization
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !currentProfile?.organization_id) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Organização não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ManageMemberRequest = await req.json();
    const { action, user_id, new_password, new_role } = body;

    console.log(`Action: ${action}, Target user: ${user_id}`);

    // Verify target user belongs to the same organization
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user_id)
      .single();

    if (targetError || !targetProfile) {
      console.error('Target profile error:', targetError);
      return new Response(
        JSON.stringify({ error: 'Membro não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetProfile.organization_id !== currentProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Não pode gerir membros de outra organização' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from modifying themselves for certain actions
    if (user_id === currentUser.id && (action === 'toggle_status' || action === 'change_role')) {
      return new Response(
        JSON.stringify({ error: 'Não pode modificar o seu próprio estado ou perfil' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute the action
    switch (action) {
      case 'change_password': {
        if (!new_password || new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: 'A password deve ter pelo menos 6 caracteres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          password: new_password,
        });

        if (updateError) {
          console.error('Password update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Erro ao alterar password' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Password changed for user ${user_id}`);
        break;
      }

      case 'change_role': {
        if (!new_role || !['admin', 'viewer', 'salesperson'].includes(new_role)) {
          return new Response(
            JSON.stringify({ error: 'Perfil inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete existing roles (except super_admin)
        const { error: deleteError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', user_id)
          .neq('role', 'super_admin');

        if (deleteError) {
          console.error('Role delete error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Erro ao alterar perfil' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Insert new role
        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id, role: new_role });

        if (insertError) {
          console.error('Role insert error:', insertError);
          return new Response(
            JSON.stringify({ error: 'Erro ao alterar perfil' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Role changed to ${new_role} for user ${user_id}`);
        break;
      }

      case 'toggle_status': {
        // Get current user status
        const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);

        if (getUserError || !userData.user) {
          console.error('Get user error:', getUserError);
          return new Response(
            JSON.stringify({ error: 'Erro ao obter estado do utilizador' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isBanned = userData.user.banned_until && new Date(userData.user.banned_until) > new Date();

        if (isBanned) {
          // Unban user
          const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
            ban_duration: 'none',
          });

          if (unbanError) {
            console.error('Unban error:', unbanError);
            return new Response(
              JSON.stringify({ error: 'Erro ao ativar utilizador' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`User ${user_id} activated`);
        } else {
          // Ban user for 100 years (effectively permanent)
          const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
            ban_duration: '876600h', // 100 years
          });

          if (banError) {
            console.error('Ban error:', banError);
            return new Response(
              JSON.stringify({ error: 'Erro ao desativar utilizador' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`User ${user_id} deactivated`);
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
