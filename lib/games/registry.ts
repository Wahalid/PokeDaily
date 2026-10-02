/**
 * Catalogue of PokeDaily games shown on the hub.
 * Adding a game: add an entry here and create its route under app/.
 */

export type GameId = "grid" | "bingo" | "connections" | "guess" | "evolution" | "silhouette" | "cry";

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
  { id: "bingo", name: "Bingo", tagline: "Match Pokémon to a card of categories.", href: "/bingo", status: "coming-soon", accent: "red", icon: "◎" },
  { id: "connections", name: "Connections", tagline: "Find the four hidden groups of Pokémon.", href: "/connections", status: "coming-soon", accent: "yellow", icon: "⋈" },
  { id: "guess", name: "Guess", tagline: "Find the secret Pokémon of the day in 8 tries.", href: "/guess", status: "playable", accent: "blue", icon: "?" },
  { id: "evolution", name: "Evolution", tagline: "Rebuild evolution lines in the right order.", href: "/evolution", status: "coming-soon", accent: "red", icon: "↗" },
  { id: "silhouette", name: "Silhouette", tagline: "Name the Pokémon from its shadow.", href: "/silhouette", status: "coming-soon", accent: "yellow", icon: "◐" },
  { id: "cry", name: "Cry", tagline: "Identify the Pokémon by its cry.", href: "/cry", status: "coming-soon", accent: "blue", icon: "♪" },
];

export function getGame(id: GameId): GameInfo {
  return GAMES.find((g) => g.id === id)!;
}
