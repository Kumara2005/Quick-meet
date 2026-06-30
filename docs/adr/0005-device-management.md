# ADR 0005: Device Management via `replaceTrack()`

**Status:** Accepted  
**Date:** Phase 9  
**Version:** 1.10.0

## Context

Users need to switch cameras and microphones mid-call, handle USB hot-plug, and persist preferred devices. Re-negotiating SDP on every device change would add latency and complexity.

## Decision

Switch input devices using `RTCRtpSender.replaceTrack()` without SDP renegotiation. Screen sharing also uses `replaceTrack()` to swap the outbound video track. Preferred devices persist in `localStorage` (`quickmeet.preferredDevices`).

**Components:**

- `media/deviceManager.js` — enumeration, `devicechange` listener
- `media/cameraManager.js` / `microphoneManager.js` — acquire tracks per device
- `media/mediaSwitcher.js` — orchestrates stream + peer updates
- `media/permissionWatcher.js` — `navigator.permissions.query` when available
- `core/appState.js` — active/preferred device snapshot

When screen sharing is active, camera switches update stored camera track state but do not replace the outbound screen track until sharing stops.

## Alternatives Considered

| Alternative | Why Not Selected |
|-------------|------------------|
| **Full renegotiation** | Slower, causes brief media interruption, unnecessary for input device changes |
| **New peer connection per switch** | Destroys ICE state; unacceptable UX |
| **Server-side device routing** | Not applicable — devices are browser-local |

## Consequences

**Positive**

- Near-instant camera/mic switching during active calls
- Hot-plug fallback to default device via `handleDeviceRemoved()`
- Settings modal with live preview (`settingsModal.js`)

**Negative**

- Requires `RTCRtpSender.replaceTrack` support (checked in `browserSupport.js`)
- Safari may behave differently for `getDisplayMedia` and device labels until permission granted
- Two parallel device manager modules (`webrtc/media/deviceManager.js` for initial enumeration vs `media/deviceManager.js` for Phase 9 services)

## Implementation References

- `client/js/media/mediaSwitcher.js`
- `client/js/webrtc/screen/trackReplacement.js`
- `client/js/ui/settingsModal.js`
