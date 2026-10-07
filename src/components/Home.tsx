import { useEffect, useState, type CSSProperties } from 'react';
import Card from './Card';
import { useKeys } from '../useKeys';
import type { Movie, Row } from '../types';
import styles from './Home.module.css';

const CARD_WIDTH = 384;
const GAP = 32;
const STEP = CARD_WIDTH + GAP;
const ROW_HEIGHT = 318;
const VISIBLE_WIDTH = 1920 - 96 * 2;

type Props = {
  rows: Row[];
  active: boolean;
  onSelect: (movie: Movie) => void;
};

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  return <div className={styles.clock}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>;
}

export default function Home({ rows, active, onSelect }: Props) {
  const [rowIndex, setRowIndex] = useState(0);
  const [cols, setCols] = useState(() => rows.map(() => 0));
  const movie = rows[rowIndex].movies[cols[rowIndex]];

  useKeys((key) => {
    if (key === 'up') setRowIndex((index) => Math.max(0, index - 1));
    if (key === 'down') setRowIndex((index) => Math.min(rows.length - 1, index + 1));
    if (key === 'left' || key === 'right') {
      const delta = key === 'left' ? -1 : 1;
      setCols((current) =>
        current.map((col, index) =>
          index === rowIndex ? Math.min(rows[index].movies.length - 1, Math.max(0, col + delta)) : col,
        ),
      );
    }
    if (key === 'enter') onSelect(movie);
  }, active);

  const trackOffset = (index: number) => {
    const max = Math.max(0, rows[index].movies.length * STEP - GAP - VISIBLE_WIDTH);
    return Math.min(Math.max(0, (cols[index] - 1) * STEP), max);
  };

  const focusCard = (index: number, col: number) => {
    setRowIndex(index);
    setCols((current) => current.map((value, i) => (i === index ? col : value)));
  };

  const backdropStyle = { '--c1': movie.colors[0], '--c2': movie.colors[1] } as CSSProperties;

  return (
    <div className={styles.home} aria-hidden={!active}>
      <div className={styles.backdrop} style={backdropStyle} />
      <div className={styles.vignette} />

      <header className={styles.topbar}>
        <div className={styles.logo}>
          <span className={styles.logoMark} />
          Lumen<span>tv</span>
        </div>
        <div className={styles.topRight}>
          <div className={styles.hints}>
            <span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Navigate</span>
            <span><kbd>OK</kbd> Details</span>
          </div>
          <Clock />
        </div>
      </header>

      <section className={styles.hero} key={movie.id}>
        <div className={styles.eyebrow}>{rows[rowIndex].title}</div>
        <h1 className={styles.heroTitle}>{movie.title}</h1>
        <div className={styles.meta}>
          <span>{movie.year}</span>
          <span>{movie.genre}</span>
          <span>{movie.duration}</span>
        </div>
        <p className={styles.description}>{movie.description}</p>
      </section>

      <div className={styles.rowsViewport}>
        <div className={styles.rows} style={{ transform: `translateY(${-rowIndex * ROW_HEIGHT}px)` }}>
          {rows.map((row, index) => (
            <section
              key={row.title}
              className={`${styles.row} ${index < rowIndex ? styles.passed : ''} ${index === rowIndex ? styles.current : ''}`}
            >
              <h2 className={styles.rowTitle}>{row.title}</h2>
              <div className={styles.track} style={{ transform: `translateX(${-trackOffset(index)}px)` }}>
                {row.movies.map((item, col) => (
                  <Card
                    key={item.id}
                    movie={item}
                    focused={active && index === rowIndex && col === cols[index]}
                    onClick={() => (index === rowIndex && col === cols[index] ? onSelect(item) : focusCard(index, col))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
