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
