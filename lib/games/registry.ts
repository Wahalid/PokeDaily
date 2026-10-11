/**
 * Catalogue of PokeDaily games shown on the hub (in hub order).
 * Adding a game: add an entry here and create its route under app/.
 */

export type GameId = "grid" | "bingo" | "connections" | "guess" | "top10" | "wordle" | "impostor" | "evolution" | "silhouette" | "cry";

export type GameStatus = "playable" | "coming-soon";

export interface GameInfo {
  id: GameId;
  /** Full display title, used as-is on the hub card ("Pokémon Grid", "PokéBingo"). */
  name: string;
  /** Button label on the hub card; defaults to "Play <name>". */
  cta?: string;
  tagline: string;
  href: string;
  status: GameStatus;
  /** Accent used for the card's icon tile. */
  accent: "blue" | "red" | "yellow";
  icon: string;
}

export const GAMES: GameInfo[] = [
  { id: "grid", name: "Pokémon Grid", tagline: "Fill a 3×3 board where every row and column has a rule.", href: "/grid", status: "playable", accent: "blue", icon: "▦" },
  { id: "guess", name: "Pokémon Guess", tagline: "Identify the daily Pokémon using clues from every guess.", href: "/guess", status: "playable", accent: "blue", icon: "?" },
  { id: "connections", name: "Pokémon Groups", tagline: "Group 16 Pokémon into 4 themed groups of 4.", href: "/cuartetos", status: "playable", accent: "yellow", icon: "⋈" },
  { id: "bingo", name: "PokéBingo", tagline: "Place Pokémon on matching squares to fill the card.", href: "/bingo", status: "playable", accent: "red", icon: "◎" },
  { id: "top10", name: "Pokémon Top 10", tagline: "Name the Pokémon in a daily top 10 ranking.", href: "/top10", status: "playable", accent: "yellow", icon: "10" },
  { id: "wordle", name: "PokéWordle", tagline: "Guess the Pokémon name using letter feedback.", href: "/wordle", status: "playable", accent: "blue", icon: "W" },
  { id: "impostor", name: "PokéImpostor", tagline: "Pick every Pokémon that fits the category and dodge the impostors.", href: "/impostor", status: "playable", accent: "red", icon: "!" },
  { id: "cry", name: "PokéCry", tagline: "Identify Pokémon by listening to their cries.", href: "/cry", status: "playable", accent: "blue", icon: "♪" },
  { id: "evolution", name: "Evolution", tagline: "Rebuild evolution lines in the right order.", href: "/evolution", status: "coming-soon", accent: "red", icon: "↗" },
  { id: "silhouette", name: "Silhouette", tagline: "Name the Pokémon from its shadow.", href: "/silhouette", status: "coming-soon", accent: "yellow", icon: "◐" },
];

export function getGame(id: GameId): GameInfo {
  return GAMES.find((g) => g.id === id)!;
}
