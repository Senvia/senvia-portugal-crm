import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { meetsMfaPolicy } from '../_shared/user-authorization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return json({ error: 'Serviço indisponível' }, 503);
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Não autorizado' }, 401);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Não autorizado' }, 401);
    if (!await meetsMfaPolicy(userClient, user.id)) return json({ error: 'MFA_REQUIRED' }, 403);
    const body = await req.json();
    if (!body || typeof body !== 'object' || typeof body.organization_id !== 'string' ||
        typeof body.user_id !== 'string' || typeof body.action !== 'string') {
      return json({ error: 'Organização, membro e ação são obrigatórios' }, 400);
    }
    const { action, user_id, organization_id: sharedOrgId, new_role, profile_id } = body;
    const supabaseAdmin = createClient(url, serviceKey);
    const { data: isAdmin, error: permissionError } = await supabaseAdmin.rpc('is_org_admin', {
      _user_id: user.id, _org_id: sharedOrgId,
    });
    if (permissionError || isAdmin !== true) {
      return json({ error: 'Apenas administradores desta organização podem gerir membros' }, 403);
    }
    const { data: target, error: targetError } = await supabaseAdmin.from('organization_members')
      .select('is_active').eq('user_id', user_id).eq('organization_id', sharedOrgId).maybeSingle();
    if (targetError || !target) return json({ error: 'Membro não encontrado nesta organização' }, 404);
    if (action === 'change_password') {
      return json({ error: 'A palavra-passe só pode ser alterada pelo titular através da recuperação de acesso.' }, 403);
    }
    if (user_id === user.id && ['toggle_status', 'change_role', 'delete_member'].includes(action)) {
      return json({ error: 'Não pode modificar o seu próprio estado ou perfil' }, 400);
    }
    if (action === 'change_role' && profile_id) {
      if (typeof profile_id !== 'string') return json({ error: 'Perfil inválido' }, 400);
      const { data: profile, error } = await supabaseAdmin.from('organization_profiles')
        .select('id, base_role').eq('id', profile_id).eq('organization_id', sharedOrgId).maybeSingle();
      if (error || !profile || profile.base_role !== new_role) return json({ error: 'Perfil inválido para esta organização' }, 400);
    }

    async function redistributeLeads(deactivatedUserId: string, orgId: string) {
      try {
        // Get leads assigned to this user in this org
        const { data: leadsToReassign } = await supabaseAdmin
          .from('leads')
          .select('id')
          .eq('assigned_to', deactivatedUserId)
          .eq('organization_id', orgId);

        if (!leadsToReassign || leadsToReassign.length === 0) {
          console.log('No leads to redistribute');
          return;
        }

        // Get org sales settings
        const { data: orgData } = await supabaseAdmin
          .from('organizations')
          .select('sales_settings')
          .eq('id', orgId)
          .single();

        const salesSettings = orgData?.sales_settings || {};

        // Get active members (excluding the deactivated user)
        let membersQuery = supabaseAdmin
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .neq('user_id', deactivatedUserId);

        if (salesSettings.exclude_admins_from_assignment) {
          membersQuery = membersQuery.neq('role', 'admin');
        }

        const { data: activeMembers } = await membersQuery.order('joined_at', { ascending: true });

        if (!activeMembers || activeMembers.length === 0) {
          console.log('No active members to reassign leads to');
          return;
        }

        let currentIndex = salesSettings.round_robin_index || 0;

        for (const lead of leadsToReassign) {
          const safeIndex = currentIndex % activeMembers.length;
          const newAssignee = activeMembers[safeIndex].user_id;

          await supabaseAdmin
            .from('leads')
            .update({ assigned_to: newAssignee })
            .eq('id', lead.id);

          currentIndex = (safeIndex + 1) % activeMembers.length;
        }

        // Update round_robin_index
        await supabaseAdmin
          .from('organizations')
          .update({ sales_settings: { ...salesSettings, round_robin_index: currentIndex } })
          .eq('id', orgId);

        console.log(`Redistributed ${leadsToReassign.length} leads from user ${deactivatedUserId}`);
      } catch (err) {
        console.error('Lead redistribution error:', err);
      }
    }


    switch (action) {
      case 'change_role': {
        if (!['admin', 'viewer', 'salesperson'].includes(new_role)) return json({ error: 'Perfil inválido' }, 400);
        const { error } = await supabaseAdmin.from('organization_members')
          .update({ role: new_role, profile_id: profile_id || null })
          .eq('user_id', user_id).eq('organization_id', sharedOrgId);
        if (error) return json({ error: 'Erro ao alterar perfil' }, 500);
        break;
      }
      case 'toggle_status': {
        const { error } = await supabaseAdmin.from('organization_members')
          .update({ is_active: !target.is_active }).eq('user_id', user_id).eq('organization_id', sharedOrgId);
        if (error) return json({ error: 'Erro ao alterar estado' }, 500);
        if (target.is_active) await redistributeLeads(user_id, sharedOrgId);
        break;
      }
      case 'delete_member': {
        const { error } = await supabaseAdmin.from('organization_members').delete()
          .eq('user_id', user_id).eq('organization_id', sharedOrgId);
        if (error) return json({ error: 'Erro ao remover membro' }, 500);
        await redistributeLeads(user_id, sharedOrgId);
        break;
      }
      case 'update_profile': {
        if (user_id !== user.id) return json({ error: 'Os dados pessoais são geridos pelo titular da conta' }, 403);
        const fields: Record<string, string> = {};
        for (const field of ['full_name', 'phone', 'email']) {
          if (body[field] !== undefined) {
            if (typeof body[field] !== 'string') return json({ error: 'Dados inválidos' }, 400);
            fields[field] = body[field].trim();
          }
        }
        if (!Object.keys(fields).length) return json({ error: 'Nenhum campo para atualizar' }, 400);
        const { error } = await supabaseAdmin.from('profiles').update(fields).eq('id', user.id);
        if (error) return json({ error: 'Erro ao atualizar perfil' }, 500);
        break;
      }
      default: return json({ error: 'Ação inválida' }, 400);
    }
    return json({ success: true });
  } catch (error) {
    console.error('manage-team-member failed', error instanceof Error ? error.name : 'UnknownError');
    return json({ error: 'Erro interno do servidor' }, 500);
  }
});
