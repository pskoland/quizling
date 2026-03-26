'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api-client';

export interface GameView {
  code: string;
  phase: string;
  mode: 'short' | 'medium' | 'long';
  players: { id: string; name: string; isHost: boolean }[];
  hostId: string;
  isHost: boolean;
  isQuizling?: boolean;
  category?: string;
  lagnavn: string | null;
  currentQuestion?: { question: string; number: number };
  currentPowerQuestion?: { question: string; number: number };
  quizAnswers: Record<number, string>;
  powerAnswers: Record<number, Record<string, number>>;
  powerWinners: Record<number, string>;
  powerPins: Record<string, string>;
  votes: Record<string, string>;
  writerId: string;
  isWriter: boolean;
  confirmedRoles: string[];
  totalPlayers: number;
  answerSheet?: string[];
  myPin?: string | null;
  pinReveal?: string | null;
  allQuestions?: { question: string; answer: string }[];
  allPowerQuestions?: { question: string; answer: string }[];
  quizlingId?: string;
  wonPowerRound?: number;
  totalQuestions: number;
  totalPowerQuestions: number;
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
      await api.startGame(session.code, session.playerId);
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
      await api.sendAction(session.code, type, session.playerId, payload);
      await poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
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
