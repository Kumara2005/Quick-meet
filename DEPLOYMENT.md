# QuickMeet — Deployment Guide

## Requirements

| Requirement | Notes |
|-------------|-------|
| **Node.js** | ≥ 18 |
| **HTTPS** | Required for `getUserMedia` in production (localhost exempt) |
| **Ports** | Single port for HTTP + WebSocket (default 3000) |
| **STUN** | Included (`stun.l.google.com`) — add **TURN** for corporate/restrictive NAT |

---

## Production Folder Structure

```
quickmeet/
├── client/          # Static assets (no build step)
├── server/          # Node.js backend
├── package.json
├── package-lock.json
├── .env             # NOT committed — copy from .env.example
└── node_modules/    # npm install on server
```

No bundler required. Deploy the repository (or artifact) as-is.

---

## Build Instructions

There is **no compile step**. Production deploy:

```bash
npm ci --omit=dev
cp .env.example .env
# Edit .env for production
npm start
```

For development:

```bash
npm install
npm run dev
```

---

## Environment Variables (Production)

```env
PORT=3000
NODE_ENV=production
LOG_LEVEL=warn
```

| Variable | Production recommendation |
|----------|---------------------------|
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `warn` or `error` |
| `PORT` | Set per hosting platform |

---

## HTTPS & WebRTC

Browsers require a **secure context** for camera/microphone:

- `https://your-domain.com`  
- WebSocket must use **`wss://`** (same host/port)  
- Reverse proxy must forward WebSocket upgrade headers  

### Nginx example (snippet)

```nginx
server {
    listen 443 ssl;
    server_name meet.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Process Management

Use **PM2**, **systemd**, or platform-native runners:

```bash
# PM2 example
pm2 start server/server.js --name quickmeet
pm2 save
```

---

## Platform Notes

| Platform | Notes |
|----------|-------|
| **VPS** | Node + Nginx + Let's Encrypt |
| **Railway / Render / Fly** | Set `PORT` from platform; enable HTTPS |
| **Docker** | Single container exposing `PORT`; no multi-stage build needed |

### Minimal Dockerfile (optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/server.js"]
```

---

## WebRTC Production Notes

1. **STUN only** works for many home networks; **TURN** needed when P2P fails  
2. Add TURN URLs to `client/js/config/appConfig.js` → `ICE_SERVERS`  
3. Firewall: UDP must not be fully blocked for media (browser-dependent)  
4. Room state is **in-memory** — server restart clears all rooms  
5. Max **2 participants** per room (by design)  

---

## Security Checklist (deploy)

- [ ] HTTPS enabled  
- [ ] `.env` not in git  
- [ ] `NODE_ENV=production`  
- [ ] CORS restricted to your domain (optional hardening in `app.js`)  
- [ ] Rate limiting at reverse proxy (recommended)  
- [ ] Monitor `/health` endpoint  

---

## Health Check

```
GET /health
→ { "success": true, "status": "ok" }
```

Use for load balancer / uptime monitoring.

---

## Rollback

1. Stop process  
2. Restore previous release artifact  
3. `npm ci --omit=dev`  
4. Restart  

No database migrations (in-memory state).
