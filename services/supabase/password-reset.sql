-- Forgotten passwords. A college admin makes a reset link for a member of staff in Nisia (Staff › the person › Reset
-- their password) and sends it to them however suits (text, email, Teams). It works once, within 24 hours: the
-- person chooses a new password, then signs in as usual, with their authenticator app's code. (Staff can also ask for
-- a reset email from the sign-in screen; this is for when that doesn't reach them.)
--
--   nisia_password_reset_link   an admin makes a reset code for one of their staff (returns the code)
--   nisia_redeem_reset          the code and a new password (anyone with the code; no sign-in)

create table if not exists private.password_resets (
  code_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  created_by uuid,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.nisia_password_reset_link(p_member uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_m public.organisation_members; v_code text; v_email text;
begin
  select * into v_m from public.organisation_members where id = p_member;
  if v_m.id is null or not private.mfa_ok() or not private.can_manage_org(v_m.organisation_id) then raise exception 'Only the college’s admins can reset passwords.'; end if;
  if not v_m.active then raise exception 'Switch them back on first.'; end if;
  select email into v_email from auth.users where id = v_m.user_id;
  if v_email is null or v_email like '%@learners.nisia.invalid' then raise exception 'Learners don’t have a password: connect their Evia again instead.'; end if;
  v_code := upper(substr(encode(extensions.gen_random_bytes(12), 'hex'), 1, 16));
  insert into private.password_resets (code_hash, user_id, organisation_id, created_by, expires_at)
  values (encode(extensions.digest(v_code, 'sha256'), 'hex'), v_m.user_id, v_m.organisation_id, auth.uid(), now() + interval '24 hours');
  return jsonb_build_object('code', v_code, 'email', v_email, 'expires_at', now() + interval '24 hours');
end $$;

create or replace function public.nisia_redeem_reset(p_code text, p_password text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_r private.password_resets; v_email text;
begin
  select * into v_r from private.password_resets where code_hash = encode(extensions.digest(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex');
  if v_r.code_hash is null or v_r.used_at is not null or v_r.expires_at < now() then raise exception 'That reset link has expired or been used. Ask your college admin for a new one.'; end if;
  if length(coalesce(p_password, '')) < 10 or p_password !~ '[a-z]' or p_password !~ '[A-Z]' or p_password !~ '[0-9]' or p_password !~ '[^A-Za-z0-9]'
    then raise exception 'At least 10 characters, with upper and lower case letters, a number and a symbol.'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = v_r.user_id returning email into v_email;
  update private.password_resets set used_at = now() where code_hash = v_r.code_hash;
  return v_email;
end $$;

grant execute on function public.nisia_password_reset_link(uuid) to authenticated;
grant execute on function public.nisia_redeem_reset(text, text) to anon, authenticated;
