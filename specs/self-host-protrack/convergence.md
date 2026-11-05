# Convergence review

Status: complete against deployment evidence supplied by the root agent.

- Release archive checksum: `226e5bde22c17e3966fa53e26152b150ecd6d3cc71f99b0066dce6c29ab1bbdd`.
- VM210 is running Debian with 2 vCPU, 4 GiB RAM, 64 GiB disk; Docker 29.9.3 and Compose 5.7 are installed.
- PostgreSQL is persistent and private; restart and VM reboot preserved the verified file hash. Admin-only bootstrap was verified.
- Nginx serves on `10.99.9.21:8080`; API auth, signup closure, public login, and 25-second SSE heartbeat passed.
- External `https://protrack.warnoto.com` returned HTTP 200; auth config reported `registrationOpen:false`; anonymous projects returned 401.
- VM dump, PVE copy checksum, and isolated restore including admin verification passed.
- Timers, firewall, and restart checks passed. VM200 inbound 8080 is blocked; source PVE access works.
- Tunnel v19 added one route while preserving existing routes. CT100/VM200/Postiz configuration remained unchanged.

No known implementation gap remains in the feature artifacts. Final operational records and HANDOFF updates remain owned by the root agent.
