-- Glox Platform: Storage bucket for lesson materials (PDFs, images, videos)
-- Run this in the Supabase SQL Editor after 002_groups_lessons_schema.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  52428800, -- 50MB in bytes
  array['application/pdf', 'image/*', 'video/*']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Any authenticated user can read (needed so enrolled students can view
-- material files fetched via signed/public URL through the app)
create policy "Authenticated users can read materials"
  on storage.objects for select
  using (bucket_id = 'materials' and auth.role() = 'authenticated');

-- Only instructors (owners of the lesson's course) can upload; enforced at
-- the application layer since storage policies can't easily join across
-- lessons/courses — the materials table RLS is the real gate for who can
-- attach an uploaded file to a lesson.
create policy "Authenticated users can upload materials"
  on storage.objects for insert
  with check (bucket_id = 'materials' and auth.role() = 'authenticated');

create policy "Authenticated users can delete materials"
  on storage.objects for delete
  using (bucket_id = 'materials' and auth.role() = 'authenticated');
