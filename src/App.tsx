import { lazy, Suspense, useMemo, useState } from 'react';
import data from './data/movies.json';
import Stage from './components/Stage';
import Home from './components/Home';
import Details from './components/Details';
import type { Movie, Row } from './types';

const Player = lazy(() => import('./components/Player'));

type Screen = { name: 'home' } | { name: 'details'; movie: Movie } | { name: 'player'; movie: Movie };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  const rows = useMemo<Row[]>(() => {
    const movies = data.movies as Movie[];
    const byId = new Map(movies.map((movie) => [movie.id, movie]));
    return data.rows.map((row) => ({
      title: row.title,
      movies: row.items.map((id) => byId.get(id)!),
    }));
  }, []);

  return (
    <Stage>
      <Home rows={rows} active={screen.name === 'home'} onSelect={(movie) => setScreen({ name: 'details', movie })} />
      {screen.name === 'details' && (
        <Details
          movie={screen.movie}
          onPlay={() => setScreen({ name: 'player', movie: screen.movie })}
          onBack={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'player' && (
        <Suspense fallback={null}>
          <Player movie={screen.movie} onExit={() => setScreen({ name: 'details', movie: screen.movie })} />
        </Suspense>
      )}
    </Stage>
  );
}
