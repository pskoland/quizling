import { GameState, GameAction, PowerPin, GameMode, GAME_MODES } from './types';
import { generateQuestions, generateLagnavnOptions } from './generate-questions';
import { logGameResult } from './game-stats';
import { useDb, getSql } from './db';

const memGames = new Map<string, GameState>();

async function loadGame(code: string): Promise<GameState | null> {
  if (!useDb()) return memGames.get(code) ?? null;
  const sql = getSql();
  const rows = await sql`SELECT state FROM games WHERE code = ${code}` as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return rows[0].state as GameState;
}

async function saveGame(game: GameState): Promise<void> {
  if (!useDb()) {
    memGames.set(game.code, game);
    return;
  }
  const sql = getSql();
  const stateJson = JSON.stringify(game);
  await sql`
    INSERT INTO games (code, state, updated_at, created_at)
    VALUES (${game.code}, ${stateJson}, ${game.updatedAt}, ${game.createdAt})
    ON CONFLICT (code) DO UPDATE SET
      state = ${stateJson},
      updated_at = ${game.updatedAt}
  `;
}

async function codeExists(code: string): Promise<boolean> {
  if (!useDb()) return memGames.has(code);
  const sql = getSql();
  const rows = await sql`SELECT 1 FROM games WHERE code = ${code} LIMIT 1` as Record<string, unknown>[];
  return rows.length > 0;
}

async function generateCode(): Promise<string> {
  let code: string;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (await codeExists(code));
  return code;
}

export function getQuizlingCount(playerCount: number, mode: 'short' | 'medium' | 'long' = 'long'): number {
  if (mode === 'short') return 1;
  if (playerCount >= 5) return 2;
  return 1;
}

function pickQuizlings(players: { id: string }[], previousIds: string[], mode: 'short' | 'medium' | 'long'): string[] {
  const count = getQuizlingCount(players.length, mode);
  // Try to avoid previous quizlings, but don't if impossible
  const eligible = players.filter(p => !previousIds.includes(p.id));
  const pool = eligible.length >= count ? eligible : [...players];

  const picked: string[] = [];
  const remaining = [...pool];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * remaining.length);
    picked.push(remaining[idx].id);
    remaining.splice(idx, 1);
  }
  return picked;
}

