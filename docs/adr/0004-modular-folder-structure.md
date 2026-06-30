# ADR 0004: Modular ES Module Folder Structure

**Status:** Accepted  
**Date:** Phase 1–10 (evolved incrementally)  
**Version:** 1.10.0

## Context

QuickMeet grew from a static landing page to a full WebRTC client with device management, stats, and screen sharing. The codebase needed predictable locations for new code and enforceable layer boundaries.

## Decision

Organize the client into layered folders with ES modules (no bundler). Each module has a single responsibility.

```
client/js/
├── config/       # Constants (ICE, thresholds, socket event names)
├── core/         # App bus, controller, state, room view
├── media/        # Device enumeration, switching, persistence (Phase 9)
├── socket/       # WebSocket wrapper
├── ui/           # Health badge, settings modal, device menu
├── utils/        # Logger, browser support
└── webrtc/       # media, peer, controls, screen, stats
```

Server follows MVC-style separation:

```
server/
├── config/       # Constants and limits
├── routes/       # Express route definitions
├── controllers/  # HTTP request handlers
├── services/     # Business logic (rooms)
├── utils/        # Room code generator, logger
└── websocket/    # Signaling server
```

## Alternatives Considered

| Alternative | Why Not Selected |
|-------------|------------------|
| **Monolithic `app.js`** | Unmaintainable beyond Phase 4 |
| **Feature folders (vertical slices)** | Harder to enforce layer rules (UI must not touch peer) |
| **Webpack/Vite monorepo** | No build step requirement; static ES modules suffice |

## Consequences

**Positive**

- New engineers can navigate by concern
- Phase boundaries map to folders (e.g., `webrtc/stats/` = Phase 8)
- Server and client configs mirror each other (`ROOM_CODE_PATTERN`, limits)

**Negative**

- Two `deviceManager.js` files (`media/` vs `webrtc/media/`) — legacy split from Phase 4 vs Phase 9
- No automated boundary enforcement (convention only)

## Implementation References

- `client/js/room.js` — entry point wiring modules together
- `server/app.js` — Express + static client
