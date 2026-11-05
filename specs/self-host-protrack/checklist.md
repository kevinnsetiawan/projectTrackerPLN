# Readiness checklist

- [ ] No production secret is committed or printed.
- [ ] VM210 IP is verified free immediately before creation.
- [ ] CT100 and VM200 configs/routes are unchanged.
- [ ] PostgreSQL volume survives container restart.
- [ ] Public reads are authenticated in production; auth config remains public.
- [ ] Registration is closed in API and UI.
- [ ] Nginx SSE stream is unbuffered.
- [ ] External HTTPS/login smoke test passes.
- [ ] Seven daily PostgreSQL dumps created on the VM, retention, capacity guard, PVE copy, and isolated restore test pass.
