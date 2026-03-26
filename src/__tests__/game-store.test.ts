import { describe, it, expect, beforeEach } from 'vitest';
import { createGame, getGame, joinGame, startGame, processAction, getPlayerView } from '../lib/game-store';

describe('game-store', () => {
  let gameCode: string;
  const hostId = 'host-1';
  const hostName = 'Alice';

  beforeEach(async () => {
    const game = await createGame(hostName, hostId);
    gameCode = game.code;
  });

  describe('createGame', () => {
    it('creates a game with correct initial state', async () => {
      const game = await getGame(gameCode);
      expect(game).not.toBeNull();
      expect(game!.phase).toBe('lobby');
      expect(game!.players).toHaveLength(1);
      expect(game!.players[0].name).toBe(hostName);
      expect(game!.players[0].isHost).toBe(true);
      expect(game!.hostId).toBe(hostId);
      expect(game!.code).toMatch(/^\d{4}$/);
    });
  });

  describe('joinGame', () => {
    it('adds a player to the game', async () => {
      await joinGame(gameCode, 'Bob', 'player-2');
      const game = await getGame(gameCode);
      expect(game!.players).toHaveLength(2);
      expect(game!.players[1].name).toBe('Bob');
      expect(game!.players[1].isHost).toBe(false);
    });

    it('rejects duplicate names', async () => {
      await expect(joinGame(gameCode, 'Alice', 'player-2')).rejects.toThrow('Name already taken');
    });

    it('rejects joining a non-existent game', async () => {
      await expect(joinGame('9999', 'Bob', 'player-2')).rejects.toThrow('Game not found');
    });

    it('rejects joining a full game', async () => {
      for (let i = 2; i <= 9; i++) {
        await joinGame(gameCode, `Player${i}`, `p-${i}`);
      }
      await expect(joinGame(gameCode, 'Extra', 'p-10')).rejects.toThrow('Game is full');
    });

    it('rejects joining a started game', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await expect(joinGame(gameCode, 'Dave', 'p-4')).rejects.toThrow('Game already started');
    });
  });

  describe('startGame', () => {
    it('requires at least 3 players', async () => {
      await expect(startGame(gameCode, hostId)).rejects.toThrow('Need at least 3 players');
    });

    it('only host can start', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await expect(startGame(gameCode, 'p-2')).rejects.toThrow('Only host can start');
    });

    it('starts the game with proper setup', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = await getGame(gameCode);
      expect(game!.phase).toBe('rules');
      expect(game!.quizlingId).toBeTruthy();
      expect(game!.category).toBeTruthy();
      expect(game!.questions).toHaveLength(10);
      expect(game!.powerQuestions).toHaveLength(3);
      expect(game!.writerQueue).toHaveLength(3);
    });
  });

  describe('processAction', () => {
    beforeEach(async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      // Advance past rules screen
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
    });

    it('handles confirm-role and transitions to lagnavn', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });

      const game = await getGame(gameCode);
      expect(game!.phase).toBe('lagnavn');
    });

    it('handles submit-lagnavn', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });

      await processAction(gameCode, {
        type: 'submit-lagnavn',
        playerId: hostId,
        payload: { lagnavn: 'Team Awesome' },
      });

      const game = await getGame(gameCode);
      expect(game!.lagnavn).toBe('Team Awesome');
      expect(game!.phase).toBe('lagnavn-confirmed');
    });

    it('non-host cannot submit lagnavn', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });

      await expect(
        processAction(gameCode, {
          type: 'submit-lagnavn',
          playerId: 'p-2',
          payload: { lagnavn: 'Hack' },
        })
      ).rejects.toThrow('Only host can submit');
    });

    it('handles advance-phase from lagnavn-confirmed to quiz-0', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      await processAction(gameCode, {
        type: 'submit-lagnavn',
        playerId: hostId,
        payload: { lagnavn: 'Team' },
      });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      const game = await getGame(gameCode);
      expect(game!.phase).toBe('quiz-0');
    });

    it('handles power answer submission and winner calculation', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: 'T' } });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      // Quiz 0-2 (before first power break at index 3)
      for (let i = 0; i < 3; i++) {
        await processAction(gameCode, { type: 'submit-quiz-answer', playerId: hostId, payload: { answer: 'test' } });
        await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      }

      // Now at power-q-0
      await processAction(gameCode, { type: 'submit-power-answer', playerId: hostId, payload: { answer: 460 } });
      await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-2', payload: { answer: 500 } });
      await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-3', payload: { answer: 300 } });

      const game = await getGame(gameCode);
      expect(game!.phase).toBe('power-result-0');
      expect(game!.powerWinners[0]).toBe(hostId);
    });

    it('handles voting and transition to reveal (long mode)', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: 'T' } });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      // Long mode flow: Q0-Q2 → PQ0 → Q3-Q5 → PQ1 → Q6-Q8 → PQ2 → Q9 → voting

      const submitPower = async () => {
        await processAction(gameCode, { type: 'submit-power-answer', playerId: hostId, payload: { answer: 100 } });
        await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-2', payload: { answer: 200 } });
        await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-3', payload: { answer: 300 } });
        await processAction(gameCode, { type: 'advance-phase', playerId: hostId }); // advance past power-result
      };

      const submitQuiz = async () => {
        await processAction(gameCode, { type: 'submit-quiz-answer', playerId: hostId, payload: { answer: 'test' } });
        await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      };

      // Q0, Q1, Q2
      for (let i = 0; i < 3; i++) await submitQuiz();
      // PQ0
      await submitPower();
      // Q3, Q4, Q5
      for (let i = 0; i < 3; i++) await submitQuiz();
      // PQ1
      await submitPower();
      // Q6, Q7, Q8
      for (let i = 0; i < 3; i++) await submitQuiz();
      // PQ2
      await submitPower();
      // Q9
      await submitQuiz();

      // Should be at voting
      let game = await getGame(gameCode);
      expect(game!.phase).toBe('voting');

      // Votes
      await processAction(gameCode, { type: 'submit-vote', playerId: hostId, payload: { targetId: 'p-2' } });
      await processAction(gameCode, { type: 'submit-vote', playerId: 'p-2', payload: { targetId: 'p-3' } });
      await processAction(gameCode, { type: 'submit-vote', playerId: 'p-3', payload: { targetId: 'p-2' } });

      game = await getGame(gameCode);
      expect(game!.phase).toBe('reveal');
    });

    it('handles short mode (4Q, 2PQ)', async () => {
      // Set mode to short before starting (need a fresh game)
      const freshGame = await createGame('Host2', 'h2');
      const fc = freshGame.code;
      await joinGame(fc, 'B2', 'p2-2');
      await joinGame(fc, 'C2', 'p2-3');
      await processAction(fc, { type: 'set-mode', playerId: 'h2', payload: { mode: 'short' } });
      await startGame(fc, 'h2');

      let game = await getGame(fc);
      expect(game!.questions).toHaveLength(4);
      expect(game!.powerQuestions).toHaveLength(2);

      // Advance past rules
      await processAction(fc, { type: 'advance-phase', playerId: 'h2' });
      // Confirm roles
      await processAction(fc, { type: 'confirm-role', playerId: 'h2' });
      await processAction(fc, { type: 'confirm-role', playerId: 'p2-2' });
      await processAction(fc, { type: 'confirm-role', playerId: 'p2-3' });
      // Submit lagnavn
      await processAction(fc, { type: 'submit-lagnavn', playerId: 'h2', payload: { lagnavn: 'T' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h2' });

      // Short mode flow: Q0 → PQ0 → Q1, Q2 → PQ1 → Q3 → voting
      // Q0
      await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h2', payload: { answer: 'a' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h2' });

      game = await getGame(fc);
      expect(game!.phase).toBe('power-q-0');

      // PQ0
      await processAction(fc, { type: 'submit-power-answer', playerId: 'h2', payload: { answer: 100 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'p2-2', payload: { answer: 200 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'p2-3', payload: { answer: 300 } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h2' });

      // Q1, Q2
      for (let i = 0; i < 2; i++) {
        await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h2', payload: { answer: 'a' } });
        await processAction(fc, { type: 'advance-phase', playerId: 'h2' });
      }

      game = await getGame(fc);
      expect(game!.phase).toBe('power-q-1');

      // PQ1
      await processAction(fc, { type: 'submit-power-answer', playerId: 'h2', payload: { answer: 100 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'p2-2', payload: { answer: 200 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'p2-3', payload: { answer: 300 } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h2' });

      // Q3
      await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h2', payload: { answer: 'a' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h2' });

      game = await getGame(fc);
      expect(game!.phase).toBe('voting');
    });
  });

  describe('getPlayerView', () => {
    it('hides quizling identity from non-quizling players', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      const quizlingId = game.quizlingId!;
      const nonQuizlingId = game.players.find(p => p.id !== quizlingId)!.id;

      const view = getPlayerView(game, nonQuizlingId);
      expect(view.isQuizling).toBe(false);
      expect(view.answerSheet).toBeUndefined();
      expect(view.category).toBeUndefined();
    });

    it('shows quizling info to quizling player', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      const quizlingId = game.quizlingId!;

      const view = getPlayerView(game, quizlingId);
      expect(view.isQuizling).toBe(true);
      expect(view.answerSheet).toBeDefined();
      expect(view.category).toBeTruthy();
    });
  });
});
