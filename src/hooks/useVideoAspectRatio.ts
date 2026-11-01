import { useCallback, useState, type SyntheticEvent } from 'react';

/** Use the decoded stream size, not the requested camera resolution or CSS box. */
export function useVideoAspectRatio() {
  const [aspectRatio, setAspectRatio] = useState('4 / 3');
  const syncVideoSize = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = event.currentTarget;
    if (videoWidth > 0 && videoHeight > 0) setAspectRatio(`${videoWidth} / ${videoHeight}`);
  }, []);
  return { aspectRatio, syncVideoSize };
}
