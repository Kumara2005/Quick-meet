/**
 * QuickMeet — Device Manager (compat re-export)
 * Delegates to Phase 9 device manager in client/js/media/.
 */

export {
  enumerateDevices,
  getCameras,
  getMicrophones,
  getDevices,
  getSelectedCameraId,
  getSelectedMicrophoneId,
  syncSelectedFromStream,
  onDeviceChange,
} from '../../media/deviceManager.js';
