# ADR 0002: WebSocket Signaling with `ws`

**Status:** Accepted  
**Date:** Phase 3  
**Version:** 1.10.0

## Context

WebRTC requires an out-of-band channel to exchange SDP and ICE candidates. QuickMeet needed real-time room events (waiting, ready, user joined/left) alongside signaling messages on the same connection.

## Decision

Use the native `ws` package attached to the existing HTTP server (same port). Message format: `{ type, payload }` JSON. The server validates and forwards signaling; it does not parse SDP semantics.

**Client → Server:** `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PONG`  
**Server → Client:** `ROOM_WAITING`, `ROOM_READY`, `USER_JOINED`, `USER_LEFT`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PING`, `ERROR`

## Alternatives Considered

| Alternative | Why Not Selected |
|-------------|------------------|
| **Socket.IO** | Extra protocol layer, fallbacks, and bundle size; raw WebSocket is sufficient for 1-on-1 |
| **Firebase Realtime DB** | External dependency, cost, and opaque connection model |
| **HTTP long-polling** | Higher latency for ICE trickling; poor fit for real-time signaling |

## Consequences

**Positive**

- Minimal dependencies (`ws` only)
- Same host/port for REST, static files, and WebSocket (`ws://` / `wss://`)
- Heartbeat (`PING`/`PONG`) detects dead connections every 30s
- Phase 10 payload validation: message size cap (64 KB), SDP length cap (32 KB)

**Negative**

- No automatic reconnection or room rejoin logic (disconnect ends the call)
- No message acknowledgment beyond heartbeat
- Manual event routing in `messageHandler.js`

## Implementation References

- `server/websocket/websocketServer.js`
- `server/websocket/messageHandler.js`
- `client/js/socket/socket.js`
