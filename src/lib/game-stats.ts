import { GameState, GAME_MODES } from './types';
import { isAnswerCorrect } from './fuzzy-match';
import { useDb, getSql } from './db';
import { recordQuestionResult } from './question-bank';

export async function initGameStats() {
  if (!useDb()) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS game_stats (
      id SERIAL PRIMARY KEY,
      game_code TEXT NOT NULL,
      mode TEXT NOT NULL,
      player_count INTEGER NOT NULL,
      quizling_count INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      wrong_answers INTEGER NOT NULL,
      score INTEGER NOT NULL,
      winner TEXT NOT NULL,
      quizlings_found INTEGER NOT NULL,
      quizlings_escaped INTEGER NOT NULL,
      lagnavn_success BOOLEAN NOT NULL DEFAULT false,
      duration_seconds INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function logGameResult(game: GameState) {
  if (!useDb()) return;

  const modeConfig = GAME_MODES[game.mode];
  const quizlingIds = game.quizlingIds;

  // Calculate score (same logic as ResultScreen)
  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  game.questions.forEach((q, i) => {
    const ans = game.quizAnswers[i];
    const correct = !!ans && isAnswerCorrect(ans, q.answer);
    if (correct) {
      score += 1;
      correctAnswers++;
    } else {
      score -= 1;
      wrongAnswers++;
    }
    // Track per-question stats (fire-and-forget)
    recordQuestionResult(q.question, q.answer, correct).catch(() => {});
  });

  // Elimination
  const voteCounts: Record<string, number> = {};
  Object.values(game.votes).forEach(targetIds => {
    targetIds.forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
    });
  });

  const quizlingCount = quizlingIds.length;
  const sorted = Object.entries(voteCounts).sort(([, a], [, b]) => b - a);
  const eliminated: string[] = [];
  for (let i = 0; i < sorted.length && eliminated.length < quizlingCount; i++) {
    if (eliminated.length === quizlingCount - 1) {
      const tiedCount = sorted.filter(([, c]) => c === sorted[i][1]).length;
      const alreadyAtThisCount = eliminated.filter(id => {
        const idx = sorted.findIndex(([sid]) => sid === id);
        return idx !== -1 && sorted[idx][1] === sorted[i][1];
      }).length;
      if (tiedCount - alreadyAtThisCount > 1) break;
    }
    eliminated.push(sorted[i][0]);
  }

  const quizlingsFound = eliminated.filter(id => quizlingIds.includes(id)).length;
  const quizlingsEscaped = quizlingIds.filter(id => !eliminated.includes(id)).length;

  score += quizlingsFound * 3;
  score -= quizlingsEscaped * 3;

  const lagnavnSuccess = game.lagnavn === game.quizlingLagnavnTarget;
  if (lagnavnSuccess) score -= 1;
  else score += 1;

  const winner = score >= 1 ? 'trofaste' : 'quizling';
  const durationSeconds = game.updatedAt && game.createdAt
    ? Math.round((game.updatedAt - game.createdAt) / 1000)
    : null;

  try {
    const sql = getSql();
    await sql`
      INSERT INTO game_stats (
        game_code, mode, player_count, quizling_count,
        total_questions, correct_answers, wrong_answers,
        score, winner, quizlings_found, quizlings_escaped,
        lagnavn_success, duration_seconds
      ) VALUES (
        ${game.code}, ${game.mode}, ${game.players.length}, ${quizlingCount},
        ${game.questions.length}, ${correctAnswers}, ${wrongAnswers},
        ${score}, ${winner}, ${quizlingsFound}, ${quizlingsEscaped},
        ${lagnavnSuccess}, ${durationSeconds}
      )
    `;
  } catch {
    // Silently fail — don't break the game
  }
}

export interface GameStatsOverview {
  totalGames: number;
  totalPlayers: number;
  avgScore: number;
  trofasteWins: number;
  quizlingWins: number;
  winRateByMode: { mode: string; total: number; trofaste_wins: number; quizling_wins: number }[];
  winRateByPlayerCount: { player_count: number; total: number; trofaste_wins: number; quizling_wins: number }[];
  avgCorrectAnswers: number;
  avgGameDuration: number;
  lagnavnSuccessRate: number;
  recentGames: { game_code: string; mode: string; player_count: number; score: number; winner: string; created_at: string }[];
}

export async function getGameStats(): Promise<GameStatsOverview | null> {
  if (!useDb()) return null;

  try {
    const sql = getSql();

    const [summary] = await sql`
      SELECT
        COUNT(*)::int as total_games,
        COALESCE(SUM(player_count), 0)::int as total_players,
        COALESCE(AVG(score), 0)::float as avg_score,
        COUNT(*) FILTER (WHERE winner = 'trofaste')::int as trofaste_wins,
        COUNT(*) FILTER (WHERE winner = 'quizling')::int as quizling_wins,
        COALESCE(AVG(correct_answers), 0)::float as avg_correct,
        COALESCE(AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL), 0)::float as avg_duration,
        COALESCE(AVG(CASE WHEN lagnavn_success THEN 1 ELSE 0 END), 0)::float as lagnavn_success_rate
      FROM game_stats
    ` as Record<string, unknown>[];

    const byMode = await sql`
      SELECT mode,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE winner = 'trofaste')::int as trofaste_wins,
        COUNT(*) FILTER (WHERE winner = 'quizling')::int as quizling_wins
      FROM game_stats
      GROUP BY mode
      ORDER BY mode
    ` as Record<string, unknown>[];

    const byPlayerCount = await sql`
      SELECT player_count,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE winner = 'trofaste')::int as trofaste_wins,
        COUNT(*) FILTER (WHERE winner = 'quizling')::int as quizling_wins
      FROM game_stats
      GROUP BY player_count
      ORDER BY player_count
    ` as Record<string, unknown>[];

    const recent = await sql`
      SELECT game_code, mode, player_count, score, winner, created_at
      FROM game_stats
      ORDER BY created_at DESC
      LIMIT 20
    ` as Record<string, unknown>[];

    return {
      totalGames: (summary?.total_games as number) ?? 0,
      totalPlayers: (summary?.total_players as number) ?? 0,
      avgScore: Math.round(((summary?.avg_score as number) ?? 0) * 10) / 10,
      trofasteWins: (summary?.trofaste_wins as number) ?? 0,
      quizlingWins: (summary?.quizling_wins as number) ?? 0,
      winRateByMode: (byMode as GameStatsOverview['winRateByMode']) ?? [],
      winRateByPlayerCount: (byPlayerCount as GameStatsOverview['winRateByPlayerCount']) ?? [],
      avgCorrectAnswers: Math.round(((summary?.avg_correct as number) ?? 0) * 10) / 10,
      avgGameDuration: Math.round((summary?.avg_duration as number) ?? 0),
      lagnavnSuccessRate: Math.round(((summary?.lagnavn_success_rate as number) ?? 0) * 100),
      recentGames: (recent as GameStatsOverview['recentGames']) ?? [],
    };
  } catch {
    return null;
  }
}
