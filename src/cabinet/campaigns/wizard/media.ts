import type { MediaField, MediaMeta, MediaProblem } from './types';

// Requirements from the design: MP4 or MOV, exactly 7 seconds, horizontal 16:9 from 1280×720, up to 50 MB; cover JPG or PNG.
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime';
export const IMAGE_ACCEPT = 'image/jpeg,image/png';
export const MAX_FILE_MB = 50;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const VIDEO = { types: ['video/mp4', 'video/quicktime'], extensions: ['mp4', 'mov'] };
const IMAGE = { types: ['image/jpeg', 'image/png'], extensions: ['jpg', 'jpeg', 'png'] };
export const DURATION_SEC = 7;
// Encoders round the length to whole frames (7.007 s and the like).
const DURATION_SLACK_SEC = 0.3;
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;
const RATIO = 16 / 9;
const RATIO_SLACK = 0.02;
const PROBE_TIMEOUT_MS = 15_000;

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

/** Type and size, before the file is read. Dropped files ignore `accept`, and some systems leave the type empty. */
export function fileProblem(file: File, field: MediaField): MediaProblem | null {
  const rules = field === 'video' ? VIDEO : IMAGE;
  if (!rules.types.includes(file.type) && !rules.extensions.includes(extensionOf(file.name))) return 'type';
  return file.size > MAX_FILE_BYTES ? 'size' : null;
}

export function videoProblem(meta: MediaMeta): MediaProblem | null {
  const { durationSec, width, height } = meta;
  if (durationSec === null || !width || !height) return 'unreadable';
  if (Math.abs(durationSec - DURATION_SEC) > DURATION_SLACK_SEC) return 'duration';
  if (height >= width) return 'orientation';
  if (Math.abs(width / height - RATIO) / RATIO > RATIO_SLACK) return 'ratio';
  if (width < MIN_WIDTH || height < MIN_HEIGHT) return 'resolution';
  return null;
}

/** Length and frame size of a video; null when the browser can't decode it (some MOV and HEVC files). */
export function probeVideo(src: string, sizeBytes: number): Promise<MediaMeta | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const finish = (meta: MediaMeta | null) => {
      window.clearTimeout(timer);
      video.removeAttribute('src');
      resolve(meta);
    };
    const timer = window.setTimeout(() => finish(null), PROBE_TIMEOUT_MS);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () =>
      finish({
        sizeBytes,
        durationSec: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      });
    video.onerror = () => finish(null);
    video.src = src;
  });
}

/** The first frame as a JPEG for «Взять первый кадр ролика». A remote video must allow CORS, otherwise the canvas is locked. */
export function captureFirstFrame(src: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const finish = (blob: Blob | null) => {
      window.clearTimeout(timer);
      video.removeAttribute('src');
      resolve(blob);
    };
    const timer = window.setTimeout(() => finish(null), PROBE_TIMEOUT_MS);
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';
    video.onloadeddata = () => {
      // The very first frame is often black; a tenth of a second in shows the picture.
      video.currentTime = Math.min(0.1, video.duration || 0);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) return finish(null);
      try {
        context.drawImage(video, 0, 0);
        canvas.toBlob(finish, 'image/jpeg', 0.9);
      } catch {
        finish(null);
      }
    };
    video.onerror = () => finish(null);
    video.src = src;
  });
}

/** «0:07» for the badge on the cover. */
export function formatClock(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
