/**
 * Smoke tests for the data + engine layers.  npm run verify
 */
import assert from "node:assert/strict";
import { createJsonChallengeStore, type StoredChallenge } from "../lib/daily/challenge-store";
import { challengeNumberForDate, currentChallengeNumber, dateForChallengeNumber, formatDisplayDate } from "../lib/daily/calendar";
import { getAllConditions } from "../lib/grid/conditions/registry";
import { dailyGridSeed, generateDailyGrid, recentDaysBefore, resolveDailyGrid } from "../lib/grid/daily";
import { evaluateGrid, hasDistinctSolution, satisfiesCell, validateAnswer } from "../lib/grid/engine";
import { buildShareText } from "../features/grid/share";
import { validateFrozenGrid, type FrozenGrid } from "../lib/grid/frozen";
import { GENERATOR_VERSION, generateGrid, generateGridSafe, gridConditionIds, SAFE_GRID } from "../lib/grid/generator";
import { assessGrid, isKnowledgeHeavyCondition, isViableCell, prepareQualityData } from "../lib/grid/quality";
import { gridKey } from "../lib/grid/types";
import { buildSearchIndex, searchPokemon } from "../lib/pokemon/search";
import { POKEMON_COLORS } from "../lib/pokemon/types";
import { compareGuess, evolutionPhase } from "../lib/guess/compare";
import { GUESS_VERSION, guessOrder, isGuessable, pickDailyGuess, resolveDailyGuess, type FrozenGuess } from "../lib/guess/daily";
import { decryptAnswer, encryptAnswer, generateGuessKey, GUESS_KEY_ENV, parseGuessKey, secretOrderSeed } from "../lib/guess/secret";
import { playGuessTurn } from "../lib/guess/play";
import { MAX_GUESSES } from "../lib/guess/types";
import { getQuartetCategory, QUARTET_CATEGORIES } from "../lib/quartets/categories";
import { dayLevel, generateDailyQuartets, resolveDailyQuartets, type FrozenQuartets } from "../lib/quartets/daily";
import {
  analyzeBoard,
  DEFAULT_RECENCY as DEFAULT_QUARTET_RECENCY,
  groupKey,
  prepareQuartetsData,
  SAFE_BOARD,
} from "../lib/quartets/generator";
import { checkSelection, revealAfterLoss } from "../lib/quartets/play";
import { decryptBoard, deriveQuartetsKey, encryptBoard } from "../lib/quartets/secret";
import { MAX_MISTAKES as MAX_QUARTET_MISTAKES, type QuartetBoard } from "../lib/quartets/types";
import { buildQuartetsShareText } from "../features/quartets/share";
import { generateDailyBingo, resolveDailyBingo, type FrozenBingo } from "../lib/bingo/daily";
import { analyzeBingo, DEFAULT_BINGO_RECENCY, PERFECT_WINDOW, SAFE_BINGO } from "../lib/bingo/generator";
import { fitsCell, playBingo } from "../lib/bingo/play";
import { deriveBingoKey, openBingo, sealBingo } from "../lib/bingo/secret";
import { CELL_COUNT, DECK_SIZE, MAX_LIVES, MAX_SKIPS, type BingoChallenge, type BingoMove } from "../lib/bingo/types";
import { bingoStorageKey, computeBingoStats, restoreBingo } from "../features/bingo/progress";
import { buildBingoShareText } from "../features/bingo/share";
import { generateDailyTop10, resolveDailyTop10, type FrozenTop10 } from "../lib/top10/daily";
import { TOP10_FILTERS } from "../lib/top10/filters";
import {
  analyzeTop10,
  computeRanking,
  DEFAULT_TOP10_RECENCY,
  isNotable,
  MIN_CANDIDATES,
  MIN_DISTINCT_CLUES,
  MIN_NOTABLE,
  safeTop10,
  TOP10_VERSION,
} from "../lib/top10/generator";
import { getMetric, rankPokemon } from "../lib/top10/metrics";
import { criterionView, initialTop10State, playTop10 } from "../lib/top10/play";
import { deriveTop10Key, openTop10, sealTop10 } from "../lib/top10/secret";
import { TOP_SIZE, type Top10Challenge } from "../lib/top10/types";
import { computeTop10Stats, restoreTop10, top10StorageKey } from "../features/top10/progress";
import { buildTop10ShareText } from "../features/top10/share";
import { keyboardStates, scoreGuess } from "../lib/wordle/compare";
import { generateDailyWordle, resolveDailyWordle, type FrozenWordle } from "../lib/wordle/daily";
import { isExtremeLength, LENGTH_WEIGHTS, WORDLE_VERSION } from "../lib/wordle/generator";
import { initialWordleState, playWordle } from "../lib/wordle/play";
import { deriveWordleKey, openWordle, sealWordle } from "../lib/wordle/secret";
import { MAX_ATTEMPTS } from "../lib/wordle/types";
import { buildWordleDictionary, normalizeName } from "../lib/wordle/words";
import { computeWordleStats, restoreWordle, wordleStorageKey } from "../features/wordle/progress";
import { buildWordleShareText } from "../features/wordle/share";
import { getImpostorCategory, IMPOSTOR_CATEGORIES } from "../lib/impostor/categories";
import { generateDailyImpostor, resolveDailyImpostor, type FrozenImpostor } from "../lib/impostor/daily";
import {
  analyzeImpostor,
  DEFAULT_IMPOSTOR_RECENCY,
  impostorLevel,
  IMPOSTOR_VERSION,
  LEVELS,
  prepareImpostorData,
  RECENCY_WINDOW,
  recencyProblems,
} from "../lib/impostor/generator";
import { boardView, initialImpostorState, playImpostor } from "../lib/impostor/play";
import { deriveImpostorKey, openImpostor, sealImpostor } from "../lib/impostor/secret";
import { BOARD_SIZE, type ImpostorChallenge, type Verdict } from "../lib/impostor/types";
import { computeImpostorStats, impostorStorageKey, restoreImpostor } from "../features/impostor/progress";
import { buildImpostorShareText, cardOutcomes } from "../features/impostor/share";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { generateDailyCry, resolveDailyCry, type FrozenCry } from "../lib/cry/daily";
import { analyzeCry, ANSWER_REPEAT_DAYS, CRY_VERSION, CURVES, prepareCryData, similarity } from "../lib/cry/generator";
import { initialCryState, playCry } from "../lib/cry/play";
import { cryAudioName, deriveCryKey, openCry, openCryAudio, sealCry, sealCryAudio } from "../lib/cry/secret";
import { CRY_OPTIONS, CRY_ROUNDS, VOID_CHOICE, type CryChallenge } from "../lib/cry/types";
import { computeCryStats, cryStorageKey, restoreCry } from "../features/cry/progress";
import { buildCryShareText, roundSquares } from "../features/cry/share";
import { loadChallengeFile, loadGuessKey, loadPokedex } from "./lib/load-data";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✔ ${name}`);
}

const pokedex = loadPokedex();
const byName = (name: string) => pokedex.all.find((p) => p.name === name)!;

console.log("Pokémon data");
check("dataset has 1000+ Pokémon with required fields", () => {
  assert.ok(pokedex.size >= 1000);
  for (const p of pokedex.all) {
    assert.ok(p.name && p.dexNumber && p.generation >= 1 && p.types.length >= 1, `bad entry ${p.id}`);
  }
});
check("flags and evolution data are populated", () => {
  const charizard = byName("Charizard");
  assert.deepEqual(charizard.types, ["fire", "flying"]);
  assert.equal(charizard.flags.isStarter, true);
  assert.equal(charizard.evolution.stage, 3);
  assert.ok(charizard.forms.some((f) => f.kind === "mega"));
  assert.equal(byName("Mewtwo").flags.isLegendary, true);
  assert.equal(byName("Mew").flags.isMythical, true);
  assert.equal(byName("Nihilego").flags.isUltraBeast, true);
  assert.equal(byName("Iron Valiant").flags.isParadox, true);
  assert.equal(byName("Aerodactyl").flags.isFossil, true);
});

console.log("Search");
const index = buildSearchIndex(pokedex.summaries());
check('"char" → Charmander, Charmeleon, Charizard first', () => {
  const names = searchPokemon(index, "char").map((p) => p.name);
  assert.deepEqual(names.slice(0, 3), ["Charmander", "Charmeleon", "Charizard"]);
});
check("search by dex number (25, #025)", () => {
  assert.equal(searchPokemon(index, "25")[0].name, "Pikachu");
  assert.equal(searchPokemon(index, "#025")[0].name, "Pikachu");
});
check("punctuation/accent-insensitive (mr mime, farfetchd, flabebe)", () => {
  assert.equal(searchPokemon(index, "mr mime")[0].name, "Mr. Mime");
  assert.equal(searchPokemon(index, "farfetchd")[0].name, "Farfetch’d");
  assert.equal(searchPokemon(index, "flabebe")[0].name, "Flabébé");
  assert.deepEqual(searchPokemon(index, "mime").map((p) => p.name).slice(0, 2), ["Mime Jr.", "Mr. Mime"]);
});

console.log("Grid engine");
const definition = { rows: ["gen:1", "gen:2", "gen:3"], columns: ["type:fire", "type:water", "type:electric"] };
check("evaluates all 9 intersections", () => {
  const evaluation = evaluateGrid(definition, pokedex.all);
  assert.equal(evaluation.cells.length, 9);
  const gen1Fire = evaluation.cells[0].answers.map((id) => pokedex.getById(id)!.name);
  assert.ok(gen1Fire.includes("Charizard") && !gen1Fire.includes("Typhlosion"));
  assert.ok(hasDistinctSolution(evaluation.cells.map((c) => c.answers)));
});
check("validates answers (correct / incorrect / already used)", () => {
  assert.equal(satisfiesCell(definition, 0, byName("Charizard")), true);
  const ok = validateAnswer({ definition, cellIndex: 0, pokemon: byName("Charizard"), usedPokemonIds: [] });
  assert.equal(ok.ok, true);
  const wrong = validateAnswer({ definition, cellIndex: 0, pokemon: byName("Squirtle"), usedPokemonIds: [] });
  assert.equal(!wrong.ok && wrong.reason, "incorrect");
  const used = validateAnswer({ definition, cellIndex: 0, pokemon: byName("Charizard"), usedPokemonIds: [6] });
  assert.equal(!used.ok && used.reason, "already-used");
});
check("distinct-solution check rejects unsatisfiable grids", () => {
  assert.equal(hasDistinctSolution([[1], [1]]), false);
  assert.equal(hasDistinctSolution([[1, 2], [1]]), true);
});
check("every catalogue condition matches at least one Pokémon", () => {
  for (const c of getAllConditions()) assert.ok(pokedex.all.some(c.test), `${c.id} matches nothing`);
});

console.log("Generator & daily");
const qualityData = prepareQualityData(getAllConditions(), pokedex.all);
check("same seed ⇒ same grid; different seed ⇒ different grid", () => {
  const a = generateGrid({ seed: "test", pokemon: pokedex.all, qualityData });
  const b = generateGrid({ seed: "test", pokemon: pokedex.all, qualityData });
  const c = generateGrid({ seed: "other", pokemon: pokedex.all, qualityData });
  assert.deepEqual(a.definition, b.definition);
  assert.notDeepEqual(a.definition, c.definition);
});
check("quality rules reject impossible / trivial / unfair grids", () => {
  const impossible = { rows: ["gen:1", "gen:2", "gen:3"], columns: ["flag:paradox", "type:water", "type:fire"] };
  assert.equal(assessGrid(impossible, qualityData).rejection, "cell-with-too-few-answers");
  const broadGrid = { rows: ["typing:dual", "evo:final-stage", "gen:1"], columns: ["type:fire", "type:water", "type:grass"] };
  assert.equal(assessGrid(broadGrid, qualityData, undefined, "fair").rejection, "too-many-broad-conditions");
  // per-cell fairness: degenerate pairs and expert-only pairs
  assert.equal(isViableCell("type:flying", "typing:dual", qualityData), false, "Flying × Dual Type is ~97% contained");
  assert.equal(isViableCell("type:fighting", "type:electric", qualityData), false, "Fighting × Electric is Gen 9 only");
  assert.equal(isViableCell("gen:1", "type:fire", qualityData), true);
  assert.ok(isKnowledgeHeavyCondition("stat:speed>=100") && isKnowledgeHeavyCondition("size:tall"));
  assert.ok(!isKnowledgeHeavyCondition("type:fire"));
  // the original weak Grid #001 is now rejected
  const oldGrid001 = { rows: ["type:fighting", "flag:legendary", "type:flying"], columns: ["type:poison", "typing:dual", "type:electric"] };
  assert.notEqual(assessGrid(oldGrid001, qualityData).rejection, null);
});
check("365 sequential daily grids pass every rule with no fallbacks or 3-day repeats", () => {
  const history = new Map<number, string[]>();
  const lookup = (n: number) => {
    const ids = history.get(n);
    return ids ? { rows: ids.slice(0, 3), columns: ids.slice(3) } : null;
  };
  const keys = new Set<string>();
  let repeatsWithin3 = 0, maxAttempts = 0;
  for (let n = 1; n <= 365; n++) {
    const recentDays = recentDaysBefore(n, lookup);
    const result = generateDailyGrid(n, { pokemon: pokedex.all, recentDays, qualityData });
    assert.equal(result.fallbackStep, 0, `grid #${n} needed a fallback`);
    assert.equal(assessGrid(result.definition, qualityData).rejection, null, `grid #${n}`);
    const ids = gridConditionIds(result.definition);
    const last3 = new Set(recentDays.slice(0, 3).flat());
    repeatsWithin3 += ids.filter((id) => last3.has(id)).length;
    maxAttempts = Math.max(maxAttempts, result.attempts);
    history.set(n, ids);
    keys.add(gridKey(result.definition));
  }
  console.log(`    (max candidates for one grid: ${maxAttempts}, ${keys.size}/365 distinct)`);
  assert.equal(repeatsWithin3, 0, "conditions from the previous 3 days must not repeat");
  assert.equal(keys.size, 365);
});
check("fallback ladder never throws and always returns a solvable grid", () => {
  assert.equal(assessGrid(SAFE_GRID, qualityData, undefined, "solvable").rejection, null, "SAFE_GRID must be solvable");
  // A pool that can never satisfy the rules forces the ladder all the way down.
  const hopeless = getAllConditions().filter((c) => ["flag:ultra-beast", "flag:paradox", "flag:fossil", "flag:mythical", "gen:1", "gen:2"].includes(c.id));
  const result = generateGridSafe({ seed: "hopeless", pokemon: pokedex.all, conditions: hopeless, maxAttempts: 50 });
  assert.equal(result.fallbackStep, 4);
  assert.deepEqual(result.definition, SAFE_GRID);
});
check("resolveDailyGrid: frozen wins, broken frozen data falls back, never throws", () => {
  const frozen = { rows: ["gen:1", "gen:2", "gen:3"], columns: ["type:fire", "type:water", "type:electric"] };
  const store = createJsonChallengeStore({ grid: { "1": { number: 1, date: "2026-10-01", payload: frozen } } });
  const served = resolveDailyGrid(1, { pokemon: pokedex.all, store });
  assert.equal(served.source, "frozen");
  assert.deepEqual(served.definition, frozen);
  const broken = createJsonChallengeStore({ grid: { "1": { number: 1, date: "2026-10-01", payload: { rows: ["nope"], columns: [] } } } });
  const recovered = resolveDailyGrid(1, { pokemon: pokedex.all, store: broken });
  assert.notEqual(recovered.source, "frozen");
  assert.equal(assessGrid(recovered.definition, qualityData, undefined, "solvable").rejection, null);
  assert.equal(resolveDailyGrid(999, { pokemon: pokedex.all, store: createJsonChallengeStore({}) }).source, "generated");
});
check(`frozen grids in data/daily-challenges.json are complete and still valid (generator v${GENERATOR_VERSION})`, () => {
  const frozen = Object.values(loadChallengeFile().grid ?? {}) as StoredChallenge<FrozenGrid>[];
  assert.ok(frozen.length >= 60, `expected ≥60 frozen grids, found ${frozen.length}`);
  const numbers = frozen.map((f) => f.number).sort((a, b) => a - b);
  numbers.forEach((n, i) => assert.equal(n, i + 1, "frozen grids must be consecutive from #1"));
  for (const { number, date, payload } of frozen) {
    assert.equal(date, dateForChallengeNumber(number), `#${number} date`);
    assert.equal(payload.seed, dailyGridSeed(number, payload.generatorVersion), `#${number} seed`);
    assert.ok(payload.generatorVersion && payload.dataset?.hash && payload.answerCounts.length === 9, `#${number} metadata`);
    assert.deepEqual(validateFrozenGrid(payload, qualityData), [], `#${number}`);
  }
  // Reproducibility: same seed + same frozen history ⇒ exactly the frozen grid.
  const byNumber = new Map(frozen.map((f) => [f.number, f.payload]));
  const lookup = (n: number) => byNumber.get(n) ?? null;
  for (const { number, payload } of frozen) {
    if (payload.generatorVersion !== GENERATOR_VERSION) continue;
    const again = generateDailyGrid(number, { pokemon: pokedex.all, recentDays: recentDaysBefore(number, lookup), qualityData });
    assert.deepEqual(again.definition, { rows: payload.rows, columns: payload.columns }, `#${number} does not reproduce`);
  }
  // Variety: no condition within 3 days, never ≥4 shared conditions within 30 days.
  for (const { number } of frozen) {
    const ids = gridConditionIds(byNumber.get(number)!);
    recentDaysBefore(number, lookup).forEach((day, i) => {
      const shared = ids.filter((id) => day.includes(id)).length;
      if (i < 3) assert.equal(shared, 0, `#${number} repeats a condition from ${i + 1} day(s) earlier`);
      assert.ok(shared <= 3, `#${number} shares ${shared} conditions with #${number - i - 1}`);
    });
  }
  const runwayEnd = currentChallengeNumber() + 14;
  if (numbers[numbers.length - 1] < runwayEnd) {
    console.log(`    ⚠ fewer than 14 days of frozen grids left — run \`npm run grid:freeze -- --from ${numbers.length + 1}\``);
  }
});
check("calendar: Oct 1 2026 → #1, Oct 2 → #2", () => {
  assert.equal(challengeNumberForDate("2026-10-01"), 1);
  assert.equal(challengeNumberForDate("2026-10-02"), 2);
  assert.equal(dateForChallengeNumber(32), "2026-11-01");
  assert.equal(formatDisplayDate("2026-10-01"), "October 1, 2026");
});

