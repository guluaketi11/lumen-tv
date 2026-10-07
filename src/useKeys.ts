import { useEffect, useRef } from 'react';

export type Key = 'up' | 'down' | 'left' | 'right' | 'enter' | 'back' | 'playpause';

const byKey: Record<string, Key> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'enter',
  Backspace: 'back',
  Escape: 'back',
  ' ': 'playpause',
  MediaPlayPause: 'playpause',
};

const byCode: Record<number, Key> = {
  10009: 'back',
  461: 'back',
  10252: 'playpause',
  415: 'playpause',
  19: 'playpause',
};

export function useKeys(handler: (key: Key) => void, active = true) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = byKey[event.key] ?? byCode[event.keyCode];
      if (!key) return;
      event.preventDefault();
      handlerRef.current(key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);
}
