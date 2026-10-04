-- Once every Symi in use goes through the named actions (actions-registers.sql, Symi 0.29.0 and later): the class
-- tables can only be read and changed through those actions, never directly. Apply after the new Symi is published.
revoke insert, update, delete on public.classes, public.class_learners, public.class_sessions, public.class_attendance from authenticated;
revoke select on public.classes, public.class_learners, public.class_sessions, public.class_attendance from authenticated;
