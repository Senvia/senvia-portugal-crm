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

    // Get user's organization
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin client for accessing auth.users
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get all profiles in the organization
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, organization_id')
      .eq('organization_id', profile.organization_id)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get roles for these users
    const userIds = profiles.map(p => p.id)
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
      profiles.map(async (profileItem) => {
        const userRole = roles?.find(r => r.user_id === profileItem.id)
        
        // Get user from auth.users to check banned status
        const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(profileItem.id)
        
        if (authError) {
          console.error(`Error fetching auth user ${profileItem.id}:`, authError)
        }

        const isBanned = authUser?.user?.banned_until 
          ? new Date(authUser.user.banned_until) > new Date()
          : false

        return {
          id: profileItem.id,
          full_name: profileItem.full_name,
          avatar_url: profileItem.avatar_url,
          organization_id: profileItem.organization_id,
          user_id: profileItem.id,
          role: userRole?.role || 'viewer',
          is_banned: isBanned,
        }
      })
    )

    console.log(`Returning ${teamMembers.length} team members for org ${profile.organization_id}`)

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
