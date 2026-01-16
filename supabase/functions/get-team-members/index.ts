import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create client with user's auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get current user
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin client for accessing auth.users and bypassing RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user is super_admin
    const { data: userRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    const isSuperAdmin = userRoles?.some(r => r.role === 'super_admin') ?? false

    // Get organization_id from query params or body
    const url = new URL(req.url)
    let organizationId = url.searchParams.get('organization_id')
    
    // If not in query params, try body
    if (!organizationId && req.method === 'POST') {
      try {
        const body = await req.json()
        organizationId = body.organization_id
      } catch {
        // Body parsing failed, continue
      }
    }

    // If no org ID provided, try to get from profile
    if (!organizationId) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      organizationId = profile?.organization_id
    }

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Organization not found. Please provide organization_id.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to this organization (unless super_admin)
    if (!isSuperAdmin) {
      const { data: membership } = await adminClient
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle()

      // Also check if user's profile org matches
      const { data: profile } = await adminClient
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!membership && profile?.organization_id !== organizationId) {
        return new Response(
          JSON.stringify({ error: 'Access denied to this organization' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get all organization members
    const { data: members, error: membersError } = await adminClient
      .from('organization_members')
      .select('user_id, role, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (membersError) {
      console.error('Error fetching members:', membersError)
      throw membersError
    }

    if (!members || members.length === 0) {
      console.log(`No members found for org ${organizationId}`)
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get profiles for these users
    const userIds = members.map(m => m.user_id)
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    // Get roles for these users
    const { data: roles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds)

    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      throw rolesError
    }

    // Get banned status from auth.users
    const teamMembers = await Promise.all(
      members.map(async (member) => {
        const profileItem = profiles?.find(p => p.id === member.user_id)
        const userRole = roles?.find(r => r.user_id === member.user_id)
        
        // Get user from auth.users to check banned status
        const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(member.user_id)
        
        if (authError) {
          console.error(`Error fetching auth user ${member.user_id}:`, authError)
        }

        const isBanned = authUser?.user?.banned_until 
          ? new Date(authUser.user.banned_until) > new Date()
          : false

        return {
          id: member.user_id,
          full_name: profileItem?.full_name || 'Unknown',
          avatar_url: profileItem?.avatar_url,
          organization_id: organizationId,
          user_id: member.user_id,
          role: userRole?.role || member.role || 'viewer',
          is_banned: isBanned,
        }
      })
    )

    console.log(`Returning ${teamMembers.length} team members for org ${organizationId}`)

    return new Response(
      JSON.stringify(teamMembers),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-team-members:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
