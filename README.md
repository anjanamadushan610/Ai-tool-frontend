# SriBees AI Tool — web frontend

The phone-first web app for the SriBees AI Tool (Stage B): pick a repo, send a prompt, watch the agent work live, approve or deny risky steps, and read the diff.

Status: **B2 web shell** — login, role-based menu, users (owner), sessions, audit log, my account,
installable PWA. React 19 + Vite 7 + Ant Design 6. Times show in Asia/Colombo.

```bash
npm install
npm run dev      # http://localhost:5190, proxies /api to the control plane on :8000
npm run build    # static files in dist/, served by Caddy in production
```
