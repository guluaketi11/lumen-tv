import type { CSSProperties } from 'react';
import type { Movie } from '../types';
import styles from './Card.module.css';

type Props = {
  movie: Movie;
  focused: boolean;
  onClick: () => void;
};

export default function Card({ movie, focused, onClick }: Props) {
  const style = { '--c1': movie.colors[0], '--c2': movie.colors[1] } as CSSProperties;

  return (
    <button className={`${styles.card} ${focused ? styles.focused : ''}`} style={style} onClick={onClick} tabIndex={-1}>
      <span className={styles.glow} />
      <span className={styles.genre}>{movie.genre}</span>
      <span className={styles.title}>{movie.title}</span>
      <span className={styles.year}>{movie.year}</span>
    </button>
  );
}
