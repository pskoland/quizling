import { GameState, GameAction, PowerPin, GameMode, GAME_MODES } from './types';
import { generateQuestions } from './generate-questions';

// Storage abstraction: Postgres when DATABASE_URL is set, in-memory otherwise (tests)
const useDb = () => !!process.env.DATABASE_URL;

let _sql: ReturnType<typeof import('@neondatabase/serverless').neon> | null = null;
function getSql() {
  if (!_sql) {
    // Dynamic import workaround: require at runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neon } = require('@neondatabase/serverless');
    _sql = neon(process.env.DATABASE_URL!);
  }
  return _sql!;
}

// In-memory fallback for tests
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
  await sql`
    INSERT INTO games (code, state, updated_at, created_at)
    VALUES (${game.code}, ${JSON.stringify(game)}, ${game.updatedAt}, ${game.createdAt})
    ON CONFLICT (code) DO UPDATE SET
      state = ${JSON.stringify(game)},
      updated_at = ${game.updatedAt}
  `;
}

async function codeExists(code: string): Promise<boolean> {
  if (!useDb()) return memGames.has(code);
  const sql = getSql();
  const rows = await sql`SELECT 1 FROM games WHERE code = ${code} LIMIT 1` as Record<string, unknown>[];
  return rows.length > 0;
}

const FALLBACK_QUESTIONS = [
  { question: 'Hva heter Norges høyeste fjell?', answer: 'Galdhøpiggen' },
  { question: 'Hvilket år ble den franske revolusjonen?', answer: '1789' },
  { question: 'Hva er hovedstaden i Australia?', answer: 'Canberra' },
  { question: 'Hvor mange bein har en edderkopp?', answer: '8' },
];

const FALLBACK_POWER_QUESTIONS = [
  { question: 'Omtrent hvor mange kilometer er det fra Oslo til Bergen langs vei?', answer: '462' },
  { question: 'Omtrent hvor mange land er det i verden?', answer: '195' },
];

const CATEGORIES = [
  'dyreriket', 'mat og drikke', 'sport', 'farger', 'musikk',
  'verdensrom', 'norsk natur', 'byer i Europa', 'filmer', 'vitenskap',
];

async function generateCode(): Promise<string> {
  let code: string;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (await codeExists(code));
  return code;
}

export async function createGame(hostName: string, hostId: string): Promise<GameState> {
  const code = await generateCode();
  const game: GameState = {
    code,
    phase: 'lobby',
    mode: 'long',
    players: [{ id: hostId, name: hostName, isHost: true }],
    hostId,
    quizlingId: null,
    category: null,
    questions: [],
    powerQuestions: [],
    lagnavn: null,
    currentQuizQ: 0,
    quizAnswers: {},
    powerAnswers: { 0: {}, 1: {} },
    powerWinners: {},
    powerPins: {},
    votes: {},
    writerQueue: [],
    confirmedRoles: [],
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

  const quizlingIdx = Math.floor(Math.random() * game.players.length);
  game.quizlingId = game.players[quizlingIdx].id;

  const modeConfig = GAME_MODES[game.mode];
  const generated = await generateQuestions(undefined, modeConfig.quizCount, modeConfig.powerCount);
  game.category = generated.category;
  game.questions = generated.questions;
  game.powerQuestions = generated.powerQuestions;
  game.writerQueue = game.players.map(p => p.id);
  game.phase = 'rules';
  game.confirmedRoles = [];
  game.updatedAt = Date.now();
  await saveGame(game);
  return game;
}

export async function processAction(code: string, action: GameAction): Promise<GameState> {
  const game = await loadGame(code);
  if (!game) throw new Error('Game not found');

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
      game.lagnavn = action.payload?.lagnavn as string;
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
      game.powerAnswers[round][action.playerId] = Number(action.payload?.answer);
      if (Object.keys(game.powerAnswers[round]).length >= game.players.length) {
        calcPowerWinner(game, round);
      }
      break;
    }

    case 'choose-pin': {
      const pin = action.payload?.pin as PowerPin;
      game.powerPins[action.playerId] = pin;
      break;
    }

    case 'submit-quiz-answer': {
      const qi = getCurrentQuizIndex(game);
      game.quizAnswers[qi] = action.payload?.answer as string;
      break;
    }

    case 'submit-vote': {
      const targetId = action.payload?.targetId as string;
      game.votes[action.playerId] = targetId;
      if (Object.keys(game.votes).length >= game.players.length) {
        game.phase = 'reveal';
      }
      break;
    }

    case 'set-mode': {
      if (action.playerId !== game.hostId) throw new Error('Only host can set mode');
      if (game.phase !== 'lobby') throw new Error('Can only set mode in lobby');
      game.mode = action.payload?.mode as GameMode;
      break;
    }

    case 'restart-game': {
      if (action.playerId !== game.hostId) throw new Error('Only host can restart');
      const modeConfig = GAME_MODES[game.mode];
      const generated = await generateQuestions(undefined, modeConfig.quizCount, modeConfig.powerCount);
      const quizlingIdx = Math.floor(Math.random() * game.players.length);
      game.quizlingId = game.players[quizlingIdx].id;
      game.category = generated.category;
      game.questions = generated.questions;
      game.powerQuestions = generated.powerQuestions;
      game.writerQueue = game.players.map(p => p.id);
      game.phase = 'rules';
      game.confirmedRoles = [];
      game.lagnavn = null;
      game.currentQuizQ = 0;
      game.quizAnswers = {};
      game.powerAnswers = {};
      game.powerWinners = {};
      game.powerPins = {};
      game.votes = {};
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
    'reveal': 'fasit',
    'fasit': 'result',
  };

  if (staticOrder[game.phase]) {
    game.phase = staticOrder[game.phase] as GameState['phase'];
    return;
  }

  // After power result → resume quiz at the break index
  const powerResultMatch = game.phase.match(/^power-result-(\d+)$/);
  if (powerResultMatch) {
    const round = parseInt(powerResultMatch[1]);
    game.phase = `quiz-${powerBefore[round]}`;
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
    return;
  }
}

