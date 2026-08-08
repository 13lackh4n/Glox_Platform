// Glox Platform — delete-user Edge Function
//
// Permanently deletes a user and every dependent record. Deploy with:
//   supabase functions deploy delete-user --project-ref bhgjohlvsfcaurapzjam
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are reserved
// secrets Supabase injects into every Edge Function automatically — no
// manual `supabase secrets set` is needed.
//
// Deletion order (defensive — correct whether or not the ON DELETE CASCADE
// constraints from 008_user_deletion_cascade.sql have been applied yet):
//   1. answers (via this user's results)
//   2. results
//   3. certificates
//   4. enrollments
//   5. enrollment_requests
//   6. group_members
//   7. lesson_completions
//   8. public.users
//   9. auth.users (Supabase Admin API)

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: 'Server konfiqurasiyası tamamlanmayıb.' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Giriş tələb olunur.' }, 401)
  }

  // Client scoped to the caller's own JWT — used only to identify who is calling.
  const supabaseCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user: caller },
    error: callerError,
  } = await supabaseCaller.auth.getUser()

  if (callerError || !caller) {
    return jsonResponse({ error: 'Giriş etibarsızdır.' }, 401)
  }

  // Service-role client — bypasses RLS, used for every deletion below.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfileError || callerProfile?.role !== 'super_admin') {
    return jsonResponse({ error: 'Bu əməliyyat üçün icazəniz yoxdur.' }, 403)
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Yanlış sorğu formatı.' }, 400)
  }

  const userId = String(payload.user_id ?? '')
  if (!userId) {
    return jsonResponse({ error: 'user_id tələb olunur.' }, 400)
  }
  if (userId === caller.id) {
    return jsonResponse({ error: 'Öz hesabınızı silə bilməzsiniz.' }, 400)
  }

  try {
    // 1-2. answers (via this user's results) + results
    const { data: userResults } = await supabaseAdmin
      .from('results')
      .select('id')
      .eq('user_id', userId)
    const resultIds = (userResults ?? []).map((r) => r.id)
    if (resultIds.length > 0) {
      await supabaseAdmin.from('answers').delete().in('result_id', resultIds)
    }
    await supabaseAdmin.from('results').delete().eq('user_id', userId)

    // 3. certificates
    await supabaseAdmin.from('certificates').delete().eq('user_id', userId)

    // 4. enrollments
    await supabaseAdmin.from('enrollments').delete().eq('user_id', userId)

    // 5. enrollment_requests
    await supabaseAdmin.from('enrollment_requests').delete().eq('user_id', userId)

    // 6. group_members
    await supabaseAdmin.from('group_members').delete().eq('user_id', userId)

    // 7. lesson_completions
    await supabaseAdmin.from('lesson_completions').delete().eq('user_id', userId)

    // 8. public.users
    const { error: usersDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
    if (usersDeleteError) {
      return jsonResponse({ error: usersDeleteError.message }, 400)
    }

    // 9. auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      return jsonResponse({ error: authDeleteError.message }, 400)
    }

    return jsonResponse({ success: true })
  } catch (err) {
    console.error('delete-user error:', err)
    return jsonResponse({ error: 'Daxili server xətası.' }, 500)
  }
})
