# QuickMeet — Architecture

## Overview

QuickMeet is a **layered, event-driven** 1-on-1 WebRTC application. The client uses ES modules with clear boundaries; the server provides REST room management and WebSocket signaling.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
├─────────────────────────────────────────────────────────────┤
│  UI Layer          room.js, roomView, toolbar, settings     │
│       ↕ AppEvents (eventBridge)                              │
│  Controller        callController.js                         │
│       ↕                                                      │
│  WebRTC Layer      peer, media, controls, screen, stats      │
│  Device Layer      deviceManager, mediaSwitcher              │
│  Socket Layer      socket.js                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket + REST
┌──────────────────────────▼──────────────────────────────────┐
│  Express (app.js)  +  WebSocket Server (websocketServer.js)  │
│  roomService (in-memory)  +  messageHandler (validation)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Client Layers

### 1. Entry points

- `home.js` — create/join room via REST  
- `room.js` — bootstrap: bridge, controller, UI, media  

### 2. Core (`client/js/core/`)

| Module | Responsibility |
|--------|----------------|
| `appEvents.js` | Application-wide event bus |
| `eventBridge.js` | Maps domain events → app events |
| `callController.js` | Signaling, peer connection lifecycle |
| `roomView.js` | UI reactions to app events (no WebRTC) |
| `appState.js` | Device/session state snapshot |

### 3. WebRTC (`client/js/webrtc/`)

| Submodule | Responsibility |
|-----------|----------------|
| `media/` | `getUserMedia`, local stream |
| `peer/` | RTCPeerConnection, SDP, ICE |
| `controls/` | Mute, camera, end call |
| `screen/` | Screen share via `replaceTrack()` |
| `stats/` | `getStats()`, health score, badge |

### 4. Device management (`client/js/media/`)

Enumeration, hot-plug, permission watching, `mediaSwitcher` (camera/mic switch without renegotiation).

### 5. Configuration (`client/js/config/`)

`appConfig.js` — ICE servers, polling interval, health thresholds, UI timings.

### 6. Utilities (`client/js/utils/`)

`logger.js` — configurable client logging  
`browserSupport.js` — WebRTC capability checks  

---

## Server Architecture

```
server.js → app.js (Express + static client)
         → websocketServer.js (ws on same HTTP server)
              → messageHandler.js (validate + route)
              → roomSocketManager.js (room ↔ sockets)
              → connectionManager.js (socket registry)
```

**Room state:** in-memory (`roomService.js`). Not persistent across server restarts.

**Limits:** `MAX_PARTICIPANTS = 2` (1-on-1 only).

---

## Event Flow (call start)

```
USER_JOINED (WS) → callController.startAsCaller()
  → initPeerConnection() → createOffer() → OFFER (WS)
  → remote ANSWER (WS) → handleAnswer()
  → ICE candidates exchanged
  → PEER_CONNECTED → eventBridge → CALL_STARTED
  → healthIndicator.start(pc)
```

---

## Security Model

- Room codes validated server-side (`ABC-123` pattern)  
- WebSocket messages: JSON parse guard, size limits, payload type checks  
- SDP length limits  
- No HTML injection in UI (textContent for notifications; escaped option labels)  
- CORS enabled (tighten origin in production)  

---

## Dependency Rules

- UI modules **subscribe** to `AppEvents` — do not import WebRTC directly  
- Domain modules **dispatch** local events — bridged by `eventBridge`  
- `callController` owns `peerConnection` reference  
- `mediaSwitcher` uses `replaceTrack()` — never renegotiates for device/screen changes  

---

## Phase 10 Additions

- Centralized `appConfig.js` + `server/config/constants.js`  
- Configurable logging (`LOG_LEVEL`, client quiet in production)  
- Removed duplicate device/permission listeners  
- Improved socket/media cleanup on disconnect  
- WebSocket payload validation  

---

## Extension Points (future)

| Feature | Integration point |
|---------|-------------------|
| TURN | `AppConfig.ICE_SERVERS` |
| Auth | Express middleware + WS handshake |
| Multi-party | New signaling topology + mesh/SFU |
| Recording | `AppEvents.CALL_STARTED` / `CALL_ENDED` hooks |
