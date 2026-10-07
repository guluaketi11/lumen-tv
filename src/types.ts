export type Movie = {
  id: string;
  title: string;
  year: number;
  genre: string;
  duration: string;
  description: string;
  stream: string;
  colors: [string, string];
};

export type Row = {
  title: string;
  movies: Movie[];
};