function calcPowerWinner(game: GameState, round: number): void {
  const correctAnswer = Number(game.powerQuestions[round].answer);
  const answers = game.powerAnswers[round];
  let winnerId = '';
  let bestDiff = Infinity;

  for (const [pid, ans] of Object.entries(answers)) {
    const diff = Math.abs(ans - correctAnswer);
    if (diff < bestDiff) {
      bestDiff = diff;
      winnerId = pid;
    }
  }

  game.powerWinners[round] = winnerId;
  game.phase = `power-result-${round}` as GameState['phase'];
}

export function getPlayerView(game: GameState, playerId: string): Record<string, unknown> {
  const isQuizling = game.quizlingId === playerId;
  const player = game.players.find(p => p.id === playerId);
  const isHost = player?.isHost ?? false;

  const quizIndex = getCurrentQuizIndex(game);
  const writerId = game.writerQueue[quizIndex % game.writerQueue.length];
  const isWriter = writerId === playerId;

  const myPin = game.powerPins[playerId] ?? null;

  // Auto-reveal pin info
  let pinReveal: string | null = null;
  if (myPin && game.phase.startsWith('quiz-')) {
    const totalQ = game.questions.length;
    if (myPin === 'blue' && quizIndex === totalQ - 1) {
      // Blue: show answer on the last question
      pinReveal = game.questions[quizIndex]?.answer ?? null;
    } else if (myPin === 'white' && quizIndex > 0) {
      // White: show correct answer to previous question
      pinReveal = game.questions[quizIndex - 1]?.answer ?? null;
    }
  }

  const wonPowerRound = Object.entries(game.powerWinners).find(
    ([, pid]) => pid === playerId
  );

  return {
    code: game.code,
    phase: game.phase,
    mode: game.mode,
    players: game.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })),
    hostId: game.hostId,
    isHost,
    isQuizling: game.phase !== 'lobby' ? isQuizling : undefined,
    category: isQuizling && game.phase !== 'lobby' ? game.category : undefined,
    lagnavn: game.lagnavn,
    currentQuestion: getCurrentQuestion(game),
    currentPowerQuestion: getCurrentPowerQuestion(game),
    quizAnswers: (isWriter || game.phase === 'fasit' || game.phase === 'result' || game.phase === 'voting' || game.phase === 'reveal')
      ? game.quizAnswers
      : Object.fromEntries(
          Object.entries(game.quizAnswers).map(([k]) => [k, '***'])
        ),
    powerAnswers: game.powerAnswers,
    powerWinners: game.powerWinners,
    powerPins: game.powerPins,
    votes: game.votes,
    writerId,
    isWriter,
    confirmedRoles: game.confirmedRoles,
    totalPlayers: game.players.length,
    answerSheet: isQuizling && game.phase !== 'lobby'
      ? game.questions.map(q => q.answer)
      : undefined,
    myPin,
    pinReveal,
    ...(game.phase === 'result' || game.phase === 'fasit' || game.phase === 'reveal' || game.phase.startsWith('power-result') ? {
      allQuestions: game.questions,
      allPowerQuestions: game.powerQuestions,
      quizlingId: game.phase === 'result' || game.phase === 'fasit' || game.phase === 'reveal' ? game.quizlingId : undefined,
      category: game.phase === 'result' || game.phase === 'fasit' || game.phase === 'reveal' ? game.category : undefined,
    } : {}),
    wonPowerRound: wonPowerRound ? parseInt(wonPowerRound[0]) : undefined,
    totalQuestions: game.questions.length,
    totalPowerQuestions: game.powerQuestions.length,
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
