/**
 * QuickMeet — Video Track Replacement
 * Replaces the outbound video track via RTCRtpSender.replaceTrack().
 */

/**
 * Find the RTCRtpSender responsible for sending video.
 * @param {RTCPeerConnection} pc
 * @returns {RTCRtpSender|null}
 */
export function findVideoSender(pc) {
  if (!pc) return null;

  const senders = pc.getSenders();
  const withVideo = senders.find((sender) => sender.track?.kind === 'video');
  if (withVideo) return withVideo;

  return senders.find((sender) => {
    const params = sender.getParameters?.();
    return params?.codecs?.some((codec) => codec.mimeType?.toLowerCase().includes('video'));
  }) || senders.find((sender) => !sender.track) || null;
}

/**
 * Replace the outbound video track on the peer connection.
 * @param {RTCPeerConnection} pc
 * @param {MediaStreamTrack|null} newTrack
 * @returns {Promise<RTCRtpSender|null>}
 */
export async function replaceVideoTrack(pc, newTrack) {
  if (!pc) {
    throw new Error('Peer connection is not available.');
  }

  const sender = findVideoSender(pc);
  if (!sender) {
    throw new Error('Video sender not found on peer connection.');
  }

  await sender.replaceTrack(newTrack);
  return sender;
}
