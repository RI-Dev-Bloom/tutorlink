/* ITAdmin: a staff account that only helps students with their login: find a student, give them
   a new temporary password, or fix the email they signed up with. It gets nothing else: every
   database rule that lets admin see or change things checks for role 'admin', which this isn't.
   The work itself goes through the admin-users server function. */

alter type public.user_role add value if not exists 'itadmin';
