# QuickMeet

**QuickMeet** is a production-ready, browser-based **1-on-1 video calling** application built with **raw WebRTC** (no third-party SDKs). It includes room management, WebSocket signaling, media controls, screen sharing, connection monitoring, and device switching.

---

## Features

| Area | Capabilities |
|------|----------------|
| **Rooms** | Create/join via code (`ABC-123`), max 2 participants |
| **Media** | Camera, microphone, mute, camera toggle, device switching |
| **WebRTC** | Offer/answer, ICE, `replaceTrack()` for screen share & devices |
| **Monitoring** | `getStats()` polling, health badge (0–100 score) |
| **Architecture** | Event bus, call controller, modular ES modules |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JS (ES modules), HTML5, CSS3 |
| Backend | Node.js, Express |
| Signaling | WebSocket (`ws`) |
| WebRTC | Native `RTCPeerConnection`, STUN |
| Storage | In-memory rooms (server), `localStorage` (device prefs) |

---

## Installation

```bash
git clone <repository-url>
cd quickmeet
npm install
cp .env.example .env
```

---

## Running Locally

```bash
npm run dev    # development with nodemon
# or
npm start      # production mode
```

Open **http://localhost:3000** (or your configured `PORT`).

### Two-tab test

1. Click **Create Room** → copy room code  
2. Open the same URL in a second browser tab → **Join Room**  
3. Allow camera/microphone → call connects automatically  

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP + WebSocket port |
| `NODE_ENV` | `development` | `production` reduces server logging |
| `LOG_LEVEL` | `debug` (dev) / `warn` (prod) | Server log verbosity |

Client debug logging is enabled on `localhost` or with `?debug=true` in the URL.

---

## Project Structure

```
quickmeet/
├── client/                 # Static SPA (served by Express)
│   ├── index.html          # Home — create/join
│   ├── room.html           # Waiting room + call UI
│   ├── css/
│   └── js/
│       ├── config/         # App constants (ICE, polling, thresholds)
│       ├── core/           # Event bus, call controller, room view
│       ├── media/          # Device switching (Phase 9)
│       ├── socket/         # WebSocket client
│       ├── ui/             # Health badge, settings modal
│       └── webrtc/         # Media, peer, controls, screen, stats
├── server/
│   ├── config/constants.js
│   ├── routes/, controllers/, services/
│   └── websocket/          # Signaling server
├── ARCHITECTURE.md
├── DEPLOYMENT.md
├── QA_CHECKLIST.md
└── CHANGELOG.md
```

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rooms/create` | Create room → `{ roomCode }` |
| `POST` | `/api/rooms/join` | Join room `{ roomCode }` |
| `POST` | `/api/rooms/leave` | Leave room |
| `GET` | `/api/rooms/:code` | Room status |
| `GET` | `/health` | Health check |

---

## WebSocket Events

**Client → Server:** `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PONG`  
**Server → Client:** `ROOM_WAITING`, `ROOM_READY`, `USER_JOINED`, `USER_LEFT`, `PING`, `ERROR`

---

## Application Events (client)

Central bus in `client/js/core/appEvents.js` — e.g. `CALL_STARTED`, `MEDIA_READY`, `CAMERA_CHANGED`, `NETWORK_QUALITY_CHANGED`. Domain modules publish to local event buses; `eventBridge.js` maps them to app events.

---

## Development Guide

1. **No build step** — ES modules served directly from `client/`  
2. **Modify server** — restart `npm run dev`  
3. **Client changes** — refresh browser (hard refresh if needed)  
4. **Debug client logs** — use `localhost` or append `?debug=true`  
5. **Debug server logs** — set `LOG_LEVEL=debug` in `.env`  

### Key modules

| Module | Role |
|--------|------|
| `callController.js` | Signaling + peer lifecycle |
| `mediaSwitcher.js` | Camera/mic switch via `replaceTrack()` |
| `connectionMonitor.js` | Stats polling + health UI |
| `eventBridge.js` | Domain → app event mapping |

---

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome / Edge | Full |
| Firefox | Full |
| Safari 11+ | Supported (test device switching & screen share) |

Requires **HTTPS** (or `localhost`) for `getUserMedia`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port in use | Change `PORT` in `.env` or `taskkill` the process |
| Camera denied | Allow permissions in browser settings |
| No remote video | Check firewall/NAT; STUN only (no TURN yet) |
| Room full | Max 2 participants per room |
| WebSocket fails | Ensure same host/port; use `wss://` behind HTTPS |

---

## Future Improvements

- TURN servers for restrictive NATs  
- Multi-party calling (SFU/mesh)  
- Authentication & persistent rooms  
- Recording, chat, virtual background  
- Automated E2E tests (Playwright)  

---

## License

MIT
