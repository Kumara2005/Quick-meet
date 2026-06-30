# QuickMeet — Manual QA Checklist (Phase 10)

Use this checklist before production deployment. Test in **Chrome** and at least one alternate browser (Firefox or Safari).

**Environment:** `npm run dev` → http://localhost:3000  
**Two-browser test:** Tab A (caller) + Tab B (callee), or two different browsers.

---

## 1. Room Management

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 1.1 | Create room | Home → Create Room | Redirects to room page with code in URL | ☐ |
| 1.2 | Join room | Copy code → second tab → Join | Both enter same room | ☐ |
| 1.3 | Invalid code | Join with `INVALID` | Error message, stays on home | ☐ |
| 1.4 | Room full | Third tab tries same code | Rejected (room full / error) | ☐ |
| 1.5 | Copy room code | Click copy button in room | Toast "Room code copied" | ☐ |

---

## 2. Signaling & Connection

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 2.1 | Waiting state | First person in room | Status "Waiting for another participant" | ☐ |
| 2.2 | Auto connect | Second person joins | Negotiation → remote video appears | ☐ |
| 2.3 | ICE connected | During call | Health badge shows (not Disconnected) | ☐ |
| 2.4 | Reconnect page | Refresh one tab mid-wait | Re-joins room gracefully | ☐ |

---

## 3. Camera & Microphone

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 3.1 | Local preview | Allow permissions | Local video visible (mirrored) | ☐ |
| 3.2 | Remote video | After connect | Remote participant video full screen | ☐ |
| 3.3 | Mute (M) | Press M or click mute | Mic muted, button state updates | ☐ |
| 3.4 | Unmute | Press M again | Mic active | ☐ |
| 3.5 | Camera off (V) | Press V or click camera | Local preview dims / camera off | ☐ |
| 3.6 | Camera on | Press V again | Camera restored | ☐ |
| 3.7 | Permission denied | Block camera in browser | Clear error, no crash | ☐ |

---

## 4. Screen Sharing

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 4.1 | Start share (S) | Click screen share during call | Remote sees shared screen | ☐ |
| 4.2 | Stop share | Click again or browser "Stop sharing" | Camera restored to remote | ☐ |
| 4.3 | Camera disabled during share | Verify camera button state | Expected disabled behavior | ☐ |

---

## 5. Device Switching

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 5.1 | Open settings | Gear icon or Ctrl+, | Modal with camera/mic dropdowns | ☐ |
| 5.2 | Preview | Change camera dropdown | Preview updates | ☐ |
| 5.3 | Switch camera | Apply different camera | Local + remote update, no reconnect | ☐ |
| 5.4 | Switch mic | Apply different microphone | Remote hears new mic | ☐ |
| 5.5 | Preferred device | Set device → leave → rejoin | Preferred device restored | ☐ |
| 5.6 | Hot unplug | Disconnect USB camera during call | Fallback device, notification | ☐ |

---

## 6. Network Monitoring

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 6.1 | Health badge | During active call | Badge visible top-right | ☐ |
| 6.2 | Metrics update | Wait 5+ seconds | RTT / loss values update | ☐ |
| 6.3 | Expand details | Click badge | Network details panel | ☐ |
| 6.4 | Local only | Verify | Other participant does NOT see your badge | ☐ |

---

## 7. Disconnect & Cleanup

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 7.1 | Peer leave | Close callee tab | Caller sees "Participant left" | ☐ |
| 7.2 | End call | End call button → confirm | Returns to home, resources released | ☐ |
| 7.3 | Browser close | Close tab during call | No hung processes (check Task Manager) | ☐ |
| 7.4 | Connection loss | Disable network briefly | Graceful degraded / disconnected state | ☐ |

---

## 8. UI / Responsive

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 8.1 | Desktop | 1920×1080 | Layout correct | ☐ |
| 8.2 | Tablet | ~768px width | Stacked layout | ☐ |
| 8.3 | Mobile | ~375px width | Toolbar usable, video visible | ☐ |
| 8.4 | Landscape mobile | Rotate device | Usable layout | ☐ |

---

## 9. Accessibility

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 9.1 | Keyboard toolbar | Tab to buttons, M/V/S shortcuts | Controls operable | ☐ |
| 9.2 | Settings modal | Tab through, Escape closes | Focus trap works | ☐ |
| 9.3 | ARIA | Screen reader (optional) | Labels on video, buttons | ☐ |

---

## 10. Security & Stability

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 10.1 | XSS in room code | URL `?room=<script>` | Rejected / sanitized | ☐ |
| 10.2 | Malformed WS | (dev) invalid JSON | Server does not crash | ☐ |
| 10.3 | Long session | 10+ minute call | No memory climb (DevTools heap) | ☐ |
| 10.4 | Production logs | `NODE_ENV=production` | Minimal server console output | ☐ |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| QA | | | |
| Engineering | | | |

**Browsers tested:** Chrome ___ / Firefox ___ / Safari ___ / Edge ___

**Notes:**

```




```