export async function createGame(hostName: string, hostId: string): Promise<GameState> {
  const code = await generateCode();
  const game: GameState = {
    code,
    phase: 'lobby',
    mode: 'long',
    players: [{ id: hostId, name: hostName, isHost: true }],
    hostId,
    quizlingIds: [],
    category: null,
    questions: [],
    powerQuestions: [],
    lagnavn: null,
    lagnavnOptions: [],
    quizlingLagnavnTarget: null,
    currentQuizQ: 0,
    quizAnswers: {},
    powerAnswers: { 0: {}, 1: {} },
    powerAnswerTimestamps: { 0: {}, 1: {} },
    powerWinners: {},
    powerPins: {},
    pinUsedAt: {},
    votes: {},
    writerQueue: [],
    confirmedRoles: [],
    fasitRevealCount: 0,
    revealStep: 0,
    previousQuizlingIds: [],
    questionStartedAt: null,
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
  await saveGame(game);
  return game;
}

export async function getGame(code: string): Promise<GameState | null> {
  return loadGame(code);
}

export async function joinGame(code: string, playerName: string, playerId: string): Promise<GameState> {
  const game = await loadGame(code);
  if (!game) throw new Error('Game not found');
  if (game.phase !== 'lobby') throw new Error('Game already started');
  if (game.players.length >= 9) throw new Error('Game is full');
  if (game.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
    throw new Error('Name already taken');
  }

  game.players.push({ id: playerId, name: playerName, isHost: false });
  game.updatedAt = Date.now();
  await saveGame(game);
  return game;
}

export async function startGame(code: string, hostId: string): Promise<GameState> {
  const game = await loadGame(code);
  if (!game) throw new Error('Game not found');
  if (game.hostId !== hostId) throw new Error('Only host can start');
  if (game.players.length < 3) throw new Error('Need at least 3 players');
  if (game.mode === 'short' && game.players.length > 5) throw new Error('Short mode supports max 5 players');

  game.quizlingIds = pickQuizlings(game.players, game.previousQuizlingIds, game.mode);

  const modeConfig = GAME_MODES[game.mode];
  const generated = await generateQuestions(undefined, modeConfig.quizCount, modeConfig.powerCount);
  game.category = generated.category;
  game.questions = generated.questions;
  game.powerQuestions = generated.powerQuestions;
  game.writerQueue = game.players.map(p => p.id);
  const lagnavnOpts = await generateLagnavnOptions();
  game.lagnavnOptions = lagnavnOpts;
  game.quizlingLagnavnTarget = lagnavnOpts[Math.floor(Math.random() * lagnavnOpts.length)];
  game.phase = 'rules';
  game.confirmedRoles = [];
  game.fasitRevealCount = 0;
  game.revealStep = 0;
  game.questionStartedAt = null;
  game.updatedAt = Date.now();
  await saveGame(game);
  return game;
}

export async function processAction(code: string, action: GameAction): Promise<GameState> {
  const game = await loadGame(code);
  if (!game) throw new Error('Game not found');

  // Validate that the acting player is in the game
  if (!game.players.some(p => p.id === action.playerId)) {
    throw new Error('Player not in game');
  }

  switch (action.type) {
    case 'confirm-role': {
      if (!game.confirmedRoles.includes(action.playerId)) {
        game.confirmedRoles.push(action.playerId);
      }
      if (game.confirmedRoles.length >= game.players.length) {
        game.phase = 'lagnavn';
      }
      break;
    }

    case 'submit-lagnavn': {
      if (action.playerId !== game.hostId) throw new Error('Only host can submit');
      const chosen = action.payload?.lagnavn as string;
      if (game.lagnavnOptions.length > 0 && !game.lagnavnOptions.includes(chosen)) {
        throw new Error('Must choose one of the provided team names');
      }
      game.lagnavn = chosen;
      game.phase = 'lagnavn-confirmed';
      break;
    }

    case 'advance-phase': {
      if (action.playerId !== game.hostId) throw new Error('Only host can advance');
      advancePhase(game);
      break;
    }

    case 'submit-power-answer': {
      const powerMatch = game.phase.match(/^power-q-(\d+)$/);
      const round = powerMatch ? parseInt(powerMatch[1]) : 0;
      if (!game.powerAnswers[round]) game.powerAnswers[round] = {};
      if (!game.powerAnswerTimestamps[round]) game.powerAnswerTimestamps[round] = {};
      game.powerAnswers[round][action.playerId] = Number(action.payload?.answer);
      game.powerAnswerTimestamps[round][action.playerId] = Date.now();
      if (Object.keys(game.powerAnswers[round]).length >= game.players.length) {
        calcPowerWinner(game, round);
      }
      break;
    }

    case 'choose-pin': {
      const pin = action.payload?.pin as PowerPin;
      const pinRoundMatch = game.phase.match(/^power-result-(\d+)$/);
      const pinRound = pinRoundMatch ? parseInt(pinRoundMatch[1]) : 0;
      game.powerPins[pinRound] = pin;
      break;
    }

    case 'use-pin': {
      const playerPin = getPlayerPin(game, action.playerId);
      if (!playerPin) throw new Error('No pin to use');
      if (playerPin === 'blue') throw new Error('Blue pin activates automatically');
      if (playerPin === 'black') throw new Error('Black pin uses use-black-pin action');
      if (game.pinUsedAt[action.playerId] !== undefined) throw new Error('Pin already used');
      if (!game.phase.startsWith('quiz-')) throw new Error('Can only use pin during quiz');
      game.pinUsedAt[action.playerId] = getCurrentQuizIndex(game);
      break;
    }

    case 'use-black-pin': {
      const bPin = getPlayerPin(game, action.playerId);
      if (!bPin || bPin !== 'black') throw new Error('No black pin to use');
      if (game.pinUsedAt[action.playerId] !== undefined) throw new Error('Pin already used');
      if (game.phase !== 'voting') throw new Error('Black pin can only be used during voting');
      const targetQ = action.payload?.questionIndex as number;
      if (targetQ === undefined || targetQ < 0 || targetQ >= game.questions.length) throw new Error('Invalid question index');
      if (game.quizAnswers[targetQ] === undefined) throw new Error('No team answer for that question');
      game.pinUsedAt[action.playerId] = targetQ;
      break;
    }

    case 'submit-quiz-answer': {
      if (!game.phase.startsWith('quiz-')) throw new Error('Not in quiz phase');
      const qi = getCurrentQuizIndex(game);
      if (game.quizAnswers[qi] !== undefined) throw new Error('Answer already submitted');
      const answer = action.payload?.answer;
      if (typeof answer !== 'string' || answer.length > 500) throw new Error('Invalid answer');
      game.quizAnswers[qi] = answer;
      break;
    }

    case 'submit-vote': {
      if (game.phase !== 'voting') throw new Error('Not in voting phase');
      if (game.votes[action.playerId]) throw new Error('Already voted');
      const playerIds = game.players.map(p => p.id);
      const targetIds = action.payload?.targetIds as string[] | undefined;
      const quizlingCount = getQuizlingCount(game.players.length, game.mode);
      if (targetIds) {
        if (targetIds.length !== quizlingCount) throw new Error(`Must vote for exactly ${quizlingCount} players`);
        if (targetIds.includes(action.playerId)) throw new Error('Cannot vote for yourself');
        if (new Set(targetIds).size !== targetIds.length) throw new Error('Cannot vote for the same player twice');
        if (!targetIds.every(id => playerIds.includes(id))) throw new Error('Invalid vote target');
        game.votes[action.playerId] = targetIds;
      } else {
        const targetId = action.payload?.targetId as string;
        if (targetId === action.playerId) throw new Error('Cannot vote for yourself');
        if (!playerIds.includes(targetId)) throw new Error('Invalid vote target');
        game.votes[action.playerId] = [targetId];
      }
      if (Object.keys(game.votes).length >= game.players.length) {
        game.phase = 'fasit';
      }
      break;
    }

    case 'set-mode': {
      if (action.playerId !== game.hostId) throw new Error('Only host can set mode');
      if (game.phase !== 'lobby') throw new Error('Can only set mode in lobby');
      game.mode = action.payload?.mode as GameMode;
      break;
    }

    case 'reveal-fasit-question': {
      if (action.playerId !== game.hostId) throw new Error('Only host can reveal');
      if (game.phase !== 'fasit') throw new Error('Not in fasit phase');
      game.fasitRevealCount = (game.fasitRevealCount ?? 0) + 1;
      break;
    }

    case 'advance-reveal-step': {
      if (action.playerId !== game.hostId) throw new Error('Only host can advance');
      if (game.phase !== 'reveal') throw new Error('Not in reveal phase');
      game.revealStep = (game.revealStep ?? 0) + 1;
      break;
    }

    case 'restart-game': {
      if (action.playerId !== game.hostId) throw new Error('Only host can restart');
      game.previousQuizlingIds = game.quizlingIds;
      const modeConfig = GAME_MODES[game.mode];
      const generated = await generateQuestions(undefined, modeConfig.quizCount, modeConfig.powerCount);
      game.quizlingIds = pickQuizlings(game.players, game.previousQuizlingIds, game.mode);
      game.category = generated.category;
      game.questions = generated.questions;
      game.powerQuestions = generated.powerQuestions;
      game.writerQueue = game.players.map(p => p.id);
      const restartLagnavn = await generateLagnavnOptions();
      game.lagnavnOptions = restartLagnavn;
      game.quizlingLagnavnTarget = restartLagnavn[Math.floor(Math.random() * restartLagnavn.length)];
      game.phase = 'rules';
      game.confirmedRoles = [];
      game.lagnavn = null;
      game.currentQuizQ = 0;
      game.quizAnswers = {};
      game.powerAnswers = {};
      game.powerAnswerTimestamps = {};
      game.powerWinners = {};
      game.powerPins = {};
      game.pinUsedAt = {};
      game.votes = {};
      game.fasitRevealCount = 0;
      game.revealStep = 0;
      game.questionStartedAt = null;
      break;
    }
  }

  game.updatedAt = Date.now();
  await saveGame(game);
  return game;
}

function getCurrentQuizIndex(game: GameState): number {
  const match = game.phase.match(/^quiz-(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

function advancePhase(game: GameState): void {
  const totalQ = game.questions.length;
  const modeConfig = GAME_MODES[game.mode];
  const powerBefore = modeConfig.powerBefore; // e.g. [3, 6, 9] for long

  // Static transitions
  const staticOrder: Record<string, string> = {
    'rules': 'role-reveal',
    'lagnavn-confirmed': 'quiz-0',
    'fasit': 'reveal',
    'reveal': 'result',
  };

  if (staticOrder[game.phase]) {
    game.phase = staticOrder[game.phase] as GameState['phase'];
    if (game.phase.startsWith('quiz-')) {
      game.questionStartedAt = Date.now();
    }
    if (game.phase === 'fasit') {
      game.fasitRevealCount = 0;
    }
    if (game.phase === 'reveal') {
      game.revealStep = 0;
    }
    if (game.phase === 'result') {
      // Log game stats asynchronously (don't block the transition)
      logGameResult(game).catch(() => {});
    }
    return;
  }

  // After power result → resume quiz at the break index (but wait for pin choice)
  const powerResultMatch = game.phase.match(/^power-result-(\d+)$/);
  if (powerResultMatch) {
    const round = parseInt(powerResultMatch[1]);
    const winnerId = game.powerWinners[round];
    if (winnerId && game.powerPins[round] === undefined) {
      throw new Error('Winner must choose a pin before advancing');
    }
    game.phase = `quiz-${powerBefore[round]}`;
    game.questionStartedAt = Date.now();
    return;
  }

  // Quiz phase transitions
  const quizMatch = game.phase.match(/^quiz-(\d+)$/);
  if (quizMatch) {
    const idx = parseInt(quizMatch[1]);
    const nextIdx = idx + 1;
    // Check if next index is a power break
    const powerRound = powerBefore.indexOf(nextIdx);
    if (powerRound !== -1) {
      game.phase = `power-q-${powerRound}` as GameState['phase'];
      return;
    }
    // After last question → voting
    if (nextIdx >= totalQ) {
      game.phase = 'voting';
      game.votes = {};
      return;
    }
    // Next question
    game.phase = `quiz-${nextIdx}`;
    game.questionStartedAt = Date.now();
    return;
  }
}

function calcPowerWinner(game: GameState, round: number): void {
  const correctAnswer = Number(game.powerQuestions[round].answer);
  const answers = game.powerAnswers[round];
  const timestamps = game.powerAnswerTimestamps?.[round] ?? {};
  let winnerId = '';
  let bestDiff = Infinity;
  let bestTime = Infinity;

  for (const [pid, ans] of Object.entries(answers)) {
    const diff = Math.abs(ans - correctAnswer);
    const time = timestamps[pid] ?? 0;
    // Closest answer wins; if tied, fastest answer wins
    if (diff < bestDiff || (diff === bestDiff && time < bestTime)) {
      bestDiff = diff;
      bestTime = time;
      winnerId = pid;
    }
  }

  game.powerWinners[round] = winnerId;
  game.phase = `power-result-${round}` as GameState['phase'];
}

/** Get a player's most recently chosen pin (from the latest round they won) */
function getPlayerPin(game: GameState, playerId: string): PowerPin | null {
  // Find rounds this player won, in descending order
  const wonRounds = Object.entries(game.powerWinners)
    .filter(([, pid]) => pid === playerId)
    .map(([r]) => parseInt(r))
    .sort((a, b) => b - a);
  // Return their most recent pin
  for (const round of wonRounds) {
    if (game.powerPins[round] !== undefined) return game.powerPins[round];
  }
  return null;
}

export function getPlayerView(game: GameState, playerId: string): Record<string, unknown> {
  const isQuizling = game.quizlingIds.includes(playerId);
  const player = game.players.find(p => p.id === playerId);
  const isHost = player?.isHost ?? false;
  const isPostGame = game.phase === 'fasit' || game.phase === 'reveal' || game.phase === 'result';
  const isQuizPhase = game.phase.startsWith('quiz-');

  const quizIndex = getCurrentQuizIndex(game);
  const writerId = game.writerQueue[quizIndex % game.writerQueue.length];
  const isWriter = writerId === playerId;

  const myPin = getPlayerPin(game, playerId);

  // Pin reveal info
  const pinUsedAtIndex = game.pinUsedAt[playerId];
  const hasPinBeenUsed = pinUsedAtIndex !== undefined;
  const usedPinTypes = Object.values(game.powerPins) as string[];
  const modeConfig = GAME_MODES[game.mode];
  const lastPowerRound = modeConfig.powerCount - 1;

  let pinReveal: string | null = null;
  let pinType: string | null = null;
  let canUsePin = false;
  let blackPinReveal: string | null = null; // For black pin during voting

  if (myPin && isQuizPhase) {
    const totalQ = game.questions.length;
    if (myPin === 'blue' && quizIndex === totalQ - 1) {
      pinReveal = game.questions[quizIndex]?.answer ?? null;
      pinType = 'blue';
    } else if (myPin === 'white' && quizIndex > 0) {
      if (hasPinBeenUsed && pinUsedAtIndex === quizIndex) {
        // Show reveal ONLY on the question where it was activated
        pinReveal = game.questions[quizIndex - 1]?.answer ?? null;
        pinType = 'white';
      } else if (!hasPinBeenUsed) {
        canUsePin = true;
      }
    }
    // Black pin is NOT usable during quiz — only during voting
  }

  // Black pin: usable during voting phase to see team answer for a chosen question
  if (myPin === 'black' && game.phase === 'voting') {
    if (hasPinBeenUsed) {
      blackPinReveal = game.quizAnswers[pinUsedAtIndex] ?? null;
      pinType = 'black';
    } else {
      canUsePin = true;
    }
  }

  // Find all power rounds this player won
  const wonPowerRounds = Object.entries(game.powerWinners)
    .filter(([, pid]) => pid === playerId)
    .map(([r]) => parseInt(r));
  // For PowerResultScreen: check if player won the CURRENT round
  const currentPowerRound = game.phase.match(/^power-result-(\d+)$/);
  const wonCurrentPowerRound = currentPowerRound
    ? wonPowerRounds.includes(parseInt(currentPowerRound[1]))
    : false;

  // Per-question answer for quizling (not full sheet)
  let currentAnswerForQuizling: string | undefined;
  if (isQuizling && isQuizPhase) {
    currentAnswerForQuizling = game.questions[quizIndex]?.answer;
  }

  return {
    code: game.code,
    phase: game.phase,
    mode: game.mode,
    players: game.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })),
    hostId: game.hostId,
    isHost,
    isQuizling: game.phase !== 'lobby' ? isQuizling : undefined,
    fellowQuizlings: isQuizling && game.phase !== 'lobby'
      ? game.quizlingIds.filter(id => id !== playerId).map(id => game.players.find(p => p.id === id)?.name ?? '')
      : undefined,
    quizlingCount: getQuizlingCount(game.players.length, game.mode),
    category: isQuizling && game.phase !== 'lobby' && game.phase !== 'rules' ? game.category : undefined,
    lagnavn: game.lagnavn,
    lagnavnOptions: (game.phase === 'lagnavn' || game.phase === 'lagnavn-confirmed') ? game.lagnavnOptions : undefined,
    quizlingLagnavnTarget: isQuizling && (game.phase === 'lagnavn' || game.phase === 'lagnavn-confirmed')
      ? game.quizlingLagnavnTarget
      : (isPostGame)
        ? game.quizlingLagnavnTarget
        : undefined,
    quizlingLagnavnSuccess: (isPostGame)
      ? game.lagnavn === game.quizlingLagnavnTarget
      : undefined,
    currentQuestion: getCurrentQuestion(game),
    currentPowerQuestion: getCurrentPowerQuestion(game),
    quizAnswers: (isWriter || isPostGame || game.phase === 'voting')
      ? game.quizAnswers
      : Object.fromEntries(
          Object.entries(game.quizAnswers).map(([k]) => [k, '***'])
        ),
    powerAnswers: game.powerAnswers,
    powerWinners: game.powerWinners,
    powerPins: game.powerPins,
    votes: (isPostGame)
      ? game.votes
      : (game.votes[playerId] ? { [playerId]: game.votes[playerId] } : {}),
    writerId,
    isWriter,
    confirmedRoles: game.confirmedRoles,
    totalPlayers: game.players.length,
    currentAnswerForQuizling,
    myPin,
    pinReveal,
    pinType,
    canUsePin,
    usedPinTypes,
    blackPinReveal,
    blackPinQuestionIndex: myPin === 'black' && hasPinBeenUsed ? pinUsedAtIndex : undefined,
    fasitRevealCount: game.fasitRevealCount ?? 0,
    revealStep: game.revealStep ?? 0,
    ...(isPostGame || game.phase.startsWith('power-result') ? {
      allQuestions: game.questions,
      allPowerQuestions: game.powerQuestions,
      quizlingIds: isPostGame ? game.quizlingIds : undefined,
      category: isPostGame ? game.category : undefined,
    } : {}),
    wonCurrentPowerRound,
    isLastPowerRound: currentPowerRound ? parseInt(currentPowerRound[1]) === lastPowerRound : false,
    totalQuestions: game.questions.length,
    totalPowerQuestions: game.powerQuestions.length,
    questionStartedAt: game.questionStartedAt,
    updatedAt: game.updatedAt,
  };
}

function getCurrentQuestion(game: GameState): { question: string; number: number } | null {
  const match = game.phase.match(/^quiz-(\d+)$/);
  if (!match) return null;
  const idx = parseInt(match[1]);
  const q = game.questions[idx];
  if (!q) return null;
  return { question: q.question, number: idx + 1 };
}

function getCurrentPowerQuestion(game: GameState): { question: string; number: number } | null {
  const match = game.phase.match(/^power-q-(\d+)$/);
  if (!match) return null;
  const idx = parseInt(match[1]);
  const q = game.powerQuestions[idx];
  if (!q) return null;
  return { question: q.question, number: idx + 1 };
}
