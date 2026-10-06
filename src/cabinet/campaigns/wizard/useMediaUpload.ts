import { useEffect, useRef, type Dispatch } from 'react';
import { captureFirstFrame, fileProblem, probeVideo, videoProblem } from './media';
import type { WizardAction } from './reducer';
import type { MediaField, MediaMeta, WizardApi } from './types';

interface Upload {
  controller: AbortController;
  /** Object URL of the picked file; the first frame is taken from it. */
  localUrl: string | null;
}

/** Checks, uploads and replaces the video and the cover. Late events of a replaced upload are ignored by the reducer. */
export function useMediaUpload(api: WizardApi, dispatch: Dispatch<WizardAction>) {
  const uploads = useRef<Partial<Record<MediaField, Upload>>>({});
  const nextId = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const current = uploads.current;
    return () => {
      alive.current = false;
      for (const upload of Object.values(current)) {
        upload.controller.abort();
        if (upload.localUrl) URL.revokeObjectURL(upload.localUrl);
      }
    };
  }, []);

  const release = (field: MediaField) => {
    const upload = uploads.current[field];
    if (!upload) return;
    upload.controller.abort();
    if (upload.localUrl) URL.revokeObjectURL(upload.localUrl);
    delete uploads.current[field];
  };

  const send = async (field: MediaField, file: Blob, fileName: string, meta: MediaMeta, localUrl: string | null) => {
    const controller = new AbortController();
    const uploadId = ++nextId.current;
    uploads.current[field] = { controller, localUrl };
    dispatch({ type: 'mediaStarted', field, uploadId, fileName, meta });
    try {
      const media = await api.uploadMedia(file, fileName, (progress) => dispatch({ type: 'mediaProgress', field, uploadId, progress }), controller.signal);
      dispatch({ type: 'mediaReady', field, uploadId, url: media.url });
    } catch {
      if (!controller.signal.aborted) dispatch({ type: 'mediaFailed', field, uploadId, fileName, meta, problem: 'network' });
    }
  };

  const pick = async (field: MediaField, file: File) => {
    release(field);
    const problem = fileProblem(file, field);
    if (problem) {
      dispatch({ type: 'mediaFailed', field, fileName: file.name, meta: null, problem });
      return;
    }
    const localUrl = URL.createObjectURL(file);
    let meta: MediaMeta = { sizeBytes: file.size, durationSec: null, width: null, height: null };
    if (field === 'video') {
      const probed = await probeVideo(localUrl, file.size);
      const issue = probed ? videoProblem(probed) : 'unreadable';
      if (issue || !probed || !alive.current) {
        URL.revokeObjectURL(localUrl);
        if (alive.current) dispatch({ type: 'mediaFailed', field, fileName: file.name, meta: probed, problem: issue ?? 'unreadable' });
        return;
      }
      meta = probed;
    }
    await send(field, file, file.name, meta, localUrl);
  };

  const remove = (field: MediaField) => {
    release(field);
    dispatch({ type: 'mediaCleared', field });
  };

  /** «Взять первый кадр ролика»: from the picked file while it is here, otherwise from the uploaded video. */
  const takeFirstFrame = async (videoUrl: string, videoName: string) => {
    const blob = await captureFirstFrame(uploads.current.video?.localUrl ?? videoUrl);
    if (!alive.current) return;
    const fileName = `${videoName.replace(/\.[^.]+$/, '')}-cover.jpg`;
    release('cover');
    if (!blob) {
      dispatch({ type: 'mediaFailed', field: 'cover', fileName, meta: null, problem: 'frame' });
      return;
    }
    await send('cover', blob, fileName, { sizeBytes: blob.size, durationSec: null, width: null, height: null }, null);
  };

  return { pick, remove, takeFirstFrame };
}
