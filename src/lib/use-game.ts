'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api-client';

const SEEN_HASHES_KEY = 'quizling-seen-hashes';
const MAX_SEEN_HASHES = 200;

function getSeenHashes(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_HASHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addSeenHashes(hashes: string[]): void {
  try {
    const existing = getSeenHashes();
    const merged = [...new Set([...existing, ...hashes])];
    // Keep only the most recent entries
    const trimmed = merged.slice(-MAX_SEEN_HASHES);
    localStorage.setItem(SEEN_HASHES_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable
  }
}

export interface GameView {
  code: string;
  phase: string;
  mode: 'short' | 'medium' | 'long';
  players: { id: string; name: string; isHost: boolean }[];
  hostId: string;
  isHost: boolean;
  isQuizling?: boolean;
  fellowQuizlings?: string[];
  quizlingCount: number;
  category?: string;
  lagnavn: string | null;
  lagnavnOptions?: string[];
  quizlingLagnavnTarget?: string;
  quizlingLagnavnSuccess?: boolean;
  currentQuestion?: { question: string; number: number };
  currentPowerQuestion?: { question: string; number: number };
  quizAnswers: Record<number, string>;
  powerAnswers: Record<number, Record<string, number>>;
  powerWinners: Record<number, string>;
  powerPins: Record<number, string>;
  votes: Record<string, string[]>;
  writerId: string;
  isWriter: boolean;
  confirmedRoles: string[];
  totalPlayers: number;
  currentAnswerForQuizling?: string;
  myPin?: string | null;
  pinReveal?: string | null;
  pinType?: string | null;
  canUsePin?: boolean;
  usedPinTypes?: string[];
  blackPinReveal?: string | null;
  blackPinQuestionIndex?: number;
  questionTexts?: string[];
  allQuestions?: { question: string; answer: string }[];
  allPowerQuestions?: { question: string; answer: string }[];
  quizlingIds?: string[];
  wonCurrentPowerRound?: boolean;
  isLastPowerRound?: boolean;
  totalQuestions: number;
  totalPowerQuestions: number;
  questionHashes: string[];
  fasitRevealCount: number;
  revealStep: number;
  questionStartedAt?: number | null;
  updatedAt: number;
}

interface Session {
  code: string;
  playerId: string;
  playerName: string;
}

export function useGame() {
  const [session, setSession] = useState<Session | null>(null);
  const [gameState, setGameState] = useState<GameView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const poll = useCallback(async () => {
    if (!session) return;
    try {
      const state = await api.getGameState(session.code, session.playerId) as unknown as GameView;
      // Only update if changed
      if (state.updatedAt !== lastUpdateRef.current) {
        lastUpdateRef.current = state.updatedAt;
        setGameState(state);
        // Persist question hashes for dedup across games
        if (state.questionHashes?.length) {
          addSeenHashes(state.questionHashes);
        }
      }
    } catch {
      // Silently ignore poll errors
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    poll(); // immediate first poll
    intervalRef.current = setInterval(poll, 1500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session, poll]);

  const create = async (hostName: string) => {
    setLoading(true);
    setError(null);
    try {
      const playerId = crypto.randomUUID().slice(0, 8);
      const code = await api.createGame(hostName, playerId);
      const s = { code, playerId, playerName: hostName };
      setSession(s);
      // Save to sessionStorage for reconnect
      sessionStorage.setItem('quizling-session', JSON.stringify(s));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const join = async (code: string, playerName: string) => {
    setLoading(true);
    setError(null);
    try {
      const playerId = crypto.randomUUID().slice(0, 8);
      await api.joinGame(code, playerName, playerId);
      const s = { code, playerId, playerName };
      setSession(s);
      sessionStorage.setItem('quizling-session', JSON.stringify(s));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await api.startGame(session.code, session.playerId, getSeenHashes());
      await poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const action = async (type: string, payload?: Record<string, unknown>) => {
    if (!session) return;
    try {
      // Optimistic update for instant-feel actions
      if (type === 'set-mode' && payload?.mode && gameState) {
        setGameState({ ...gameState, mode: payload.mode as GameView['mode'] });
      }
      // Include seen hashes when restarting to avoid duplicate questions
      const finalPayload = type === 'restart-game'
        ? { ...payload, seenHashes: getSeenHashes() }
        : payload;
      await api.sendAction(session.code, type, session.playerId, finalPayload);
      await poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
      // Revert optimistic update on error
      if (type === 'set-mode') await poll();
    }
  };

  const leave = () => {
    setSession(null);
    setGameState(null);
    sessionStorage.removeItem('quizling-session');
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Try to restore session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('quizling-session');
    if (saved) {
      try {
        const s = JSON.parse(saved) as Session;
        setSession(s);
      } catch {
        // ignore
      }
    }
  }, []);

  return {
    session,
    gameState,
    error,
    loading,
    create,
    join,
    start,
    action,
    leave,
    playerId: session?.playerId ?? null,
  };
}
