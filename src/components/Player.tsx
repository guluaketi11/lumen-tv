import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useKeys } from '../useKeys';
import type { Movie } from '../types';
import styles from './Player.module.css';

const MAX_RETRIES = 3;
const SEEK_STEP = 10;
const HIDE_AFTER = 3500;

type Status = 'loading' | 'playing' | 'paused' | 'buffering' | 'reconnecting';

type PlayerError = {
  title: string;
  message: string;
  code: string;
};

const errors = {
  network: {
    title: "We can't reach this stream",
    message: 'Check your internet connection and try again. The player already tried to reconnect a few times.',
  },
  media: {
    title: "This video can't be played",
    message: "The stream format isn't supported on this device, or the video data is damaged.",
  },
  unsupported: {
    title: 'Playback not supported',
    message: "This device or browser can't play HLS streams.",
  },
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}

type Props = {
  movie: Movie;
  onExit: () => void;
};

export default function Player({ movie, onExit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const retries = useRef(0);
  const lastTime = useRef(0);
  const userPaused = useRef(false);

  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<PlayerError | null>(null);
  const [errorFocus, setErrorFocus] = useState(0);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [live, setLive] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [activity, setActivity] = useState(0);
  const [seekFlash, setSeekFlash] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let retryTimer: number | undefined;
    let mediaRecovered = false;

    const fail = (kind: keyof typeof errors, code: string) => {
      setError({ ...errors[kind], code });
      setErrorFocus(0);
      setControlsVisible(false);
    };

    const reconnect = (code: string) => {
      if (retries.current >= MAX_RETRIES) {
        fail('network', code);
        return;
      }
      retries.current += 1;
      setStatus('reconnecting');
      retryTimer = window.setTimeout(() => setAttempt((value) => value + 1), 1000 * 2 ** (retries.current - 1));
    };

    const onNativeError = () => {
      const code = video.error?.code;
      if (code === MediaError.MEDIA_ERR_NETWORK) reconnect('MEDIA_ERR_NETWORK');
      else fail('media', `MEDIA_ERR_${code ?? 'UNKNOWN'}`);
    };

    const onNativeMetadata = () => {
      setLive(!Number.isFinite(video.duration));
      if (lastTime.current > 0) video.currentTime = lastTime.current;
    };

    if (Hls.isSupported()) {
      hls = new Hls({ startPosition: lastTime.current > 0 ? lastTime.current : -1 });
      hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => setLive(data.details.live));
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          reconnect(data.details);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecovered) {
          mediaRecovered = true;
          hls?.recoverMediaError();
        } else {
          fail('media', data.details);
        }
      });
      hls.loadSource(movie.stream);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.addEventListener('error', onNativeError);
      video.addEventListener('loadedmetadata', onNativeMetadata);
      video.src = movie.stream;
    } else {
      fail('unsupported', 'HLS_NOT_SUPPORTED');
    }

    return () => {
      window.clearTimeout(retryTimer);
      video.removeEventListener('error', onNativeError);
      video.removeEventListener('loadedmetadata', onNativeMetadata);
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [movie.stream, attempt]);

  useEffect(() => {
    if (status !== 'playing' || !controlsVisible) return;
    const timer = window.setTimeout(() => setControlsVisible(false), HIDE_AFTER);
    return () => window.clearTimeout(timer);
  }, [status, controlsVisible, activity]);

  useEffect(() => {
    if (!seekFlash) return;
    const timer = window.setTimeout(() => setSeekFlash(null), 700);
    return () => window.clearTimeout(timer);
  }, [seekFlash]);

  const showControls = () => {
    setControlsVisible(true);
    setActivity((value) => value + 1);
  };

  const tryPlay = useCallback(() => {
    videoRef.current?.play().catch(() => setStatus('paused'));
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      tryPlay();
    } else {
      userPaused.current = true;
      video.pause();
    }
  };

  const seek = (delta: number) => {
    const video = videoRef.current;
    if (!video || live || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration - 0.5);
    setTime(video.currentTime);
    setSeekFlash(delta > 0 ? `+${delta}s` : `${delta}s`);
  };

  const retry = () => {
    retries.current = 0;
    setError(null);
    setStatus('loading');
    setControlsVisible(true);
    setAttempt((value) => value + 1);
  };

  useKeys((key) => {
    if (error) {
      if (key === 'left') setErrorFocus(0);
      if (key === 'right') setErrorFocus(1);
      if (key === 'enter') (errorFocus === 0 ? retry : onExit)();
      if (key === 'back') onExit();
      return;
    }
    if (key === 'back') {
      onExit();
      return;
    }
    showControls();
    if (key === 'enter' || key === 'playpause') togglePlay();
    if (key === 'left') seek(-SEEK_STEP);
    if (key === 'right') seek(SEEK_STEP);
  });

  const progress = duration > 0 ? (time / duration) * 100 : 0;
  const spinning = !error && (status === 'loading' || status === 'buffering' || status === 'reconnecting');
  const paused = status === 'paused';

  return (
    <div className={`${styles.player} ${controlsVisible || paused ? '' : styles.idle}`} onMouseMove={showControls}>
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        onCanPlay={() => {
          if (videoRef.current?.paused && !userPaused.current) tryPlay();
        }}
        onPlaying={() => {
          retries.current = 0;
          setStatus('playing');
        }}
        onPause={() => setStatus('paused')}
        onWaiting={() => setStatus('buffering')}
        onEnded={() => {
          setStatus('paused');
          showControls();
        }}
        onTimeUpdate={(event) => {
          lastTime.current = event.currentTarget.currentTime;
          setTime(event.currentTarget.currentTime);
        }}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onClick={togglePlay}
      />

      {spinning && (
        <div className={styles.center}>
          <div className={styles.spinner} />
          {status === 'reconnecting' && (
            <div className={styles.reconnecting}>
              Reconnecting… attempt {retries.current} of {MAX_RETRIES}
            </div>
          )}
        </div>
      )}

      {seekFlash && <div className={styles.seekFlash}>{seekFlash}</div>}

      {!error && (
        <>
          <div className={`${styles.top} ${styles.chrome}`}>
            <button className={styles.exit} onClick={onExit} tabIndex={-1}>
              ←
            </button>
            <div>
              <div className={styles.nowPlaying}>Now playing</div>
              <div className={styles.title}>{movie.title}</div>
            </div>
          </div>

          <div className={`${styles.bottom} ${styles.chrome}`}>
            <div className={styles.controlsRow}>
              <button className={styles.playButton} onClick={togglePlay} tabIndex={-1} aria-label={paused ? 'Play' : 'Pause'}>
                <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
                  {paused ? (
                    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
                  ) : (
                    <path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor" />
                  )}
                </svg>
              </button>

              {live ? (
                <div className={styles.liveRow}>
                  <span className={styles.liveBadge}>LIVE</span>
                  <div className={styles.progress}>
                    <div className={styles.liveFill} />
                  </div>
                </div>
              ) : (
                <>
                  <span className={styles.time}>{formatTime(time)}</span>
                  <div className={styles.progress}>
                    <div className={styles.fill} style={{ width: `${progress}%` }} />
                    <div className={styles.thumb} style={{ left: `${progress}%` }} />
                  </div>
                  <span className={styles.time}>{formatTime(duration)}</span>
                </>
              )}
            </div>
            <div className={styles.hints}>
              <span><kbd>OK</kbd> Play / Pause</span>
              {!live && <span><kbd>←</kbd><kbd>→</kbd> Seek {SEEK_STEP}s</span>}
              <span><kbd>Back</kbd> Exit</span>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className={styles.errorScreen} role="alert">
          <div className={styles.errorIcon}>!</div>
          <h2 className={styles.errorTitle}>{error.title}</h2>
          <p className={styles.errorMessage}>{error.message}</p>
          <div className={styles.errorActions}>
            <button className={`${styles.errorButton} ${errorFocus === 0 ? styles.errorFocused : ''}`} onClick={retry} tabIndex={-1}>
              Try again
            </button>
            <button className={`${styles.errorButton} ${errorFocus === 1 ? styles.errorFocused : ''}`} onClick={onExit} tabIndex={-1}>
              Back
            </button>
          </div>
          <code className={styles.errorCode}>Error code: {error.code}</code>
        </div>
      )}
    </div>
  );
}
