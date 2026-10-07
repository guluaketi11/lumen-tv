import { useState, type CSSProperties } from 'react';
import { useKeys } from '../useKeys';
import type { Movie } from '../types';
import styles from './Details.module.css';

type Props = {
  movie: Movie;
  onPlay: () => void;
  onBack: () => void;
};

export default function Details({ movie, onPlay, onBack }: Props) {
  const [focus, setFocus] = useState(0);
  const actions = [onPlay, onBack];

  useKeys((key) => {
    if (key === 'left') setFocus(0);
    if (key === 'right') setFocus(1);
    if (key === 'enter') actions[focus]();
    if (key === 'playpause') onPlay();
    if (key === 'back') onBack();
  });

  const style = { '--c1': movie.colors[0], '--c2': movie.colors[1] } as CSSProperties;

  return (
    <div className={styles.details} style={style}>
      <div className={styles.art}>
        <span className={styles.artTitle}>{movie.title}</span>
      </div>
      <div className={styles.shade} />

      <div className={styles.content}>
        <button className={styles.backLink} onClick={onBack} tabIndex={-1}>
          ← Back
        </button>
        <div className={styles.genre}>{movie.genre}</div>
        <h1 className={styles.title}>{movie.title}</h1>
        <div className={styles.meta}>
          <span>{movie.year}</span>
          <span>{movie.duration}</span>
          <span className={styles.badge}>HD</span>
        </div>
        <p className={styles.description}>{movie.description}</p>

        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.primary} ${focus === 0 ? styles.focused : ''}`}
            onClick={onPlay}
            tabIndex={-1}
          >
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
            </svg>
            Play
          </button>
          <button
            className={`${styles.button} ${focus === 1 ? styles.focused : ''}`}
            onClick={onBack}
            tabIndex={-1}
          >
            Back to browse
          </button>
        </div>
      </div>
    </div>
  );
}
