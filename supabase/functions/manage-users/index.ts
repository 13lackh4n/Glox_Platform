// Glox Platform — manage-users Edge Function
//
// Privileged user-management operations (create / delete / change role /
// activate-deactivate) that require the Supabase service role key and must
// never run in the browser. Deploy with:
//   supabase functions deploy manage-users
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are reserved
// secrets that Supabase injects into every Edge Function automatically — no
// manual `supabase secrets set` is needed (and attempting to set them will
// be rejected as reserved names).

import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ROLES = ['student', 'instructor', 'super_admin']

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

  // Service-role client — bypasses RLS, used for every privileged operation below.
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

  const { action } = payload

  try {
    switch (action) {
      case 'create': {
        const email = String(payload.email ?? '').trim()
        const password = String(payload.password ?? '')
        const fullName = String(payload.fullName ?? '').trim()
        const role = ALLOWED_ROLES.includes(payload.role as string)
          ? (payload.role as string)
          : 'student'

        if (!email || !password || !fullName) {
          return jsonResponse({ error: 'Ad, e-poçt və şifrə tələb olunur.' }, 400)
        }
        if (password.length < 6) {
          return jsonResponse({ error: 'Şifrə ən azı 6 simvol olmalıdır.' }, 400)
        }

        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        })
        if (createError || !created.user) {
          return jsonResponse({ error: createError?.message ?? 'İstifadəçi yaradılmadı.' }, 400)
        }

        const newUserId = created.user.id

        // A DB trigger may already mirror auth.users → public.users with
        // defaults; upsert to guarantee the requested role/name land correctly.
        const { error: upsertError } = await supabaseAdmin
          .from('users')
          .upsert(
            { id: newUserId, email, full_name: fullName, role, is_active: true },
            { onConflict: 'id' }
          )
        if (upsertError) {
          await supabaseAdmin.auth.admin.deleteUser(newUserId)
          return jsonResponse({ error: upsertError.message }, 400)
        }

        return jsonResponse({
          user: { id: newUserId, email, full_name: fullName, role, is_active: true },
        })
      }

      case 'delete': {
        const userId = String(payload.userId ?? '')
        if (!userId) return jsonResponse({ error: 'userId tələb olunur.' }, 400)
        if (userId === caller.id) {
          return jsonResponse({ error: 'Öz hesabınızı silə bilməzsiniz.' }, 400)
        }

        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteAuthError) {
          return jsonResponse({ error: deleteAuthError.message }, 400)
        }

        // Defensive cleanup in case there is no ON DELETE CASCADE from auth.users.
        await supabaseAdmin.from('users').delete().eq('id', userId)

        return jsonResponse({ success: true })
      }

      case 'updateRole': {
        const userId = String(payload.userId ?? '')
        const role = payload.role as string
        if (!userId || !ALLOWED_ROLES.includes(role)) {
          return jsonResponse({ error: 'Düzgün istifadəçi və rol tələb olunur.' }, 400)
        }
        if (userId === caller.id) {
          return jsonResponse({ error: 'Öz rolunuzu dəyişə bilməzsiniz.' }, 400)
        }

        const { error: roleError } = await supabaseAdmin
          .from('users')
          .update({ role })
          .eq('id', userId)
        if (roleError) return jsonResponse({ error: roleError.message }, 400)

        return jsonResponse({ success: true })
      }

      case 'setActive': {
        const userId = String(payload.userId ?? '')
        const isActive = payload.isActive
        if (!userId || typeof isActive !== 'boolean') {
          return jsonResponse({ error: 'Düzgün istifadəçi və status tələb olunur.' }, 400)
        }
        if (userId === caller.id) {
          return jsonResponse({ error: 'Öz hesabınızı deaktiv edə bilməzsiniz.' }, 400)
        }

        const { error: statusError } = await supabaseAdmin
          .from('users')
          .update({ is_active: isActive })
          .eq('id', userId)
        if (statusError) return jsonResponse({ error: statusError.message }, 400)

        // Best-effort: actually block/unblock login, not just flip a display flag.
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: isActive ? 'none' : '876000h',
        })
        if (banError) console.error('ban toggle failed:', banError.message)

        return jsonResponse({ success: true })
      }

      default:
        return jsonResponse({ error: 'Naməlum əməliyyat.' }, 400)
    }
  } catch (err) {
    console.error('manage-users error:', err)
    return jsonResponse({ error: 'Daxili server xətası.' }, 500)
  }
})
