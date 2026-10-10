-- TutorLink — starting data (admin can change all of it in the app)

insert into public.settings (id, rate_per_session, min_mark) values (true, 150, 75);

insert into public.modules (code, name) values
  ('DATA6211', 'Database (Introduction)'),
  ('ISEC6321', 'Information Security'),
  ('PROG6221', 'Programming 2A'),
  ('SAND6221', 'System Analysis & Design'),
  ('DATA6222', 'Database (Intermediate)'),
  ('HCIN6222', 'Human Computer Interaction'),
  ('IPMA6212', 'IT Project Management'),
  ('PROG6212', 'Programming 2B'),
  ('PROG1111', 'Programming 1'),
  ('NETW1111', 'Networking Fundamentals'),
  ('MATH1111', 'Mathematics for IT');

insert into public.response_templates (label, body, sort_order) values
  ('Role already filled',
   'Thank you for your application. The tutor position for the selected module(s) has already been filled for this intake. We encourage you to apply again in the next cycle.', 1),
  ('Does not meet standards',
   'After reviewing your academic record, your application does not meet the required mark for the module(s) you selected. We encourage you to reapply once you have achieved the required academic standing.', 2),
  ('Application incomplete',
   'Your application could not be processed as required documentation appears to be incomplete. Please resubmit with a complete and verified Academic Statement of Results.', 3),
  ('Congratulations — approved',
   'Congratulations! Your application to join the Rosebank International Tutoring Programme has been approved. You will receive onboarding information within 2–3 business days. Welcome to the team.', 4);
