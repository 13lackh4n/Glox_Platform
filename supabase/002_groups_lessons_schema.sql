-- Glox Platform: Groups, enrollment requests, lessons & materials
-- Run this in the Supabase SQL Editor AFTER 001 (initial schema) and the
-- rls_patch_instructor_admin.sql patch (this script relies on the
-- public.current_user_role() helper defined there).

-- =========================================================
-- GROUPS
-- =========================================================
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) not null,
  name text not null,
  description text,
  max_students int default 20,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.groups enable row level security;

create policy "Anyone can view active groups"
  on public.groups for select using (is_active = true);

create policy "Instructors manage own course groups"
  on public.groups for all
  using (
    exists (
      select 1 from public.courses c
      where c.id = groups.course_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins manage all groups"
  on public.groups for all
  using (public.current_user_role() = 'super_admin');

-- =========================================================
-- GROUP MEMBERS
-- =========================================================
create table public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) not null,
  user_id uuid references public.users(id) not null,
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);
alter table public.group_members enable row level security;

create policy "Users view own membership"
  on public.group_members for select using (user_id = auth.uid());

create policy "Instructors manage own course group members"
  on public.group_members for all
  using (
    exists (
      select 1 from public.groups g
      join public.courses c on c.id = g.course_id
      where g.id = group_members.group_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins manage all group members"
  on public.group_members for all
  using (public.current_user_role() = 'super_admin');

-- =========================================================
-- ENROLLMENT REQUESTS
-- =========================================================
create table public.enrollment_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  course_id uuid references public.courses(id) not null,
  group_id uuid references public.groups(id),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message text,
  admin_note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  unique(user_id, course_id)
);
alter table public.enrollment_requests enable row level security;

create policy "Users view own requests"
  on public.enrollment_requests for select using (user_id = auth.uid());

create policy "Users create own requests"
  on public.enrollment_requests for insert with check (user_id = auth.uid());

create policy "Instructors view own course requests"
  on public.enrollment_requests for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = enrollment_requests.course_id and c.instructor_id = auth.uid()
    )
  );

create policy "Instructors update own course requests"
  on public.enrollment_requests for update
  using (
    exists (
      select 1 from public.courses c
      where c.id = enrollment_requests.course_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins manage all requests"
  on public.enrollment_requests for all
  using (public.current_user_role() = 'super_admin');

-- =========================================================
-- LESSONS
-- =========================================================
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) not null,
  group_id uuid references public.groups(id),
  title text not null,
  description text,
  order_num int default 0,
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);
alter table public.lessons enable row level security;

-- Enrolled students see published lessons meant for their group (or for everyone)
create policy "Enrolled students view published lessons"
  on public.lessons for select
  using (
    is_published = true
    and exists (
      select 1 from public.enrollments e
      where e.course_id = lessons.course_id
        and e.user_id = auth.uid()
        and (lessons.group_id is null or e.group_id = lessons.group_id)
    )
  );

create policy "Instructors manage own course lessons"
  on public.lessons for all
  using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins manage all lessons"
  on public.lessons for all
  using (public.current_user_role() = 'super_admin');

-- =========================================================
-- MATERIALS
-- =========================================================
create table public.materials (
  id uuid default gen_random_uuid() primary key,
  lesson_id uuid references public.lessons(id) not null,
  type text check (type in ('pdf', 'video', 'image', 'link')),
  title text not null,
  file_url text not null,
  file_size bigint,
  order_num int default 0,
  created_at timestamptz default now()
);
alter table public.materials enable row level security;

-- Visible to whoever can see the parent lesson (enrolled student or owning instructor)
create policy "Materials visible via lesson visibility"
  on public.materials for select
  using (
    exists (
      select 1 from public.lessons l
      where l.id = materials.lesson_id
        and (
          (
            l.is_published = true
            and exists (
              select 1 from public.enrollments e
              where e.course_id = l.course_id
                and e.user_id = auth.uid()
                and (l.group_id is null or e.group_id = l.group_id)
            )
          )
          or exists (
            select 1 from public.courses c
            where c.id = l.course_id and c.instructor_id = auth.uid()
          )
        )
    )
  );

create policy "Instructors manage own lesson materials"
  on public.materials for all
  using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = materials.lesson_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins manage all materials"
  on public.materials for all
  using (public.current_user_role() = 'super_admin');
