# ADR 0001: Use Raw WebRTC (No Third-Party SDKs)

**Status:** Accepted  
**Date:** Phase 5  
**Version:** 1.10.0

## Context

QuickMeet is a learning-oriented, production-quality 1-on-1 video calling application. The team needed full control over the WebRTC lifecycle: `getUserMedia`, `RTCPeerConnection`, SDP negotiation, ICE gathering, and `replaceTrack()` for screen sharing and device switching.

## Decision

Use the browser's native WebRTC APIs directly. Configure ICE with Google STUN (`stun:stun.l.google.com:19302`) via `AppConfig.ICE_SERVERS`. No Twilio, Agora, LiveKit, Daily, or similar SDKs.

## Alternatives Considered

| Alternative | Why Not Selected |
|-------------|------------------|
| **Twilio / Vonage** | Adds cost, vendor lock-in, and hides the signaling/peer lifecycle the project is designed to teach |
| **Agora / Daily / LiveKit** | Optimized for multi-party SFU/MCU topologies; overkill for strict 1-on-1 mesh |
| **Simple-peer / PeerJS** | Abstracts away negotiation details; conflicts with educational and architectural transparency goals |

## Consequences

**Positive**

- Complete visibility into offer/answer, ICE, and track management
- Zero SDK licensing cost
- `replaceTrack()` used consistently for screen share and device switching without renegotiation

**Negative**

- No built-in TURN relay (STUN only today)
- Manual handling of edge cases SDKs normally abstract (ICE trickling, reconnect)
- Caller/callee role logic implemented in `callController.js`

## Implementation References

- `client/js/webrtc/peer/peerConnection.js` — `RTCPeerConnection` factory
- `client/js/webrtc/peer/negotiation.js` — SDP offer/answer
- `client/js/webrtc/peer/iceManager.js` — ICE candidate queue and flush
- `client/js/config/appConfig.js` — `ICE_SERVERS`