console.log("Adivina el Pokémon");
check("every Pokémon has an official Pokédex colour; only regular species are guessable", () => {
  for (const p of pokedex.all) assert.ok((POKEMON_COLORS as readonly string[]).includes(p.color), `${p.name} colour`);
  assert.equal(byName("Charizard").color, "red");
  assert.equal(byName("Pikachu").color, "yellow");
  const pool = pokedex.all.filter(isGuessable);
  assert.equal(pool.length, 1025);
  assert.ok(pool.every((p) => p.id === p.dexNumber && p.id <= 1025));
  // Forms live inside their species — they are never separate candidates or search results.
  const formSlugs = new Set(pokedex.all.flatMap((p) => p.forms.map((f) => f.slug)));
  assert.ok(pool.every((p) => !formSlugs.has(p.slug)), "a form slipped into the pool");
  assert.ok(pokedex.summaries().every((s) => s.id === s.dexNumber), "search index must only list species");
  assert.ok(!pokedex.summaries().some((s) => /^(Mega|Gigantamax|Alolan|Galarian|Hisuian|Paldean) /.test(s.name)));
});
check("evolution phases (none / first / second / third)", () => {
  assert.equal(evolutionPhase(byName("Charmander")), "first");
  assert.equal(evolutionPhase(byName("Charmeleon")), "second");
  assert.equal(evolutionPhase(byName("Charizard")), "third");
  assert.equal(evolutionPhase(byName("Tauros")), "none");
  assert.equal(evolutionPhase(byName("Pichu")), "first");
  assert.equal(evolutionPhase(byName("Pikachu")), "second");
  const f = compareGuess(byName("Charmeleon"), byName("Wartortle"));
  assert.ok(f.phase.match && f.phase.value === "second");
  assert.equal(compareGuess(byName("Charmander"), byName("Charizard")).phase.match, false);
});
check("types compare order-independently (swapped and partial)", () => {
  const target = byName("Charizard"); // fire / flying
  const swapped = compareGuess(byName("Talonflame"), target); // fire / flying
  assert.ok(swapped.types.every((t) => t.match), "both types should match");
  const reversed = compareGuess({ ...byName("Talonflame"), types: ["flying", "fire"] }, target);
  assert.deepEqual(reversed.types, [{ type: "flying", match: true }, { type: "fire", match: true }]);
  const partial = compareGuess(byName("Hawlucha"), target); // fighting / flying
  assert.deepEqual(partial.types, [{ type: "fighting", match: false }, { type: "flying", match: true }]);
});
check("generation, colour and Pokédex ⬆️/⬇️ feedback", () => {
  const target = byName("Charizard"); // #6, gen 1, red
  const lower = compareGuess(byName("Bulbasaur"), target); // #1
  assert.equal(lower.dex.direction, "higher", "secret #6 is higher than #1 → ⬆️");
  const higher = compareGuess(byName("Mew"), target); // #151
  assert.equal(higher.dex.direction, "lower", "secret #6 is lower than #151 → ⬇️");
  assert.equal(compareGuess(target, target).dex.direction, "match");
  assert.ok(lower.generation.match && !compareGuess(byName("Chikorita"), target).generation.match);
  assert.ok(compareGuess(byName("Magmar"), target).color.match, "Magmar is red too");
  assert.equal(compareGuess(byName("Pikachu"), target).color.match, false);
  assert.ok(compareGuess(target, target).correct);
});
check("8-attempt limit, duplicates, and the secret is only revealed when the game ends", () => {
  const secretId = byName("Charizard").id;
  const wrong = ["Bulbasaur", "Squirtle", "Pikachu", "Mew", "Eevee", "Snorlax", "Gengar", "Lapras", "Ditto"].map((n) => byName(n).id);
  for (let k = 1; k <= 7; k++) {
    const r = playGuessTurn({ guessIds: wrong.slice(0, k), secretId, pokedex });
    assert.ok(r.ok && !r.finished && r.answer === undefined, `turn ${k} must not reveal the answer`);
  }
  const eighth = playGuessTurn({ guessIds: wrong.slice(0, 8), secretId, pokedex });
  assert.ok(eighth.ok && eighth.finished && eighth.answer?.id === secretId, "8th miss ends the game and reveals");
  assert.equal(playGuessTurn({ guessIds: wrong.slice(0, 9), secretId, pokedex }).ok, false, "no 9th attempt");
  assert.equal(playGuessTurn({ guessIds: [wrong[0], wrong[0]], secretId, pokedex }).ok, false, "no duplicates");
  const win = playGuessTurn({ guessIds: [wrong[0], wrong[1], secretId], secretId, pokedex });
  assert.ok(win.ok && win.finished && win.feedback.correct && win.answer?.id === secretId);
  assert.equal(playGuessTurn({ guessIds: [secretId, wrong[0]], secretId, pokedex }).ok, false, "no guesses after winning");
  assert.equal(MAX_GUESSES, 8);
});
check("secrets: frozen answers are encrypted, bound to their day, and useless without the key", () => {
  const key = parseGuessKey(generateGuessKey())!;
  const other = parseGuessKey(generateGuessKey())!;
  const enc = encryptAnswer(80, 2, key);
  assert.equal(decryptAnswer(enc, 2, key), 80);
  assert.equal(decryptAnswer(enc, 3, key), null, "ciphertext must not be movable to another day");
  assert.equal(decryptAnswer(enc, 2, other), null, "wrong key must not decrypt");
  assert.equal(decryptAnswer({ ...enc, data: enc.data.replace(/^./, (c) => (c === "A" ? "B" : "A")) }, 2, key), null, "tampering detected");
  assert.equal(encryptAnswer(1, 1, key).data.length, encryptAnswer(1025, 1, key).data.length, "length must not leak digits");
  // The public file must not contain any plain answer field.
  const raw = JSON.stringify(loadChallengeFile().guess ?? {});
  assert.ok(!/pokemonId|"id"\s*:/.test(raw), "plain answer found in data/daily-challenges.json");
  // Without a key the game is unavailable — it never falls back to a public/guessable answer.
  const noKey = resolveDailyGuess(2, { pokemon: pokedex.all, store: createJsonChallengeStore(loadChallengeFile()), key: null });
  assert.equal(noKey.source, "unavailable");
  assert.equal(noKey.pokemonId, null);
  const wrongKey = resolveDailyGuess(2, { pokemon: pokedex.all, store: createJsonChallengeStore(loadChallengeFile()), key: other });
  assert.equal(wrongKey.pokemonId, null, "a wrong key must not silently change a frozen answer");
  // The order for non-frozen days depends on the secret key.
  assert.notDeepEqual(guessOrder(pokedex.all, secretOrderSeed(key, GUESS_VERSION)), guessOrder(pokedex.all, secretOrderSeed(other, GUESS_VERSION)));
});
const guessKey = loadGuessKey();
if (!guessKey) {
  console.log(`  ⚠ ${GUESS_KEY_ENV} not set (.env.local) — skipping checks that need the real daily answers`);
} else {
  check("daily secret is deterministic, frozen and never repeats", () => {
    const frozen = Object.values(loadChallengeFile().guess ?? {}) as StoredChallenge<FrozenGuess>[];
    assert.ok(frozen.length >= 60, `expected ≥60 frozen secrets, found ${frozen.length}`);
    const store = createJsonChallengeStore(loadChallengeFile());
    const ids: number[] = [];
    for (const { number, date, payload } of frozen) {
      assert.equal(date, dateForChallengeNumber(number));
      const a = resolveDailyGuess(number, { pokemon: pokedex.all, store, key: guessKey });
      const b = resolveDailyGuess(number, { pokemon: pokedex.all, store, key: guessKey });
      assert.ok(a.source === "frozen" && a.pokemonId !== null && a.pokemonId === b.pokemonId, `#${number}`);
      assert.equal(a.progressKey, payload.salt);
      assert.ok(isGuessable(pokedex.getById(a.pokemonId)!), `#${number} must be a regular species`);
      ids.push(a.pokemonId);
    }
    assert.equal(new Set(ids).size, ids.length, "no repeated secret");
    const order = guessOrder(pokedex.all, secretOrderSeed(guessKey, GUESS_VERSION));
    assert.equal(new Set(order).size, 1025, "order must be a permutation of all species");
    const unfrozen = resolveDailyGuess(9999, { pokemon: pokedex.all, store: createJsonChallengeStore({}), key: guessKey });
    assert.equal(unfrozen.source, "generated");
    assert.equal(unfrozen.pokemonId, pickDailyGuess(9999, order));
  });
}

