/**
 * QuickMeet — SDP Negotiation
 * Handles offer/answer creation and session description exchange.
 */

/**
 * Create an SDP offer and set it as the local description.
 * @param {RTCPeerConnection} pc
 * @returns {Promise<RTCSessionDescriptionInit>}
 */
export async function createOffer(pc) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return pc.localDescription;
}

/**
 * Handle an incoming SDP offer: set remote description and create an answer.
 * @param {RTCPeerConnection} pc
 * @param {RTCSessionDescriptionInit} offer
 * @returns {Promise<RTCSessionDescriptionInit>}
 */
export async function handleOffer(pc, offer) {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return pc.localDescription;
}

/**
 * Handle an incoming SDP answer: set remote description.
 * @param {RTCPeerConnection} pc
 * @param {RTCSessionDescriptionInit} answer
 */
export async function handleAnswer(pc, answer) {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

/**
 * Serialize session description for WebSocket transport.
 * @param {RTCSessionDescriptionInit|null} description
 * @returns {{ type: string, sdp: string }|null}
 */
export function serializeDescription(description) {
  if (!description) return null;
  return { type: description.type, sdp: description.sdp };
}
