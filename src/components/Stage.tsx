import { useEffect, useState, type ReactNode } from 'react';
import styles from './Stage.module.css';

const getScale = () => Math.min(window.innerWidth / 1920, window.innerHeight / 1080);

export default function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(getScale);

  useEffect(() => {
    const onResize = () => setScale(getScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className={styles.viewport}>
      <div className={styles.stage} style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
