# ADR 0003: Event Bus + Application Controller

**Status:** Accepted  
**Date:** Phase 8.5  
**Version:** 1.10.0

## Context

By Phase 7, WebRTC, controls, screen share, and stats modules each had local concerns. UI code (`room.js`) was accumulating cross-cutting logic. The team needed decoupling between domain modules and presentation without a framework.

## Decision

Adopt a three-tier event architecture:

1. **Domain event buses** — per-module (`peerEvents`, `mediaEvents`, `controlEvents`, `screenEvents`, `statsEvents`, `deviceEvents`)
2. **Event bridge** — `eventBridge.js` maps domain events → `AppEvents`
3. **Application controller** — `callController.js` owns signaling and peer lifecycle; `roomView.js` reacts to `AppEvents` only

UI modules **subscribe** to `AppEvents`. They **never** import WebRTC or socket modules directly.

## Alternatives Considered

| Alternative | Why Not Selected |
|-------------|------------------|
| **React + Context/Redux** | Adds build tooling and framework weight for a two-page SPA |
| **Direct callbacks everywhere** | Becomes unmaintainable as features grew (screen share, stats, devices) |
| **Single global event bus only** | Domain modules would publish app-level names, leaking UI concerns into WebRTC layer |

## Consequences

**Positive**

- Clear dependency rule: UI ← AppEvents ← Bridge ← Domain
- `callController` is the single owner of `RTCPeerConnection`
- New features (e.g., connection monitoring) plug in via bridge without touching UI
- `eventBridge.stopBridge()` enables clean teardown on call end

**Negative**

- Event name proliferation (~30 `AppEvents`)
- Debugging requires tracing event chains across buses
- Some duplication between domain and app event names

## Implementation References

- `client/js/core/eventBus.js` — generic pub/sub factory
- `client/js/core/appEvents.js` — application event constants
- `client/js/core/eventBridge.js` — domain → app mapping
- `client/js/core/callController.js` — orchestration
- `client/js/core/roomView.js` — UI reactions
