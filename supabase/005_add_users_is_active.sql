-- Glox Platform: Add is_active flag for admin user management
-- Run this in the Supabase SQL Editor.
-- Powers the "Deaktiv/Aktiv et" action on /admin/users — the manage-users
-- Edge Function also bans/unbans the matching auth user so a deactivated
-- account cannot log in, not just display as inactive.

alter table public.users
  add column if not exists is_active boolean default true;
