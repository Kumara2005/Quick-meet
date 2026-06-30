# Changelog

All notable changes to QuickMeet are documented here.

## [1.10.0] — Phase 10: Production Readiness

### Added
- **Configurable logging** — `server/utils/logger.js`, `client/js/utils/logger.js`
- **Centralized configuration** — `client/js/config/appConfig.js`, expanded `server/config/constants.js`
- **Browser compatibility checks** — `client/js/utils/browserSupport.js`
- **Documentation** — `README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `QA_CHECKLIST.md`
- **WebSocket security** — message size limits, payload validation, SDP length caps
- **Cleanup helpers** — `socket.disconnect()` clears listeners; `settingsModal.destroy()`, improved `deviceMenu.destroy()`

### Changed
- Removed duplicate `devicechange` and permission listeners from `media.js` (handled by Phase 9 device services)
- `performanceLogger` uses configurable client logger (quiet in production)
- Health thresholds, stats polling, ICE servers read from `appConfig`
- `callController` uses shared `SocketEvents` from config
- `home.js` — room code validation, removed dead `copyRoomCode` stub
- `room.js` — validates room code format, browser compat check on load
- Server WebSocket/HTTP logging via configurable logger
- `package.json` — version 1.10.0, Node engine ≥18

### Fixed
- Socket disconnect no longer leaves stale listener map entries
- Settings modal preview tracks stopped on destroy
- Device menu keyboard shortcut listener removed on teardown

### Security
- Validate WebSocket payloads are plain objects
- Reject oversized messages and SDP strings
- HTML-escape device labels in settings dropdown

---

## [1.9.0] — Phase 9: Media Device Management

- Camera/microphone enumeration and switching via `replaceTrack()`
- Settings modal with live preview
- Device hot-plug detection and preferred device persistence
- Permission watcher

## [1.8.5] — Phase 8.5: Application Event Bus

- Central `appEvents.js` and `eventBridge.js`
- `callController.js` and `roomView.js` separation

## [1.8.0] — Phase 8: Connection Monitoring

- `getStats()` polling, health badge, network score 0–100

## [1.7.0] — Phase 7: Screen Sharing

- `getDisplayMedia()` + `replaceTrack()` for screen share

## [1.6.0] — Phase 6: Call Controls

- Mute, camera toggle, end call

## [1.5.0] — Phase 5: WebRTC Peer Connection

- Offer/answer, ICE, remote video

## [1.4.0] — Phase 4: Local Media

- Camera/microphone preview

## [1.3.0] — Phase 3: WebSocket Signaling

- Real-time room events and WebRTC signaling

## [1.2.0] — Phase 2: Backend Room Management

- REST API, in-memory rooms, room codes

## [1.1.0] — Phase 1: Frontend UI

- Landing page, waiting room, toolbar UI
