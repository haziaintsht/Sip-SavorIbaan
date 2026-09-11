-- ============================================================
-- Storage policies for the "menu-images" bucket (created via the
-- Storage API, public=true so reads bypass RLS automatically).
-- Only admins may upload/replace/delete objects in it.
-- ============================================================

create policy "menu_images_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'menu-images' and public.is_admin());

create policy "menu_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'menu-images' and public.is_admin());

create policy "menu_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'menu-images' and public.is_admin());
