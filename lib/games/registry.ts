/**
 * Catalogue of PokeDaily games shown on the hub.
 * Adding a game: add an entry here and create its route under app/.
 */

export type GameId = "grid" | "bingo" | "connections" | "guess" | "top10" | "wordle" | "impostor" | "evolution" | "silhouette" | "cry";

export type GameStatus = "playable" | "coming-soon";

export interface GameInfo {
  id: GameId;
  name: string;
  tagline: string;
  href: string;
  status: GameStatus;
  /** Accent used for the card's icon tile. */
  accent: "blue" | "red" | "yellow";
  icon: string;
}

export const GAMES: GameInfo[] = [
  { id: "grid", name: "Grid", tagline: "Fill a 3×3 board where every row and column has a rule.", href: "/grid", status: "playable", accent: "blue", icon: "▦" },
  { id: "bingo", name: "PokéBingo", tagline: "Place each Pokémon on a matching square and fill the card.", href: "/bingo", status: "playable", accent: "red", icon: "◎" },
  { id: "connections", name: "Cuartetos", tagline: "Find the four hidden groups of 4 Pokémon.", href: "/cuartetos", status: "playable", accent: "yellow", icon: "⋈" },
  { id: "guess", name: "Guess", tagline: "Find the secret Pokémon of the day in 8 tries.", href: "/guess", status: "playable", accent: "blue", icon: "?" },
  { id: "top10", name: "Top 10", tagline: "Name the 10 Pokémon at the top of the day's ranking.", href: "/top10", status: "playable", accent: "yellow", icon: "10" },
  { id: "wordle", name: "PokéWordle", tagline: "Guess the Pokémon of the day from its letters in 6 tries.", href: "/wordle", status: "playable", accent: "blue", icon: "W" },
  { id: "impostor", name: "PokéImpostor", tagline: "Pick every Pokémon that fits the category — and dodge the impostors.", href: "/impostor", status: "playable", accent: "red", icon: "!" },
  { id: "cry", name: "PokéCry", tagline: "Hear 5 cries and pick the right Pokémon out of 4 each time.", href: "/cry", status: "playable", accent: "blue", icon: "♪" },
  { id: "evolution", name: "Evolution", tagline: "Rebuild evolution lines in the right order.", href: "/evolution", status: "coming-soon", accent: "red", icon: "↗" },
  { id: "silhouette", name: "Silhouette", tagline: "Name the Pokémon from its shadow.", href: "/silhouette", status: "coming-soon", accent: "yellow", icon: "◐" },
];

export function getGame(id: GameId): GameInfo {
  return GAMES.find((g) => g.id === id)!;
}