console.log("Cuartetos");
const qData = prepareQuartetsData(pokedex.all);
const qLookup = (id: number) => pokedex.getById(id);
check("category catalogue: unique ids, base species only, ambiguous categories flagged for review", () => {
  assert.equal(new Set(QUARTET_CATEGORIES.map((c) => c.id)).size, QUARTET_CATEGORIES.length);
  assert.ok(qData.pool.every((p) => p.id === p.dexNumber), "only base species");
  assert.ok(qData.usable.every((c) => !c.review && qData.members.get(c.id)!.size >= 6));
  assert.ok(QUARTET_CATEGORIES.filter((c) => c.family === "color").every((c) => c.review), "colour categories need review");
  assert.ok(getQuartetCategory("evo:third")?.review, "baby-line stage ambiguity must be flagged");
  assert.ok(qData.usable.length >= 60);
});
check("SAFE_BOARD fallback is a valid board", () => {
  assert.deepEqual(analyzeBoard(SAFE_BOARD, qData).problems, []);
});
const testKey = deriveQuartetsKey(parseGuessKey(generateGuessKey())!);
const qBoards = new Map<number, QuartetBoard>();
check("120 sequential daily boards are valid: 16 distinct Pokémon, 4 groups × 4, unique solution, no alternative group", () => {
  let fallbacks = 0;
  for (let n = 1; n <= 120; n++) {
    const r = generateDailyQuartets(n, { data: qData, key: testKey, lookup: (d) => qBoards.get(d) ?? null });
    const { board } = r;
    qBoards.set(n, board);
    if (r.fallbackStep > 0) fallbacks++;
    assert.equal(board.groups.length, 4, `#${n} groups`);
    assert.ok(board.groups.every((g) => g.pokemonIds.length === 4), `#${n} group size`);
    const ids = board.groups.flatMap((g) => g.pokemonIds);
    assert.equal(new Set(ids).size, 16, `#${n} duplicates`);
    assert.equal(board.layout.length, 16);
    const analysis = analyzeBoard(board, qData);
    assert.deepEqual(analysis.problems, [], `#${n}: ${analysis.problems.join("; ")}`);
    assert.ok(analysis.recognizable >= 10, `#${n} recognisable ${analysis.recognizable}`);
    assert.deepEqual(board.groups.map((g) => g.tier).sort(), [0, 1, 2, 3]);
    // the intended grouping is a valid solution: every group checks as correct
    for (const g of board.groups) {
      const r = checkSelection(board, g.pokemonIds, qLookup);
      assert.ok(r.ok && r.result === "correct", `#${n} intended group must check as correct`);
    }
  }
  assert.ok(fallbacks <= 3, `too many fallbacks: ${fallbacks}`);
});
check("daily boards are deterministic and differ between days; difficulty follows the weekday", () => {
  const again = generateDailyQuartets(1, { data: qData, key: testKey, lookup: () => null });
  const again2 = generateDailyQuartets(1, { data: qData, key: testKey, lookup: () => null });
  assert.deepEqual(again.board, again2.board);
  const keys = new Set([...qBoards.values()].map((b) => b.groups.map((g) => groupKey(g.pokemonIds)).sort().join("|")));
  assert.equal(keys.size, qBoards.size, "two days produced the same board");
  assert.equal(dayLevel("2026-10-05"), "easy"); // Monday
  assert.equal(dayLevel("2026-10-07"), "medium"); // Wednesday
  assert.equal(dayLevel("2026-10-10"), "hard"); // Saturday
  // no category repeated within the strict window, no group repeated
  const groupSeen = new Set<string>();
  for (const [n, board] of qBoards) {
    for (let d = 1; d <= DEFAULT_QUARTET_RECENCY.strictDays; d++) {
      const prev = qBoards.get(n - d);
      if (prev) for (const g of board.groups) assert.ok(!prev.groups.some((p) => p.categoryId === g.categoryId), `#${n} repeats ${g.categoryId}`);
    }
    for (const g of board.groups) {
      const k = groupKey(g.pokemonIds);
      assert.ok(!groupSeen.has(k), `#${n} repeats a group`);
      groupSeen.add(k);
    }
  }
});
check("play: correct, wrong, «¡A una!», invalid selection", () => {
  const board = qBoards.get(1)!;
  const [g0, g1] = board.groups;
  const correct = checkSelection(board, g0.pokemonIds, qLookup);
  assert.ok(correct.ok && correct.result === "correct" && correct.group.categoryId === g0.categoryId);
  assert.equal(correct.ok && correct.result === "correct" && correct.group.pokemon.length, 4);
  const oneAway = checkSelection(board, [...g0.pokemonIds.slice(0, 3), g1.pokemonIds[0]], qLookup);
  assert.ok(oneAway.ok && oneAway.result === "one-away", "3 of 4 → ¡A una!");
  const wrong = checkSelection(board, [g0.pokemonIds[0], g0.pokemonIds[1], g1.pokemonIds[0], g1.pokemonIds[1]], qLookup);
  assert.ok(wrong.ok && wrong.result === "wrong");
  assert.equal(checkSelection(board, g0.pokemonIds.slice(0, 3), qLookup).ok, false, "needs exactly 4");
  assert.equal(checkSelection(board, [g0.pokemonIds[0], g0.pokemonIds[0], g0.pokemonIds[1], g0.pokemonIds[2]], qLookup).ok, false);
  assert.equal(checkSelection(board, [1, 2, 3, 4].map((i) => 10000 + i), qLookup).ok, false, "only board Pokémon");
  // non-correct results never reveal the category
  assert.ok(!("group" in oneAway) && !("group" in wrong));
});
check("loss after 4 distinct wrong attempts reveals the groups; fewer or duplicates do not", () => {
  const board = qBoards.get(1)!;
  const [g0, g1, g2, g3] = board.groups.map((g) => g.pokemonIds);
  const wrongs = [
    [g0[0], g0[1], g1[0], g1[1]],
    [g0[0], g0[1], g2[0], g2[1]],
    [g0[0], g0[1], g3[0], g3[1]],
    [g1[0], g1[1], g2[0], g2[1]],
  ];
  assert.equal(revealAfterLoss(board, wrongs.slice(0, 3), qLookup).ok, false, "3 mistakes is not a loss");
  assert.equal(revealAfterLoss(board, [wrongs[0], wrongs[0], wrongs[1], wrongs[2]], qLookup).ok, false, "duplicates don't count");
  assert.equal(revealAfterLoss(board, [...wrongs.slice(0, 3), g0], qLookup).ok, false, "a correct group is not a mistake");
  const revealed = revealAfterLoss(board, wrongs, qLookup);
  assert.ok(revealed.ok && revealed.groups.length === 4);
  assert.equal(MAX_QUARTET_MISTAKES, 4);
});
check("share text reveals no Pokémon or categories", () => {
  const board = qBoards.get(1)!;
  const tierOf = (id: number) => board.groups.find((g) => g.pokemonIds.includes(id))?.tier;
  const text = buildQuartetsShareText({
    challengeNumber: 1,
    attempts: board.groups.map((g) => ({ ids: g.pokemonIds })),
    tierOf,
    won: true,
    mistakes: 0,
  });
  assert.ok(text.startsWith("PokeDaily Cuartetos #001") && text.includes("✅ Completado · 0 errores"));
  assert.ok(text.includes("🟨🟨🟨🟨") && text.includes("🟪🟪🟪🟪"));
  for (const id of board.layout) assert.ok(!text.includes(pokedex.getById(id)!.name));
  for (const g of board.groups) assert.ok(!text.includes(getQuartetCategory(g.categoryId)!.label));
});
check("solutions are encrypted, bound to their day, and unavailable without the key", () => {
  const board = qBoards.get(1)!;
  const enc = encryptBoard(board, 1, testKey);
  assert.deepEqual(decryptBoard(enc, 1, testKey), board);
  assert.equal(decryptBoard(enc, 2, testKey), null, "ciphertext bound to its day");
  assert.equal(decryptBoard(enc, 1, deriveQuartetsKey(parseGuessKey(generateGuessKey())!)), null, "wrong key");
  const raw = JSON.stringify(loadChallengeFile().connections ?? {});
  assert.ok(!/pokemonIds|categoryId|"type:|"gen:|"flag:|layout/.test(raw), "plain solution data in data/daily-challenges.json");
  const noKey = resolveDailyQuartets(1, { data: qData, store: createJsonChallengeStore(loadChallengeFile()), key: null });
  assert.ok(noKey.source === "unavailable" && noKey.board === null);
});
if (guessKey) {
  check("frozen Cuartetos boards decrypt, are valid and follow the weekday curve", () => {
    const key = deriveQuartetsKey(guessKey);
    const file = loadChallengeFile();
    const frozen = Object.values(file.connections ?? {}) as StoredChallenge<FrozenQuartets>[];
    assert.ok(frozen.length >= 60, `expected ≥60 frozen boards, found ${frozen.length}`);
    const store = createJsonChallengeStore(file);
    for (const { number, date, payload } of frozen) {
      const r = resolveDailyQuartets(number, { data: qData, store, key });
      assert.equal(r.source, "frozen", `#${number}`);
      assert.equal(date, dateForChallengeNumber(number));
      assert.equal(payload.level, dayLevel(date), `#${number} level`);
      assert.equal(r.progressKey, payload.salt);
      assert.deepEqual(analyzeBoard(r.board!, qData).problems, [], `#${number}`);
    }
  });
}

console.log("PokéBingo");
const bData = qData; // same prepared catalogue data as Cuartetos
const bKey = deriveBingoKey(parseGuessKey(generateGuessKey())!);
const bChallenges = new Map<number, BingoChallenge>();
/** Perfect play: matching on the first 19 cards → place matched cards, skip the rest. */
function perfectMoves(ch: BingoChallenge): BingoMove[] {
  const window = ch.deck.slice(0, PERFECT_WINDOW);
  const owner = new Map<number, number>(); // card index → cell
  const fits = (cardIdx: number, cell: number) => fitsCell(ch.cells[cell], qLookup(window[cardIdx]));
  const tryCell = (cell: number, seen: Set<number>): boolean => {
    for (let c = 0; c < window.length; c++) {
      if (!fits(c, cell) || seen.has(c)) continue;
      seen.add(c);
      const prev = owner.get(c);
      if (prev === undefined || tryCell(prev, seen)) {
        owner.set(c, cell);
        return true;
      }
    }
    return false;
  };
  for (let cell = 0; cell < CELL_COUNT; cell++) assert.ok(tryCell(cell, new Set()), "matching must exist");
  const moves: BingoMove[] = [];
  for (let c = 0; c < window.length && moves.filter((m) => m.type === "place").length < CELL_COUNT; c++) {
    const cell = owner.get(c);
    moves.push(cell === undefined ? { type: "skip" } : { type: "place", cell });
  }
  return moves;
}
check("SAFE_BINGO fallback is valid and winnable", () => {
  assert.deepEqual(analyzeBingo(SAFE_BINGO, bData).problems, []);
  const r = playBingo(SAFE_BINGO, perfectMoves(SAFE_BINGO), qLookup);
  assert.ok(r.ok && r.state.status === "won");
});
check("120 sequential daily PokéBingos: 16 valid cells, 24 distinct base-species cards, solvable, winnable perfect game", () => {
  let fallbacks = 0;
  for (let n = 1; n <= 120; n++) {
    const r = generateDailyBingo(n, { data: bData, key: bKey, lookup: (d) => bChallenges.get(d) ?? null });
    const ch = r.challenge;
    bChallenges.set(n, ch);
    if (r.fallbackStep > 0) fallbacks++;
    assert.equal(ch.cells.length, 16);
    assert.equal(new Set(ch.cells).size, 16);
    assert.equal(ch.deck.length, DECK_SIZE);
    assert.equal(new Set(ch.deck).size, DECK_SIZE, `#${n} reused a Pokémon`);
    assert.ok(ch.deck.every((id) => qLookup(id)!.id === qLookup(id)!.dexNumber), "base species only");
    const a = analyzeBingo(ch, bData);
    assert.deepEqual(a.problems, [], `#${n}: ${a.problems.join("; ")}`);
    assert.ok(a.recognizable >= 16, `#${n} recognisable ${a.recognizable}`);
    // Real solvability: a perfect game (≤3 skips, 0 mistakes) wins.
    const moves = perfectMoves(ch);
    assert.ok(moves.filter((m) => m.type === "skip").length <= MAX_SKIPS);
    const played = playBingo(ch, moves, qLookup);
    assert.ok(played.ok && played.state.status === "won" && played.state.lives === MAX_LIVES, `#${n} not winnable`);
  }
  assert.equal(fallbacks, 0, `fallbacks: ${fallbacks}`);
});
check("PokéBingo is deterministic, varies by day, and avoids short-term repeats", () => {
  const a = generateDailyBingo(5, { data: bData, key: bKey, lookup: (d) => bChallenges.get(d) ?? null }).challenge;
  assert.deepEqual(a, bChallenges.get(5));
  const keys = new Set([...bChallenges.values()].map((c) => [...c.cells].sort().join(",")));
  assert.equal(keys.size, bChallenges.size, "two days share the same board");
  for (const [n, ch] of bChallenges) {
    for (let d = 1; d <= DEFAULT_BINGO_RECENCY.strictDays; d++) {
      const prev = bChallenges.get(n - d);
      if (prev) assert.ok(!ch.cells.some((c) => prev.cells.includes(c)), `#${n} repeats a cell from ${d} day(s) before`);
    }
    for (let d = 1; d <= DEFAULT_BINGO_RECENCY.pokemonDays; d++) {
      const prev = bChallenges.get(n - d);
      if (prev) assert.ok(!ch.deck.some((id) => prev.deck.includes(id)), `#${n} deals a Pokémon from ${d} day(s) before`);
    }
  }
});
check("rules: correct/incorrect placement, lives, skips, occupied cells, game over", () => {
  const ch = bChallenges.get(1)!;
  const first = qLookup(ch.deck[0]);
  const good = ch.cells.findIndex((c) => fitsCell(c, first));
  const bad = ch.cells.findIndex((c) => !fitsCell(c, first));
  if (good >= 0) {
    const r = playBingo(ch, [{ type: "place", cell: good }], qLookup);
    assert.ok(r.ok && r.last?.kind === "correct" && r.state.placed[good]?.id === first!.id && r.state.lives === MAX_LIVES);
    assert.equal(r.ok && r.state.cardNumber, 2, "next card after a placement");
  }
  const wrong = playBingo(ch, [{ type: "place", cell: bad }], qLookup);
  assert.ok(wrong.ok && wrong.last?.kind === "wrong" && wrong.state.lives === MAX_LIVES - 1 && wrong.state.placed[bad] === null);
  assert.equal(wrong.ok && wrong.state.cardNumber, 2, "a wrong placement consumes the card");
  const skip = playBingo(ch, [{ type: "skip" }], qLookup);
  assert.ok(skip.ok && skip.state.skips === MAX_SKIPS - 1 && skip.state.lives === MAX_LIVES);
  const fourSkips: BingoMove[] = Array(MAX_SKIPS + 1).fill({ type: "skip" });
  assert.equal(playBingo(ch, fourSkips, qLookup).ok, false, "no 4th skip");
  // Three wrong placements on the same always-wrong strategy → lost.
  const wrongMoves: BingoMove[] = [];
  for (let i = 0; i < ch.deck.length && wrongMoves.length < MAX_LIVES; i++) {
    const card = qLookup(ch.deck[i]);
    const cell = ch.cells.findIndex((c) => !fitsCell(c, card));
    wrongMoves.push(cell >= 0 ? { type: "place", cell } : { type: "skip" });
  }
  const lost = playBingo(ch, wrongMoves, qLookup);
  if (lost.ok && wrongMoves.every((m) => m.type === "place")) {
    assert.ok(lost.state.status === "lost" && lost.state.endReason === "no-lives" && lost.state.current === null);
    assert.equal(playBingo(ch, [...wrongMoves, { type: "skip" }], qLookup).ok, false, "no moves after game over");
  }
  if (good >= 0) assert.equal(playBingo(ch, [{ type: "place", cell: good }, { type: "place", cell: good }], qLookup).ok, false, "occupied cell");
  assert.equal(playBingo(ch, [{ type: "place", cell: 99 }], qLookup).ok, false, "invalid cell");
  // Victory
  const won = playBingo(ch, perfectMoves(ch), qLookup);
  assert.ok(won.ok && won.state.status === "won" && won.state.endReason === "complete" && won.state.placed.every(Boolean));
  assert.ok(won.ok && new Set(won.state.placed.map((p) => p!.id)).size === 16, "no Pokémon reused on the board");
  // Deck exhaustion is a loss: a 4-card deck, 3 skips + 1 wrong placement runs out of cards.
  const tiny: BingoChallenge = { cells: ch.cells, deck: ch.deck.slice(0, 4) };
  const lastCard = qLookup(tiny.deck[3]);
  const miss = ch.cells.findIndex((c) => !fitsCell(c, lastCard));
  const exhausted = playBingo(tiny, [{ type: "skip" }, { type: "skip" }, { type: "skip" }, { type: "place", cell: miss }], qLookup);
  assert.ok(exhausted.ok && exhausted.state.status === "lost" && exhausted.state.endReason === "deck-exhausted");
  assert.equal(MAX_LIVES, 3);
  assert.equal(MAX_SKIPS, 3);
});
check("only the current card is ever sent to the client", () => {
  const ch = bChallenges.get(1)!;
  const r = playBingo(ch, [], qLookup);
  assert.ok(r.ok);
  const json = JSON.stringify(r);
  const future = ch.deck.slice(1).filter((id) => id !== ch.deck[0]);
  for (const id of future) assert.ok(!json.includes(`"name":"${qLookup(id)!.name}"`), "future card leaked");
  assert.ok(r.ok && r.state.current?.id === ch.deck[0]);
  assert.ok(!/"deck":|"cells":/.test(json), "raw challenge leaked");
});
check("local persistence: per-day keys, progress restored only for the same puzzle", () => {
  assert.notEqual(bingoStorageKey(1), bingoStorageKey(2));
  const ch = bChallenges.get(1)!;
  const init = playBingo(ch, [], qLookup);
  const after = playBingo(ch, [{ type: "skip" }], qLookup);
  assert.ok(init.ok && after.ok);
  const saved = { key: "abc", moves: [{ type: "skip" as const }], state: after.state };
  assert.deepEqual(restoreBingo(saved, "abc", init.state), { moves: saved.moves, state: after.state });
  assert.deepEqual(restoreBingo(saved, "other-day-key", init.state), { moves: [], state: init.state });
  assert.deepEqual(restoreBingo(undefined, "abc", init.state), { moves: [], state: init.state });
  const stats = computeBingoStats({ "1": { won: true, filled: 16 }, "2": { won: false, filled: 10 }, "3": { won: true, filled: 16 } }, 3);
  assert.deepEqual(stats, { played: 3, won: 2, lost: 1, currentStreak: 1, bestStreak: 1, avgFilled: 14 });
});
check("PokéBingo share text reveals no Pokémon or conditions", () => {
  const ch = bChallenges.get(1)!;
  const text = buildBingoShareText({ challengeNumber: 1, filled: Array(16).fill(true), lives: 2, won: true });
  assert.ok(text.startsWith("🎯 PokeBingo #001") && text.includes("16/16") && text.includes("❤️❤️❌"));
  for (const id of ch.deck) assert.ok(!text.includes(qLookup(id)!.name));
  for (const c of ch.cells) assert.ok(!text.includes(getQuartetCategory(c)!.label));
});
check("PokéBingo challenges are sealed, bound to their day, and unavailable without the key", () => {
  const ch = bChallenges.get(1)!;
  const box = sealBingo(ch, 1, bKey);
  assert.deepEqual(openBingo(box, 1, bKey), ch);
  assert.equal(openBingo(box, 2, bKey), null);
  assert.equal(openBingo(box, 1, deriveBingoKey(parseGuessKey(generateGuessKey())!)), null);
  assert.notDeepEqual(deriveBingoKey(Buffer.alloc(32, 1)), deriveQuartetsKey(Buffer.alloc(32, 1)), "per-game sub-keys");
  const raw = JSON.stringify(loadChallengeFile().bingo ?? {});
  assert.ok(!/cells|deck|"type:|"gen:|"flag:|ability:/.test(raw), "plain challenge data in data/daily-challenges.json");
  const noKey = resolveDailyBingo(1, { data: bData, store: createJsonChallengeStore(loadChallengeFile()), key: null });
  assert.ok(noKey.source === "unavailable" && noKey.challenge === null);
});
if (guessKey) {
  check("frozen PokéBingos decrypt and are valid and winnable", () => {
    const key = deriveBingoKey(guessKey);
    const file = loadChallengeFile();
    const frozen = Object.values(file.bingo ?? {}) as StoredChallenge<FrozenBingo>[];
    assert.ok(frozen.length >= 60, `expected ≥60 frozen PokéBingos, found ${frozen.length}`);
    const store = createJsonChallengeStore(file);
    for (const { number, date, payload } of frozen) {
      const r = resolveDailyBingo(number, { data: bData, store, key });
      assert.equal(r.source, "frozen", `#${number}`);
      assert.equal(date, dateForChallengeNumber(number));
      assert.equal(r.progressKey, payload.salt);
      const played = playBingo(r.challenge!, perfectMoves(r.challenge!), qLookup);
      assert.ok(played.ok && played.state.status === "won", `#${number} not winnable`);
    }
  });
}

console.log("Top 10");
const tKey = deriveTop10Key(parseGuessKey(generateGuessKey())!);
const tChallenges = new Map<number, Top10Challenge>();
check("tie rule: higher (or lower) value first, equal values → lower Pokédex number first", () => {
  const fake = (dex: number, weight: number) => ({ ...qLookup(dex)!, weight });
  const metric = getMetric("weight")!;
  const desc = rankPokemon([fake(9, 100), fake(4, 120), fake(7, 100), fake(1, 80)], metric, "desc").map((e) => e.pokemon.dexNumber);
  assert.deepEqual(desc, [4, 7, 9, 1]);
  const asc = rankPokemon([fake(9, 100), fake(4, 120), fake(7, 100), fake(1, 80)], metric, "asc").map((e) => e.pokemon.dexNumber);
  assert.deepEqual(asc, [1, 7, 9, 4]);
});
check("sets are never types; hard metrics are rare by design", () => {
  assert.ok(TOP10_FILTERS.every((f) => !f.id.startsWith("type:") && !f.id.startsWith("dual:")), "a type is used as a set");
  assert.ok(TOP10_FILTERS.some((f) => f.id === "gen:1") && TOP10_FILTERS.some((f) => f.id === "flag:legendary"));
  const weightOf = (id: string) => Object.values(getMetric(id)!.directions).reduce((s, v) => s + (v?.weight ?? 0), 0);
  assert.ok(weightOf("specialDefense") < weightOf("weight") / 5 && weightOf("specialAttack") < weightOf("speed") / 5);
});
check("SAFE_TOP10 fallback is valid (no problems, no quality issues)", () => {
  const a = analyzeTop10(safeTop10(qData), qData);
  assert.deepEqual([...a.problems, ...a.quality], []);
});
check("120 sequential daily Top 10s: valid set, correct ranking and order, no boundary tie, playable", () => {
  let fallbacks = 0, hardMetrics = 0;
  for (let n = 1; n <= 120; n++) {
    const r = generateDailyTop10(n, { data: qData, key: tKey, lookup: (d) => tChallenges.get(d) ?? null });
    const c = r.challenge;
    tChallenges.set(n, c);
    if (r.fallbackStep > 0) fallbacks++;
    if (getMetric(c.metric)!.directions[c.direction]!.difficulty >= 2) hardMetrics++;
    const a = analyzeTop10(c, qData);
    assert.deepEqual(a.problems, [], `#${n}: ${a.problems.join("; ")}`);
    assert.ok(a.candidates >= MIN_CANDIDATES && a.notable >= MIN_NOTABLE && a.distinctClues >= MIN_DISTINCT_CLUES, `#${n} quality`);
    assert.ok(isNotable(qLookup(c.ranking[0].id)!), `#${n}: #1 must be deducible`);
    assert.ok(!c.filterId.startsWith("type:"), `#${n} uses a type as set`);
    assert.equal(c.ranking.length, TOP_SIZE);
    assert.equal(new Set(c.ranking.map((e) => e.id)).size, TOP_SIZE);
    const full = computeRanking(qData, c.filterId, getMetric(c.metric)!, c.direction);
    full.slice(0, TOP_SIZE).forEach((e, i) => assert.equal(e.pokemon.id, c.ranking[i].id, `#${n} ranking`));
    for (let i = 1; i < TOP_SIZE; i++) {
      const [prev, cur] = [c.ranking[i - 1], c.ranking[i]];
      const ordered = c.direction === "desc" ? prev.value > cur.value : prev.value < cur.value;
      assert.ok(ordered || (prev.value === cur.value && qLookup(prev.id)!.dexNumber < qLookup(cur.id)!.dexNumber), `#${n} order`);
    }
    assert.notEqual(full[TOP_SIZE - 1].value, full[TOP_SIZE].value, `#${n} tie at the boundary`);
    assert.ok(c.ranking.every((e) => full.some((f) => f.pokemon.id === e.id)), "every answer belongs to the set");
    assert.ok(c.ranking.every((e) => qLookup(e.id)!.id === qLookup(e.id)!.dexNumber), "base species only");
  }
  assert.equal(fallbacks, 0, `fallbacks: ${fallbacks}`);
  assert.ok(hardMetrics <= 15, `too many Sp. Atk / Sp. Def days: ${hardMetrics}/120`);
});
check("Top 10 is deterministic, varies by day, and respects recency", () => {
  const again = generateDailyTop10(7, { data: qData, key: tKey, lookup: (d) => tChallenges.get(d) ?? null }).challenge;
  assert.deepEqual(again, tChallenges.get(7));
  for (const [n, c] of tChallenges) {
    for (let d = 1; d <= DEFAULT_TOP10_RECENCY.filterDays; d++) assert.notEqual(tChallenges.get(n - d)?.filterId, c.filterId, `#${n} set`);
    assert.notEqual(tChallenges.get(n - 1)?.metric, c.metric, `#${n} metric repeated from yesterday`);
    for (let d = 1; d <= DEFAULT_TOP10_RECENCY.comboDays; d++) {
      const p = tChallenges.get(n - d);
      assert.ok(!p || p.filterId !== c.filterId || p.metric !== c.metric || p.direction !== c.direction, `#${n} repeats a ranking`);
    }
  }
});
check("type clues: one per position, both types for dual types, and no names/values", () => {
  const c = tChallenges.get(1)!;
  const init = initialTop10State(c, qLookup);
  assert.equal(init.clues.length, TOP_SIZE);
  init.clues.forEach((types, i) => assert.deepEqual(types, qLookup(c.ranking[i].id)!.types, `clue #${i + 1}`));
  const dual = [...tChallenges.values()].flatMap((ch) => ch.ranking).find((e) => qLookup(e.id)!.types.length === 2)!;
  const dualCh = [...tChallenges.values()].find((ch) => ch.ranking.includes(dual))!;
  const pos = dualCh.ranking.indexOf(dual);
  assert.equal(initialTop10State(dualCh, qLookup).clues[pos].length, 2, "dual types show both");
  const json = JSON.stringify(init);
  for (const e of c.ranking) {
    assert.ok(!json.includes(qLookup(e.id)!.name), "a clue leaked a name");
    assert.ok(!json.includes(`"id":${e.id}`), "a clue leaked an id");
  }
  assert.ok(!/"value"|"ranking"/.test(json), "the initial state leaked values or the ranking");
});
check("play: in/out of the Top 10, positions, duplicates, lives, victory, defeat", () => {
  const c = tChallenges.get(1)!;
  const inside = c.ranking[3].id;
  const outsiders = qData.pool.filter((p) => !c.ranking.some((e) => e.id === p.id)).slice(0, 4).map((p) => p.id);
  const hit = playTop10(c, [inside], qLookup);
  assert.ok(hit.ok && hit.result === "correct" && hit.position === 4 && hit.state.lives === 3 && hit.state.found[0].position === 4);
  assert.ok(hit.ok && hit.state.ranking === undefined, "ranking hidden while playing");
  const miss = playTop10(c, [outsiders[0]], qLookup);
  assert.ok(miss.ok && miss.result === "wrong" && miss.position === undefined && miss.state.lives === 2 && miss.state.found.length === 0);
  assert.equal(playTop10(c, [inside, inside], qLookup).ok, false, "duplicates rejected (and cost nothing)");
  const lost = playTop10(c, outsiders.slice(0, 3), qLookup);
  assert.ok(lost.ok && lost.state.status === "lost" && lost.state.ranking?.length === TOP_SIZE, "3 misses → lost, ranking revealed");
  assert.equal(playTop10(c, outsiders, qLookup).ok, false, "no guesses after losing");
  const won = playTop10(c, [outsiders[0], ...c.ranking.map((e) => e.id)], qLookup);
  assert.ok(won.ok && won.state.status === "won" && won.state.lives === 2 && won.state.found.length === TOP_SIZE);
  assert.equal(playTop10(c, [...c.ranking.map((e) => e.id), outsiders[0]], qLookup).ok, false, "no guesses after winning");
  assert.equal(playTop10(c, [99999], qLookup).ok, false, "unknown Pokémon");
});
check("only the found entries reach the client while playing", () => {
  const c = tChallenges.get(1)!;
  const r = playTop10(c, [c.ranking[0].id], qLookup);
  const json = JSON.stringify(r);
  for (const e of c.ranking.slice(1)) assert.ok(!json.includes(`"name":"${qLookup(e.id)!.name}"`), "an unfound entry leaked");
  assert.ok(!/"ranking":\[|"filterId"|"metric"/.test(json), "raw challenge leaked");
  const view = JSON.stringify(criterionView(c));
  for (const e of c.ranking) assert.ok(!view.includes(qLookup(e.id)!.name), "criterion view leaked the ranking");
});
check("Top 10 persistence, day change and stats", () => {
  assert.notEqual(top10StorageKey(1), top10StorageKey(2));
  const init = initialTop10State(tChallenges.get(1)!, qLookup);
  const state = { ...init, lives: 2 };
  const saved = { key: "k1", guesses: [25], outcomes: ["wrong" as const], state };
  assert.deepEqual(restoreTop10(saved, "k1", init), { guesses: [25], outcomes: ["wrong"], state });
  assert.deepEqual(restoreTop10(saved, "k2", init), { guesses: [], outcomes: [], state: init });
  const legacy = { key: "k1", guesses: [25], outcomes: ["wrong" as const], state: { found: [], lives: 2, status: "playing" } };
  assert.deepEqual(restoreTop10(legacy as never, "k1", init).state, init, "progress from the old format is ignored");
  const stats = computeTop10Stats({ "1": { won: true, livesLeft: 3, found: 10 }, "2": { won: true, livesLeft: 1, found: 10 }, "4": { won: false, livesLeft: 0, found: 6 } }, 4);
  assert.deepEqual(stats, { played: 3, won: 2, lost: 1, currentStreak: 0, bestStreak: 2, avgLivesLeft: 2 });
});
check("Top 10 share text is spoiler-free", () => {
  const c = tChallenges.get(1)!;
  const v = criterionView(c);
  const text = buildTop10ShareText({ challengeNumber: 1, criterionShort: v.short, foundPositions: [1, 2, 4, 7, 8, 10, 3], lives: 2 });
  assert.ok(text.startsWith("🔟 PokeDaily Top 10 #001") && text.includes(v.short) && text.includes("🟩 🟩 🟩 🟩 ⬜") && text.includes("❤️❤️❌") && text.includes("7/10"));
  for (const e of c.ranking) {
    assert.ok(!text.includes(qLookup(e.id)!.name) && !text.includes(String(qLookup(e.id)!.dexNumber).padStart(4, "0")));
  }
  assert.ok(!/\d+(,\d)? (kg|m)\b/.test(text), "no values");
});
check("Top 10 challenges are sealed, bound to their day, and unavailable without the key", () => {
  const c = tChallenges.get(1)!;
  const box = sealTop10(c, 1, tKey);
  assert.deepEqual(openTop10(box, 1, tKey), c);
  assert.equal(openTop10(box, 2, tKey), null);
  assert.equal(openTop10(box, 1, deriveTop10Key(parseGuessKey(generateGuessKey())!)), null);
  assert.notDeepEqual(deriveTop10Key(Buffer.alloc(32, 1)), deriveBingoKey(Buffer.alloc(32, 1)), "per-game sub-keys");
  const raw = JSON.stringify(loadChallengeFile().top10 ?? {});
  assert.ok(!/ranking|filterId|metric|"gen:|flag:/.test(raw), "plain challenge data in data/daily-challenges.json");
  const noKey = resolveDailyTop10(1, { data: qData, store: createJsonChallengeStore(loadChallengeFile()), key: null });
  assert.ok(noKey.source === "unavailable" && noKey.challenge === null);
});
if (guessKey) {
  check("the 60 frozen Top 10s decrypt and are valid, playable and varied", () => {
    const key = deriveTop10Key(guessKey);
    const file = loadChallengeFile();
    const frozen = Object.values(file.top10 ?? {}) as StoredChallenge<FrozenTop10>[];
    assert.ok(frozen.length >= 60, `expected ≥60 frozen Top 10s, found ${frozen.length}`);
    const store = createJsonChallengeStore(file);
    const combos = new Set<string>();
    for (const { number, date, payload } of frozen) {
      const r = resolveDailyTop10(number, { data: qData, store, key });
      assert.equal(r.source, "frozen", `#${number}`);
      assert.equal(date, dateForChallengeNumber(number));
      assert.equal(r.progressKey, payload.salt);
      assert.equal(payload.generatorVersion, TOP10_VERSION);
      const a = analyzeTop10(r.challenge!, qData);
      assert.deepEqual([...a.problems, ...a.quality], [], `#${number}`);
      assert.ok(initialTop10State(r.challenge!, qLookup).clues.every((t) => t.length >= 1), `#${number} clue missing`);
      combos.add(`${r.challenge!.filterId}|${r.challenge!.metric}|${r.challenge!.direction}`);
    }
    assert.ok(combos.size >= 40, `only ${combos.size} distinct rankings in 60 days`);
  });
}

console.log("PokéWordle");
const wDict = buildWordleDictionary(pokedex.all);
check("name normalization", () => {
  const cases: Array<[string, string]> = [
    ["Flabébé", "flabebe"], ["flabébé", "flabebe"], ["Farfetch’d", "farfetchd"], ["Farfetch'd", "farfetchd"],
    ["Sirfetch’d", "sirfetchd"], ["Wo-Chien", "wochien"], ["Ho-Oh", "hooh"], ["Tapu Koko", "tapukoko"],
    ["TAPU KOKO", "tapukoko"], ["Mr. Mime", "mrmime"], ["Mime Jr.", "mimejr"], ["Type: Null", "typenull"],
    ["Nidoran♀", "nidoran"], ["Nidoran♂", "nidoran"], ["Porygon-Z", "porygonz"], ["Porygon2", "porygon2"],
  ];
  for (const [name, word] of cases) assert.equal(normalizeName(name), word, name);
  for (const p of pokedex.all) assert.match(normalizeName(p.name), /^[a-z0-9]+$/, `${p.name} keeps a symbol`);
});
check("dictionary: real names, Nidoran merged, Porygon2 and Type: Null never secret", () => {
  for (const name of ["Flabébé", "Farfetch’d", "Sirfetch’d", "Wo-Chien", "Ho-Oh", "Tapu Koko", "Mr. Mime", "Mime Jr."]) {
    assert.equal(wDict.byWord.get(normalizeName(name))?.name, name, name);
  }
  assert.deepEqual(wDict.byWord.get("nidoran"), { word: "nidoran", name: "Nidoran", ids: [29, 32] });
  assert.ok([...wDict.byWord.values()].every((e) => !/[♀♂]/.test(e.name)), "a gendered name survived");
  assert.equal(wDict.secrets.filter((e) => e.word === "nidoran").length, 1, "Nidoran is a single secret");
  assert.ok(!wDict.secrets.some((e) => e.word === "porygon2" || e.word === "typenull"), "excluded Pokémon in the pool");
  assert.ok(pokedex.all.some((p) => p.name === "Porygon2") && pokedex.all.some((p) => p.name === "Type: Null"), "kept in pokemon.json");
  assert.ok(wDict.byWord.has("typenull"), "Type: Null is still a valid guess");
  assert.equal(wDict.secrets.length, pokedex.all.filter((p) => p.id === p.dexNumber).length - 3);
  const lengths = new Set(wDict.secrets.map((e) => e.word.length));
  for (let n = 3; n <= 12; n++) assert.ok(lengths.has(n) && LENGTH_WEIGHTS[n] > 0, `length ${n} unsupported`);
});
check("Wordle scoring: greens, yellows, greys and repeated letters (two passes)", () => {
  const S = (g: string, s: string) => scoreGuess(g, s).map((x) => x[0]).join("");
  assert.equal(S("pikachu", "pikachu"), "ccccccc", "exact");
  assert.equal(S("abcde", "eabcd"), "ppppp", "all yellow");
  assert.equal(S("vwxyz", "abcde"), "aaaaa", "all grey");
  assert.equal(S("babes", "abbey"), "ppcca", "yellows use the unmatched occurrences");
  assert.equal(S("bbbbb", "abbey"), "accaa", "extra copies are grey once consumed by greens");
  assert.equal(S("lllllll", "balloon"), "aaccaaa");
  assert.equal(S("lolllll", "balloon"), "apccaaa", "BALLOON vs LOLLLLL: two green L, no L left for yellow, one yellow O");
  assert.equal(S("pikipek", "pikachu"), "cccaaaa", "consumed letters are not yellow again");
  assert.equal(S("aabbb", "bbaaa"), "ppppa", "only as many yellows as occurrences");
  assert.equal(S("eevee", "eevee"), "ccccc");
});
check("keyboard keeps the best state: green > yellow > grey", () => {
  const row = (word: string, secret: string) => ({ word, pattern: scoreGuess(word, secret) });
  assert.equal(keyboardStates([row("babes", "abbey"), row("abbey", "abbey")]).a, "correct", "yellow then green → green");
  assert.equal(keyboardStates([row("abbey", "abbey"), row("bbbbb", "abbey")]).b, "correct", "green then grey → stays green");
  const k = keyboardStates([row("babes", "abbey"), row("vwxyz", "abbey")]);
  assert.equal(k.y, "present");
  assert.equal(k.s, "absent");
  assert.equal(keyboardStates([row("vwxyz", "abbey"), row("abcde", "eabcd")]).a, "present");
  assert.equal(keyboardStates([row("lolllll", "balloon")]).l, "correct", "green and grey in the same row → green");
});
const seven = [...wDict.byWord.keys()].filter((w) => w.length === 7 && w !== "pikachu");
check("play: invalid Pokémon, wrong length and repeats cost no attempt", () => {
  const ch = { word: "pikachu" };
  assert.deepEqual(playWordle(ch, ["pikachx"], wDict), { ok: false, message: "Pokémon no válido" });
  assert.deepEqual(playWordle(ch, ["mew"], wDict), { ok: false, message: "Debe tener 7 letras" });
  assert.deepEqual(playWordle(ch, ["bulbasaur"], wDict), { ok: false, message: "Debe tener 7 letras" });
  assert.deepEqual(playWordle(ch, [seven[0], seven[0]], wDict), { ok: false, message: "Ya lo has probado." });
  assert.deepEqual(playWordle(ch, ["pikachx", seven[0]], wDict), { ok: false, message: "Petición no válida." }, "earlier invalid = tampering");
  assert.equal(playWordle(ch, [], wDict).ok, false);
  assert.equal(playWordle(ch, "pikachu", wDict).ok, false);
  assert.equal(playWordle(ch, [42], wDict).ok, false);
  const r = playWordle(ch, [seven[0]], wDict);
  assert.ok(r.ok && r.state.rows.length === 1 && r.state.status === "playing" && r.state.answer === undefined, "secret hidden while playing");
  const spaced = playWordle({ word: "tapukoko" }, ["Tapu Koko"], wDict);
  assert.ok(spaced.ok && spaced.state.status === "won", "input is normalized");
  const accent = playWordle({ word: "flabebe" }, ["Flabébé"], wDict);
  assert.ok(accent.ok && accent.state.status === "won");
});
check("play: victory and defeat after 6 attempts", () => {
  const ch = { word: "pikachu" };
  const won = playWordle(ch, [seven[0], seven[1], "PIKACHU"], wDict);
  assert.ok(won.ok && won.state.status === "won" && won.state.rows.length === 3);
  assert.ok(won.ok && won.state.answer?.name === "Pikachu" && won.state.answer.sprites.length === 1);
  assert.equal(playWordle(ch, [seven[0], "pikachu", seven[1]], wDict).ok, false, "no guesses after winning");
  const lost = playWordle(ch, seven.slice(0, MAX_ATTEMPTS), wDict);
  assert.ok(lost.ok && lost.state.status === "lost" && lost.state.rows.length === 6 && lost.state.answer?.name === "Pikachu");
  assert.equal(playWordle(ch, seven.slice(0, MAX_ATTEMPTS + 1), wDict).ok, false, "max 6 attempts");
  const five = playWordle(ch, seven.slice(0, 5), wDict);
  assert.ok(five.ok && five.state.status === "playing");
  const nido = playWordle({ word: "nidoran" }, seven.filter((w) => w !== "nidoran").slice(0, 6), wDict);
  assert.ok(nido.ok && nido.state.answer?.name === "Nidoran" && nido.state.answer.sprites.length === 2, "Nidoran is shown without gender");
});
check("PokéWordle progress persists across reloads, resets on a new day, stats", () => {
  assert.notEqual(wordleStorageKey(1), wordleStorageKey(2));
  const init = initialWordleState({ word: "pikachu" });
  const r = playWordle({ word: "pikachu" }, [seven[0], seven[1]], wDict);
  assert.ok(r.ok);
  const saved = { key: "k1", guesses: [seven[0], seven[1]], state: r.state };
  assert.deepEqual(restoreWordle(saved, "k1", init), { guesses: saved.guesses, state: r.state }, "reload keeps the board");
  assert.deepEqual(restoreWordle(saved, "k2", init), { guesses: [], state: init }, "re-frozen day starts fresh");
  assert.deepEqual(restoreWordle({ ...saved, state: { ...r.state, length: 5 } }, "k1", init).state, init, "length mismatch");
  assert.deepEqual(restoreWordle(null, "k1", init).state, init);
  const stats = computeWordleStats(
    { "1": { won: true, attempts: 3 }, "2": { won: true, attempts: 4 }, "3": { won: false, attempts: 6 }, "4": { won: true, attempts: 3 } },
    4,
  );
  assert.deepEqual(stats, { played: 4, won: 3, winRate: 75, currentStreak: 1, bestStreak: 2, distribution: [0, 0, 2, 1, 0, 0] });
});
check("PokéWordle share text never reveals the Pokémon", () => {
  const ch = { word: "pikachu" };
  const emoji = { correct: "🟩", present: "🟨", absent: "⬜" } as const;
  const won = playWordle(ch, [seven[0], "pikachu"], wDict);
  assert.ok(won.ok);
  const text = buildWordleShareText({ challengeNumber: 7, rows: won.state.rows, won: true });
  assert.equal(text, `PokéWordle #007\n${won.state.rows[0].pattern.map((s) => emoji[s]).join("")}\n🟩🟩🟩🟩🟩🟩🟩\n\n2/6`);
  const lost = playWordle(ch, seven.slice(0, 6), wDict);
  assert.ok(lost.ok);
  const lostText = buildWordleShareText({ challengeNumber: 7, rows: lost.state.rows, won: false });
  assert.ok(lostText.endsWith("X/6"));
  for (const t of [text, lostText]) {
    assert.ok(!/pikachu|0025/i.test(t) && !/[a-z]{3,}/i.test(t.replace("PokéWordle", "")), "no letters / name / dex number");
  }
});
check("PokéWordle secrets are sealed, fixed-size, bound to their day, unavailable without the key", () => {
  const key = deriveWordleKey(parseGuessKey(generateGuessKey())!);
  const short = sealWordle({ word: "mew" }, 1, key);
  const long = sealWordle({ word: "crabominable" }, 1, key);
  assert.equal(short.data.length, long.data.length, "ciphertext size leaks the length");
  assert.deepEqual(openWordle(long, 1, key), { word: "crabominable" });
  assert.equal(openWordle(long, 2, key), null);
  assert.equal(openWordle(long, 1, deriveWordleKey(parseGuessKey(generateGuessKey())!)), null);
  assert.notDeepEqual(deriveWordleKey(Buffer.alloc(32, 1)), deriveTop10Key(Buffer.alloc(32, 1)), "per-game sub-keys");
  const json = JSON.stringify(initialWordleState({ word: "pikachu" }));
  assert.ok(!json.includes("pikachu") && json.includes('"length":7'), "the initial state only carries the length");
  const noKey = resolveDailyWordle(1, { dict: wDict, store: createJsonChallengeStore(loadChallengeFile()), key: null });
  assert.ok(noKey.source === "unavailable" && noKey.challenge === null);
});
check("daily generation: deterministic, varied lengths, no repeats within a year, length rules", () => {
  const key = deriveWordleKey(parseGuessKey(generateGuessKey())!);
  const days = new Map<number, { word: string }>();
  const lengths = new Set<number>();
  for (let n = 1; n <= 365; n++) {
    const r = generateDailyWordle(n, { dict: wDict, key, lookup: (d) => days.get(d) ?? null });
    assert.equal(r.fallbackStep, 0, `#${n} fallback`);
    const w = r.challenge.word;
    assert.ok(wDict.secrets.some((e) => e.word === w), `#${n} not an eligible secret`);
    const [y1, y2] = [days.get(n - 1)?.word.length, days.get(n - 2)?.word.length];
    assert.ok(!(y1 === w.length && y2 === w.length), `#${n} same length 3 days in a row`);
    assert.ok(!(y1 && isExtremeLength(y1) && isExtremeLength(w.length)), `#${n} extreme lengths on consecutive days`);
    days.set(n, r.challenge);
    lengths.add(w.length);
  }
  assert.equal(new Set([...days.values()].map((c) => c.word)).size, 365, "a Pokémon repeated within a year");
  assert.ok(lengths.size >= 8, `only ${lengths.size} different lengths`);
  const again = generateDailyWordle(200, { dict: wDict, key, lookup: (d) => days.get(d) ?? null });
  assert.deepEqual(again.challenge, days.get(200), "same date → same secret");
  const otherKey = deriveWordleKey(parseGuessKey(generateGuessKey())!);
  const differs = [1, 2, 3, 4, 5].some(
    (n) => generateDailyWordle(n, { dict: wDict, key: otherKey, lookup: () => null }).challenge.word !== days.get(n)!.word,
  );
  assert.ok(differs, "selection depends on the secret key");
});
if (guessKey) {
  check("the 60 frozen PokéWordles decrypt, are valid, distinct and contain no plaintext", () => {
    const key = deriveWordleKey(guessKey);
    const file = loadChallengeFile();
    const frozen = Object.values(file.wordle ?? {}) as StoredChallenge<FrozenWordle>[];
    assert.ok(frozen.length >= 60, `expected ≥60 frozen PokéWordles, found ${frozen.length}`);
    const store = createJsonChallengeStore(file);
    const words: string[] = [];
    const raw = JSON.stringify(file.wordle);
    const sizes = new Set<number>();
    for (const { number, date, payload } of frozen) {
      const r = resolveDailyWordle(number, { dict: wDict, store, key });
      assert.equal(r.source, "frozen", `#${number}`);
      assert.equal(date, dateForChallengeNumber(number));
      assert.equal(r.progressKey, payload.salt);
      assert.equal(payload.generatorVersion, WORDLE_VERSION);
      assert.ok(wDict.secrets.some((e) => e.word === r.challenge!.word), `#${number} not eligible`);
      sizes.add(payload.challenge.data.length);
      words.push(r.challenge!.word);
    }
    assert.equal(new Set(words).size, words.length, "repeated secret in the frozen days");
    assert.equal(sizes.size, 1, "ciphertext sizes differ");
    for (const w of words) assert.ok(!raw.includes(w) && !raw.includes(wDict.byWord.get(w)!.name), "plaintext secret in the file");
    assert.ok(new Set(words.map((w) => w.length)).size >= 5, "little length variety in the frozen days");
  });
}

console.log("PokéImpostor");
const iData = prepareImpostorData(pokedex.all);
const iBySlug = (slug: string) => pokedex.all.find((p) => p.slug === slug)!;
const iCat = (id: string) => getImpostorCategory(id)!;
check("categories follow the data exactly (Charizard is not Dragon, Mew is not legendary…)", () => {
  const dragon = iCat("type:dragon");
  assert.ok(["dragonite", "salamence", "garchomp", "haxorus", "hydreigon", "goodra", "altaria", "kingdra"].every((s) => dragon.test(iBySlug(s))));
  assert.ok(["charizard", "tyranitar", "gyarados", "aerodactyl", "exeggutor"].every((s) => !dragon.test(iBySlug(s))), "base forms only");
  assert.ok(iCat("flag:legendary").test(iBySlug("mewtwo")) && !iCat("flag:legendary").test(iBySlug("mew")));
  assert.ok(iCat("flag:mythical").test(iBySlug("mew")) && !iCat("flag:mythical").test(iBySlug("mewtwo")));
  assert.ok(iCat("gen:1").test(iBySlug("pikachu")) && !iCat("gen:1").test(iBySlug("pichu")) && !iCat("gen:1").test(iBySlug("crobat")));
  assert.ok(iCat("evo:can-evolve").test(iBySlug("dunsparce")) && !iCat("evo:can-evolve").test(iBySlug("charizard")));
  assert.ok(iCat("types:two").test(iBySlug("charizard")) && !iCat("types:two").test(iBySlug("charmander")));
  const speed = iCat("measure:speed>=120");
  assert.ok(speed.test(iBySlug("inteleon")) && iBySlug("inteleon").stats.speed === 120, "threshold is inclusive, exact base stat");
  assert.ok(!speed.test(iBySlug("raikou")) && iBySlug("raikou").stats.speed === 115);
  assert.ok(iCat("total:600").test(iBySlug("tyranitar")) && !iCat("total:600").test(iBySlug("zapdos")));
  assert.ok(iCat("ability:levitate").test(iBySlug("gengar")) === false && iCat("ability:levitate").test(iBySlug("bronzong")));
});
check("debatable categories and Pokémon are kept out", () => {
  const ids = IMPOSTOR_CATEGORIES.map((c) => c.id);
  assert.ok(!ids.some((id) => id.startsWith("color:") || id === "evo:third" || id === "flag:paradox" || id === "flag:ultra-beast"));
  assert.ok(IMPOSTOR_CATEGORIES.every((c) => !getQuartetCategory(c.id)?.review), "a category marked for review is used");
  assert.ok(iData.categories.get("evo:none")!.ambiguous.has(iBySlug("farfetchd").id), "only Galarian Farfetch’d evolves");
  assert.ok(iData.categories.get("evo:can-evolve")!.ambiguous.has(iBySlug("qwilfish").id));
  assert.ok(iData.categories.get("flag:starter")!.ambiguous.has(iBySlug("pikachu").id));
  const swift = iData.categories.get("ability:swift-swim")!;
  for (const id of swift.ambiguous) assert.ok(iData.byId.get(id)!.abilities.some((a) => a.slug === "swift-swim" && a.isHidden), "hidden-ability holders only");
  assert.ok(IMPOSTOR_CATEGORIES.every((c) => c.title.length > 0 && c.short.length > 0));
});
const iKey = deriveImpostorKey(parseGuessKey(generateGuessKey())!);
const iDays = new Map<number, ImpostorChallenge>();
check("365 simulated days: valid boards, right layouts, recency, (almost) no fallbacks", () => {
  const families: Record<string, number> = {};
  let fallbacks = 0;
  for (let n = 1; n <= 365; n++) {
    const r = generateDailyImpostor(n, { data: iData, key: iKey, lookup: (d) => iDays.get(d) ?? null });
    const c = r.challenge;
    const level = impostorLevel(dateForChallengeNumber(n));
    // Step 1 only relaxes recency windows; every quality rule still applies.
    assert.ok(r.fallbackStep <= 1, `#${n} fallback step ${r.fallbackStep}`);
    if (r.fallbackStep) fallbacks++;
    const a = analyzeImpostor(c, iData, level);
    assert.deepEqual([...a.problems, ...a.quality], [], `#${n}: ${[...a.problems, ...a.quality].join("; ")}`);
    assert.equal(c.cards.length, BOARD_SIZE);
    assert.equal(c.cards.length - c.impostors.length, LEVELS[level].correct, `#${n} correct count`);
    assert.equal(c.impostors.length, LEVELS[level].impostors, `#${n} impostor count`);
    const recent = Array.from({ length: RECENCY_WINDOW }, (_, i) => iDays.get(n - 1 - i) ?? null);
    if (r.fallbackStep === 0) {
      assert.deepEqual(recencyProblems(c, recent, DEFAULT_IMPOSTOR_RECENCY), [], `#${n} recency`);
      for (let d = 1; d <= DEFAULT_IMPOSTOR_RECENCY.categoryDays; d++) assert.notEqual(iDays.get(n - d)?.categoryId, c.categoryId, `#${n} category repeated`);
    }
    families[getImpostorCategory(c.categoryId)!.family] = (families[getImpostorCategory(c.categoryId)!.family] ?? 0) + 1;
    iDays.set(n, c);
  }
  assert.ok(fallbacks <= 3, `too many fallbacks: ${fallbacks}`);
  const boards = new Set([...iDays.values()].map((c) => [...c.cards].sort().join(",")));
  assert.equal(boards.size, 365, "a board repeated");
  assert.ok(new Set([...iDays.values()].map((c) => c.categoryId)).size >= 45, "little category variety");
  assert.ok((families.ability ?? 0) <= 60, `too many ability days: ${families.ability}`);
});
check("PokéImpostor is deterministic per day and differs between days / keys", () => {
  const again = generateDailyImpostor(40, { data: iData, key: iKey, lookup: (d) => iDays.get(d) ?? null }).challenge;
  assert.deepEqual(again, iDays.get(40), "same day → same category, Pokémon, impostors and order");
  assert.notDeepEqual(iDays.get(40), iDays.get(41));
  const other = deriveImpostorKey(parseGuessKey(generateGuessKey())!);
  assert.notDeepEqual(generateDailyImpostor(1, { data: iData, key: other, lookup: () => null }).challenge, iDays.get(1), "depends on the secret key");
});
check("board analysis rejects duplicates, ambiguity and a wrong solution", () => {
  const c = iDays.get(1)!;
  assert.deepEqual(analyzeImpostor(c, iData).problems, []);
  assert.ok(analyzeImpostor({ ...c, cards: [...c.cards.slice(0, 9), c.cards[0]] }, iData).problems.includes("duplicate-pokemon"));
  assert.ok(analyzeImpostor({ ...c, cards: c.cards.slice(0, 9) }, iData).problems.includes("wrong-size"));
  const member = c.cards.find((id) => !c.impostors.includes(id))!;
  assert.ok(analyzeImpostor({ ...c, impostors: [...c.impostors, member] }, iData).problems.some((p) => p.startsWith("membership-mismatch")), "unique solution enforced");
  assert.ok(analyzeImpostor({ ...c, hintId: c.impostors[0] }, iData).problems.includes("hint-not-correct"));
  const evoNone = iData.categories.get("evo:none")!;
  const fake = { categoryId: "evo:none", cards: [iBySlug("farfetchd").id, ...evoNone.members.slice(0, 7).map((p) => p.id), ...evoNone.outsiders.slice(0, 2).map((p) => p.id)], impostors: [], hintId: 0 };
  assert.ok(analyzeImpostor(fake, iData).problems.includes("ambiguous-pokemon"));
});
check("normal mode: win only with every correct and no impostor; impostors hidden until CHECK", () => {
  const c = iDays.get(2)!;
  const members = c.cards.filter((id) => !c.impostors.includes(id));
  const before = playImpostor(c, { mode: "normal", help: false });
  assert.ok(before.ok && before.state.status === "playing" && before.state.impostors === undefined && before.state.hintId === undefined);
  const won = playImpostor(c, { mode: "normal", help: false, selection: [...members].reverse() });
  assert.ok(won.ok && won.state.status === "won" && won.state.score === 10 && won.state.impostors?.length === c.impostors.length);
  const missing = playImpostor(c, { mode: "normal", help: false, selection: members.slice(1) });
  assert.ok(missing.ok && missing.state.status === "lost" && missing.state.score === 9, "a forgotten correct Pokémon loses");
  const trap = playImpostor(c, { mode: "normal", help: false, selection: [...members, c.impostors[0]] });
  assert.ok(trap.ok && trap.state.status === "lost" && trap.state.score === 9, "one impostor loses");
  assert.equal(playImpostor(c, { mode: "normal", help: false, selection: [members[0], members[0]] }).ok, false, "duplicate ids");
  assert.equal(playImpostor(c, { mode: "normal", help: false, selection: [99999] }).ok, false, "not on the board");
  assert.equal(playImpostor(c, { mode: "normal", help: false, decisions: [] }).ok, false, "mixed modes");
  assert.equal(playImpostor(c, { mode: "hard", help: false }).ok, false);
});
check("one-by-one mode: every decision right = win; first mistake ends the game", () => {
  const c = iDays.get(3)!;
  const right = c.cards.map((id): Verdict => (c.impostors.includes(id) ? "impostor" : "correct"));
  const won = playImpostor(c, { mode: "one-by-one", help: false, decisions: right });
  assert.ok(won.ok && won.state.status === "won" && won.state.score === 10);
  const partial = playImpostor(c, { mode: "one-by-one", help: false, decisions: right.slice(0, 4) });
  assert.ok(partial.ok && partial.state.status === "playing" && partial.state.score === 4 && partial.state.impostors === undefined);
  const firstImpostor = c.cards.findIndex((id) => c.impostors.includes(id));
  const fooled = [...right.slice(0, firstImpostor), "correct" as Verdict];
  const lost = playImpostor(c, { mode: "one-by-one", help: false, decisions: fooled });
  assert.ok(lost.ok && lost.state.status === "lost" && lost.state.score === firstImpostor && lost.state.impostors?.length === c.impostors.length, "impostor accepted → game over");
  assert.deepEqual(playImpostor(c, { mode: "one-by-one", help: false, decisions: [...fooled, "correct"] }), { ok: false, message: "La partida ha terminado." }, "no going on after a mistake");
  const firstCorrect = c.cards.findIndex((id) => !c.impostors.includes(id));
  const rejected = playImpostor(c, { mode: "one-by-one", help: false, decisions: [...right.slice(0, firstCorrect), "impostor"] });
  assert.ok(rejected.ok && rejected.state.status === "lost", "rejecting a correct Pokémon is also a mistake");
  assert.equal(playImpostor(c, { mode: "one-by-one", help: false, decisions: [...right, "correct"] }).ok, false, "max 10 decisions");
  assert.equal(playImpostor(c, { mode: "one-by-one", help: false, decisions: ["maybe"] }).ok, false);
});
check("help reveals one correct Pokémon (the least obvious), never an impostor", () => {
  for (const c of [...iDays.values()].slice(0, 60)) {
    const r = playImpostor(c, { mode: "normal", help: true });
    assert.ok(r.ok && r.state.hintId === c.hintId && !c.impostors.includes(c.hintId) && r.state.impostors === undefined);
  }
});
check("the browser only gets the category and the cards", () => {
  const c = iDays.get(5)!;
  const view = boardView(c, (id) => pokedex.getById(id));
  assert.deepEqual(Object.keys(view).sort(), ["cards", "impostorCount", "note", "short", "title"].filter((k) => k !== "note" || view.note !== undefined).sort());
  assert.deepEqual(view.cards.map((x) => x.id), c.cards, "same initial order");
  const json = JSON.stringify(view);
  assert.ok(!/impostors|hintId|categoryId|"impostor"/.test(json), "solution data leaked");
  assert.equal(view.impostorCount, c.impostors.length);
});
check("PokéImpostor progress survives a reload and resets on a new day; stats", () => {
  assert.notEqual(impostorStorageKey(1), impostorStorageKey(2));
  const saved = { key: "k1", mode: "normal" as const, help: true, selection: [1, 2, 3], decisions: [], state: initialImpostorState("normal") };
  assert.deepEqual(restoreImpostor(saved, "k1"), saved, "selection, mode and help kept");
  assert.deepEqual(restoreImpostor(saved, "k2"), { help: false, selection: [], decisions: [] }, "re-frozen day starts fresh");
  assert.equal(restoreImpostor({ ...saved, state: initialImpostorState("one-by-one") }, "k1").mode, undefined, "inconsistent save ignored");
  const stats = computeImpostorStats(
    { "1": { won: true, score: 10, mode: "normal", help: false }, "2": { won: true, score: 10, mode: "one-by-one", help: true }, "4": { won: false, score: 7, mode: "normal", help: false } },
    4,
  );
  assert.deepEqual(stats, { played: 3, won: 2, currentStreak: 0, bestStreak: 2, oneByOneWins: 1 });
});
check("PokéImpostor share text reveals no Pokémon", () => {
  const c = iDays.get(6)!;
  const members = c.cards.filter((id) => !c.impostors.includes(id));
  const r = playImpostor(c, { mode: "normal", help: true, selection: [...members.slice(1), c.impostors[0]] });
  assert.ok(r.ok);
  const outcomes = cardOutcomes(c.cards, r.state);
  assert.equal(outcomes.filter((o) => o === "wrong").length, 2);
  const text = buildImpostorShareText({ challengeNumber: 6, categoryShort: getImpostorCategory(c.categoryId)!.short, outcomes, mode: "normal", help: true, score: r.state.score });
  assert.ok(text.startsWith("🕵️ PokéImpostor #006 · Normal") && text.includes("Resultado: 8/10") && text.includes("💡"));
  assert.equal((text.match(/🟩|🟥/gu) ?? []).length, 10);
  for (const id of c.cards) assert.ok(!text.includes(pokedex.getById(id)!.name), "a name leaked");
  const lost = playImpostor(iDays.get(7)!, { mode: "one-by-one", help: false, decisions: [iDays.get(7)!.impostors.includes(iDays.get(7)!.cards[0]) ? "correct" : "impostor"] });
  assert.ok(lost.ok);
  assert.deepEqual(cardOutcomes(iDays.get(7)!.cards, lost.state), ["wrong", ...Array(9).fill("pending")]);
});
check("PokéImpostor boards are sealed, bound to their day, unavailable without the key", () => {
  const c = iDays.get(1)!;
  const box = sealImpostor(c, 1, iKey);
  assert.deepEqual(openImpostor(box, 1, iKey), c);
  assert.equal(openImpostor(box, 2, iKey), null);
  assert.equal(openImpostor(box, 1, deriveImpostorKey(parseGuessKey(generateGuessKey())!)), null);
  assert.notDeepEqual(deriveImpostorKey(Buffer.alloc(32, 1)), deriveWordleKey(Buffer.alloc(32, 1)), "per-game sub-keys");
  const raw = JSON.stringify(loadChallengeFile().impostor ?? {});
  assert.ok(!/categoryId|impostors|hintId|cards/.test(raw), "plain board data in data/daily-challenges.json");
  const noKey = resolveDailyImpostor(1, { data: iData, store: createJsonChallengeStore(loadChallengeFile()), key: null });
  assert.ok(noKey.source === "unavailable" && noKey.challenge === null);
});
if (guessKey) {
  check("the 60 frozen PokéImpostors decrypt and are valid, varied and on the weekly curve", () => {
    const key = deriveImpostorKey(guessKey);
    const file = loadChallengeFile();
    const frozen = Object.values(file.impostor ?? {}) as StoredChallenge<FrozenImpostor>[];
    assert.ok(frozen.length >= 60, `expected ≥60 frozen PokéImpostors, found ${frozen.length}`);
    const store = createJsonChallengeStore(file);
    const days = new Map<number, ImpostorChallenge>();
    for (const { number, date, payload } of frozen) {
      const r = resolveDailyImpostor(number, { data: iData, store, key });
      assert.equal(r.source, "frozen", `#${number}`);
      assert.equal(date, dateForChallengeNumber(number));
      assert.equal(r.progressKey, payload.salt);
      assert.equal(payload.generatorVersion, IMPOSTOR_VERSION);
      assert.equal(payload.fallbackStep, 0, `#${number} used a fallback`);
      const a = analyzeImpostor(r.challenge!, iData, impostorLevel(date));
      assert.deepEqual([...a.problems, ...a.quality], [], `#${number}`);
      days.set(number, r.challenge!);
    }
    for (const [n, c] of days) {
      const recent = Array.from({ length: RECENCY_WINDOW }, (_, i) => days.get(n - 1 - i) ?? null);
      assert.deepEqual(recencyProblems(c, recent, DEFAULT_IMPOSTOR_RECENCY), [], `#${n} recency`);
    }
    assert.ok(new Set([...days.values()].map((c) => c.categoryId)).size >= 30, "little category variety in the frozen days");
  });
}

console.log("PokéCry");
const cData = prepareCryData(pokedex.all);
const cKey = deriveCryKey(parseGuessKey(generateGuessKey())!);
const cDays = new Map<number, CryChallenge>();
const cLookup = (id: number) => pokedex.getById(id);
check("365 simulated days: 5 rounds × 4 options, one answer each, 20 distinct Pokémon, curve, recency, no fallbacks", () => {
  const answersSeen = new Map<number, number>();
  for (let n = 1; n <= 365; n++) {
    const recent = Array.from({ length: ANSWER_REPEAT_DAYS }, (_, i) => cDays.get(n - 1 - i) ?? null);
    const r = generateDailyCry(n, { data: cData, key: cKey, lookup: (d) => cDays.get(d) ?? null });
    const c = r.challenge;
    assert.equal(r.fallbackStep, 0, `#${n} fallback`);
    assert.deepEqual(analyzeCry(c, cData).problems, [], `#${n}`);
    assert.equal(c.rounds.length, CRY_ROUNDS);
    for (const round of c.rounds) {
      assert.equal(round.options.length, CRY_OPTIONS);
      assert.equal(new Set(round.options).size, CRY_OPTIONS, "duplicate in a round");
      assert.equal(round.options.filter((id) => id === round.answer).length, 1, "exactly one solution, among the options");
      assert.ok(round.options.every((id) => cLookup(id) && cData.notable.has(id)), "unknown or obscure option");
    }
    const all = c.rounds.flatMap((x) => x.options);
    assert.equal(new Set(all).size, CRY_ROUNDS * CRY_OPTIONS, "Pokémon repeated within the day");
    const curve = c.rounds.map((x) => x.difficulty);
    assert.ok(CURVES.some((t) => t.curve.join() === curve.join()), "unknown difficulty curve");
    assert.equal(curve[0], "easy");
    assert.ok(curve.includes("hard") && curve.includes("normal"), "flat day");
    for (const x of c.rounds) {
      assert.ok(!recent.some((p) => p?.rounds.some((q) => q.answer === x.answer)), `#${n} answer repeated within ${ANSWER_REPEAT_DAYS} days`);
      answersSeen.set(x.answer, (answersSeen.get(x.answer) ?? 0) + 1);
    }
    const gens = c.rounds.map((x) => cLookup(x.answer)!.generation);
    assert.ok(gens.every((g) => gens.filter((h) => h === g).length <= 2), "too many answers from one generation");
    cDays.set(n, c);
  }
  assert.ok(answersSeen.size >= 700, `answer variety: ${answersSeen.size}`);
});
check("distractors are plausible and get closer as rounds get harder", () => {
  const sims: Record<string, number[]> = { easy: [], normal: [], hard: [] };
  for (const c of cDays.values()) {
    for (const r of c.rounds) {
      const a = cLookup(r.answer)!;
      for (const id of r.options.filter((x) => x !== r.answer)) {
        const s = similarity(a, cLookup(id)!);
        assert.ok(s >= 1, `${a.name} → ${cLookup(id)!.name} is unrelated (${s})`);
        sims[r.difficulty].push(s);
      }
    }
  }
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  assert.ok(avg(sims.easy) < avg(sims.normal) && avg(sims.normal) < avg(sims.hard), "difficulty does not follow similarity");
  const pikachu = cLookup(25)!;
  assert.ok(similarity(pikachu, cLookup(172)!) > similarity(pikachu, cLookup(493)!), "Pichu is a better distractor than Arceus");
});
check("PokéCry is deterministic per day and differs between days / keys", () => {
  assert.deepEqual(generateDailyCry(50, { data: cData, key: cKey, lookup: (d) => cDays.get(d) ?? null }).challenge, cDays.get(50));
  assert.notDeepEqual(cDays.get(50), cDays.get(51));
  const other = deriveCryKey(parseGuessKey(generateGuessKey())!);
  assert.notDeepEqual(generateDailyCry(1, { data: cData, key: other, lookup: () => null }).challenge, cDays.get(1));
});
check("play: correct / wrong submit, answers fixed once sent, next round, final score", () => {
  const c = cDays.get(2)!;
  const init = initialCryState(c, cLookup);
  assert.ok(init.current?.index === 0 && init.current.options.length === 4 && init.results.length === 0);
  const right = c.rounds.map((r) => r.answer);
  const wrong = c.rounds.map((r) => r.options.find((id) => id !== r.answer)!);
  const r1 = playCry(c, [right[0]], cLookup);
  assert.ok(r1.ok && r1.state.results[0].correct && r1.state.score === 1 && r1.state.current?.index === 1, "correct → next round served");
  assert.deepEqual(r1.ok && r1.state.current!.options.map((o) => o.id), c.rounds[1].options);
  const r2 = playCry(c, [right[0], wrong[1]], cLookup);
  assert.ok(r2.ok && !r2.state.results[1].correct && r2.state.results[1].answer === c.rounds[1].answer, "wrong → answer revealed");
  const perfect = playCry(c, right, cLookup);
  assert.ok(perfect.ok && perfect.state.status === "finished" && perfect.state.score === 5 && perfect.state.current === undefined);
  const zero = playCry(c, wrong, cLookup);
  assert.ok(zero.ok && zero.state.status === "finished" && zero.state.score === 0);
  const mixed = playCry(c, [right[0], wrong[1], right[2], VOID_CHOICE, right[4]], cLookup);
  assert.ok(mixed.ok && mixed.state.score === 3 && mixed.state.results[3].choice === VOID_CHOICE && !mixed.state.results[3].correct, "voided round scores 0");
  assert.equal(playCry(c, [...right, right[0]], cLookup).ok, false, "a 6th round");
  assert.equal(playCry(c, [c.rounds[1].answer], cLookup).ok, false, "a Pokémon from another round");
  assert.equal(playCry(c, [99999], cLookup).ok, false, "unknown Pokémon");
  assert.equal(playCry(c, [], cLookup).ok, false);
  assert.equal(playCry(c, "25", cLookup).ok, false);
});
check("the browser only gets the current round's options — never answers or future rounds", () => {
  const c = cDays.get(3)!;
  const init = JSON.stringify(initialCryState(c, cLookup));
  assert.ok(!/"answer"|"difficulty"|"rounds"/.test(init), "solution data leaked");
  for (const r of c.rounds.slice(1)) for (const id of r.options) assert.ok(!init.includes(`"id":${id},`), "a future round leaked");
  const mid = playCry(c, [c.rounds[0].answer, c.rounds[1].answer], cLookup);
  assert.ok(mid.ok);
  const json = JSON.stringify(mid);
  for (const r of c.rounds.slice(3)) for (const id of r.options) assert.ok(!json.includes(`"id":${id},`), "round 4/5 leaked during round 3");
  assert.ok(!json.includes(`"answer":${c.rounds[2].answer}`), "the current answer leaked");
});
check("PokéCry progress survives a reload and resets on a new day; stats and streak", () => {
  const c = cDays.get(4)!;
  const init = initialCryState(c, cLookup);
  assert.notEqual(cryStorageKey(1), cryStorageKey(2));
  const r = playCry(c, [c.rounds[0].answer, c.rounds[1].options[0]], cLookup);
  assert.ok(r.ok);
  const saved = { key: "k1", choices: [c.rounds[0].answer, c.rounds[1].options[0]], state: r.state, seen: 1 };
  assert.deepEqual(restoreCry(saved, "k1", init), saved, "round, choices, results and score kept");
  assert.deepEqual(restoreCry(saved, "k2", init), { choices: [], seen: 0, state: init }, "re-frozen day starts fresh");
  assert.deepEqual(restoreCry({ ...saved, seen: 5 }, "k1", init).state, init, "inconsistent save ignored");
  const stats = computeCryStats({ "1": { score: 5 }, "2": { score: 3 }, "4": { score: 4 } }, 4);
  assert.deepEqual(stats, { played: 3, perfect: 1, avgScore: 4, currentStreak: 1, bestStreak: 2 });
});
check("PokéCry share text reveals nothing but squares and score", () => {
  const c = cDays.get(5)!;
  const right = c.rounds.map((r) => r.answer);
  const wrong = c.rounds.map((r) => r.options.find((id) => id !== r.answer)!);
  const r = playCry(c, [right[0], right[1], wrong[2], right[3], right[4]], cLookup);
  assert.ok(r.ok);
  const text = buildCryShareText({ challengeNumber: 1, results: r.state.results });
  assert.equal(text, "PokéCry #001\n\n🟩 🟩 🟥 🟩 🟩\n\n4/5 🎧");
  for (const id of c.rounds.flatMap((x) => x.options)) assert.ok(!text.includes(cLookup(id)!.name));
  assert.deepEqual(roundSquares(r.state.results.slice(0, 2)), ["🟩", "🟩", "⬜", "⬜", "⬜"], "future rounds not shown");
});
check("PokéCry days and audio are sealed, bound to their day / Pokémon, unavailable without the key", () => {
  const c = cDays.get(1)!;
  const box = sealCry(c, 1, cKey);
  assert.deepEqual(openCry(box, 1, cKey), c);
  assert.equal(openCry(box, 2, cKey), null);
  assert.equal(openCry(box, 1, deriveCryKey(parseGuessKey(generateGuessKey())!)), null);
  const audio = Buffer.from("ID3 fake mp3 bytes");
  const sealed = sealCryAudio(audio, 25, cKey);
  assert.deepEqual(openCryAudio(sealed, 25, cKey), audio);
  assert.equal(openCryAudio(sealed, 26, cKey), null, "audio bound to its Pokémon");
  assert.ok(!sealed.includes(audio), "plain audio bytes in the sealed file");
  assert.notEqual(cryAudioName(cKey, 25), cryAudioName(cKey, 26));
  assert.match(cryAudioName(cKey, 25), /^[0-9a-f]{24}\.bin$/, "audio names are opaque hashes");
  assert.notDeepEqual(deriveCryKey(Buffer.alloc(32, 1)), deriveImpostorKey(Buffer.alloc(32, 1)), "per-game sub-keys");
  const raw = JSON.stringify(loadChallengeFile().cry ?? {});
  assert.ok(!/rounds|answer|options|difficulty/.test(raw), "plain day data in data/daily-challenges.json");
  const noKey = resolveDailyCry(1, { data: cData, store: createJsonChallengeStore(loadChallengeFile()), key: null });
  assert.ok(noKey.source === "unavailable" && noKey.challenge === null);
});
if (guessKey) {
  check("the 60 frozen PokéCry days decrypt, are valid, and every answer has a playable prepared cry", () => {
    const key = deriveCryKey(guessKey);
    const file = loadChallengeFile();
    const frozen = Object.values(file.cry ?? {}) as StoredChallenge<FrozenCry>[];
    assert.ok(frozen.length >= 60, `expected ≥60 frozen PokéCry days, found ${frozen.length}`);
    const store = createJsonChallengeStore(file);
    const answers: number[] = [];
    for (const { number, date, payload } of frozen) {
      const r = resolveDailyCry(number, { data: cData, store, key });
      assert.equal(r.source, "frozen", `#${number}`);
      assert.equal(date, dateForChallengeNumber(number));
      assert.equal(r.progressKey, payload.salt);
      assert.equal(payload.generatorVersion, CRY_VERSION);
      assert.equal(payload.fallbackStep, 0);
      assert.deepEqual(analyzeCry(r.challenge!, cData).problems, [], `#${number}`);
      for (const round of r.challenge!.rounds) {
        const audioFile = path.join(process.cwd(), "data", "cries", cryAudioName(key, round.answer));
        assert.ok(existsSync(audioFile), `#${number}: missing audio`);
        const mp3 = openCryAudio(readFileSync(audioFile), round.answer, key);
        assert.ok(mp3 && mp3.length > 1000 && (mp3.subarray(0, 3).toString() === "ID3" || (mp3[0] === 0xff && (mp3[1] & 0xe0) === 0xe0)), `#${number}: not an MP3`);
        answers.push(round.answer);
      }
    }
    assert.equal(answers.length, frozen.length * CRY_ROUNDS);
    assert.equal(new Set(answers).size, answers.length, "an answer repeats within the frozen days");
  });
}

console.log("Share");
check("share text is spoiler-free and well-formed", () => {
  const text = buildShareText({ challengeNumber: 1, filled: Array(9).fill(true), streak: 8 });
  assert.equal(text, "PokeDaily #001\n\n🟩 🟩 🟩\n🟩 🟩 🟩\n🟩 🟩 🟩\n\n9/9\n\n🔥 8 day streak");
  const partial = buildShareText({
    challengeNumber: 12,
    filled: [true, false, true, true, true, true, true, true, true],
    streak: 0,
  });
  assert.ok(partial.includes("🟩 ⬜ 🟩") && partial.includes("8/9") && !partial.includes("streak"));
});

console.log(`\n${passed} checks passed.`);
