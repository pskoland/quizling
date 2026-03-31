import { describe, it, expect, beforeEach } from 'vitest';
import { createGame, getGame, joinGame, startGame, processAction, getPlayerView, getQuizlingCount } from '../lib/game-store';

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
      expect(game!.quizlingIds.length).toBeGreaterThan(0);
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

      let game = await getGame(gameCode);
      const chosenName = game!.lagnavnOptions[0];
      await processAction(gameCode, {
        type: 'submit-lagnavn',
        playerId: hostId,
        payload: { lagnavn: chosenName },
      });

      game = await getGame(gameCode);
      expect(game!.lagnavn).toBe(chosenName);
      expect(game!.phase).toBe('lagnavn-confirmed');
    });

    it('non-host cannot submit lagnavn', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });

      const game = await getGame(gameCode);
      await expect(
        processAction(gameCode, {
          type: 'submit-lagnavn',
          playerId: 'p-2',
          payload: { lagnavn: game!.lagnavnOptions[0] },
        })
      ).rejects.toThrow('Only host can submit');
    });

    it('handles advance-phase from lagnavn-confirmed to quiz-0', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      let game = await getGame(gameCode);
      await processAction(gameCode, {
        type: 'submit-lagnavn',
        playerId: hostId,
        payload: { lagnavn: game!.lagnavnOptions[0] },
      });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      game = await getGame(gameCode);
      expect(game!.phase).toBe('quiz-0');
    });

    it('handles power answer submission and winner calculation', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      let game = await getGame(gameCode);
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: game!.lagnavnOptions[0] } });
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

      game = await getGame(gameCode);
      expect(game!.phase).toBe('power-result-0');
      expect(game!.powerWinners[0]).toBe(hostId);
    });

    it('handles voting and transition to reveal (long mode)', async () => {
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      let game = await getGame(gameCode);
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: game!.lagnavnOptions[0] } });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      // Long mode flow: Q0-Q2 → PQ0 → Q3-Q5 → PQ1 → Q6-Q8 → PQ2 → Q9 → voting

      let pinIndex = 0;
      const pins = ['blue', 'white', 'blue']; // cycle through pins for each power round
      const submitPower = async () => {
        await processAction(gameCode, { type: 'submit-power-answer', playerId: hostId, payload: { answer: 100 } });
        await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-2', payload: { answer: 200 } });
        await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-3', payload: { answer: 300 } });
        // Winner (closest to correct) must choose pin before advancing
        const g = await getGame(gameCode);
        const round = g!.phase.match(/^power-result-(\d+)$/)?.[1];
        const winnerId = g!.powerWinners[Number(round)];
        await processAction(gameCode, { type: 'choose-pin', playerId: winnerId, payload: { pin: pins[pinIndex++] } });
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
      game = await getGame(gameCode);
      expect(game!.phase).toBe('voting');

      // Votes
      await processAction(gameCode, { type: 'submit-vote', playerId: hostId, payload: { targetIds: ['p-2'] } });
      await processAction(gameCode, { type: 'submit-vote', playerId: 'p-2', payload: { targetIds: ['p-3'] } });
      await processAction(gameCode, { type: 'submit-vote', playerId: 'p-3', payload: { targetIds: ['p-2'] } });

      game = await getGame(gameCode);
      expect(game!.phase).toBe('fasit');
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
      game = await getGame(fc);
      await processAction(fc, { type: 'submit-lagnavn', playerId: 'h2', payload: { lagnavn: game!.lagnavnOptions[0] } });
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
      // Winner must choose pin before advancing
      game = await getGame(fc);
      const winner0 = game!.powerWinners[0];
      await processAction(fc, { type: 'choose-pin', playerId: winner0, payload: { pin: 'blue' } });
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
      // Winner must choose pin before advancing
      game = await getGame(fc);
      const winner1 = game!.powerWinners[1];
      await processAction(fc, { type: 'choose-pin', playerId: winner1, payload: { pin: 'white' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h2' });

      // Q3
      await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h2', payload: { answer: 'a' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h2' });

      game = await getGame(fc);
      expect(game!.phase).toBe('voting');
    });
  });

  describe('voting rules', () => {
    it('rejects voting for yourself', async () => {
      // Fast-forward to voting (short mode for brevity)
      // We'll directly set up a voting scenario by manipulating game through actions
      // For this test, use a fresh short game
      const freshGame = await createGame('H', 'h-vote');
      const fc = freshGame.code;
      await joinGame(fc, 'B', 'v-2');
      await joinGame(fc, 'C', 'v-3');
      await processAction(fc, { type: 'set-mode', playerId: 'h-vote', payload: { mode: 'short' } });
      await startGame(fc, 'h-vote');
      await processAction(fc, { type: 'advance-phase', playerId: 'h-vote' }); // rules
      await processAction(fc, { type: 'confirm-role', playerId: 'h-vote' });
      await processAction(fc, { type: 'confirm-role', playerId: 'v-2' });
      await processAction(fc, { type: 'confirm-role', playerId: 'v-3' });
      let g = await getGame(fc);
      await processAction(fc, { type: 'submit-lagnavn', playerId: 'h-vote', payload: { lagnavn: g!.lagnavnOptions[0] } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h-vote' });

      // Q0
      await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h-vote', payload: { answer: 'a' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h-vote' });
      // PQ0
      await processAction(fc, { type: 'submit-power-answer', playerId: 'h-vote', payload: { answer: 100 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'v-2', payload: { answer: 200 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'v-3', payload: { answer: 300 } });
      g = await getGame(fc);
      await processAction(fc, { type: 'choose-pin', playerId: g!.powerWinners[0], payload: { pin: 'blue' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h-vote' });
      // Q1, Q2
      for (let i = 0; i < 2; i++) {
        await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h-vote', payload: { answer: 'a' } });
        await processAction(fc, { type: 'advance-phase', playerId: 'h-vote' });
      }
      // PQ1
      await processAction(fc, { type: 'submit-power-answer', playerId: 'h-vote', payload: { answer: 100 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'v-2', payload: { answer: 200 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'v-3', payload: { answer: 300 } });
      g = await getGame(fc);
      await processAction(fc, { type: 'choose-pin', playerId: g!.powerWinners[1], payload: { pin: 'white' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h-vote' });
      // Q3
      await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h-vote', payload: { answer: 'a' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h-vote' });

      // Now at voting
      const game = await getGame(fc);
      expect(game!.phase).toBe('voting');

      // Try voting for yourself
      await expect(
        processAction(fc, { type: 'submit-vote', playerId: 'h-vote', payload: { targetIds: ['h-vote'] } })
      ).rejects.toThrow('Cannot vote for yourself');
    });
  });

  describe('getPlayerView', () => {
    it('hides quizling identity from non-quizling players', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      const quizlingId = game.quizlingIds[0];
      const nonQuizlingId = game.players.find(p => !game.quizlingIds.includes(p.id))!.id;

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
      const quizlingId = game.quizlingIds[0];

      // In rules phase, category is hidden
      const viewRules = getPlayerView(game, quizlingId);
      expect(viewRules.isQuizling).toBe(true);

      // Advance to role-reveal to see category
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      const game2 = (await getGame(gameCode))!;
      const viewReveal = getPlayerView(game2, quizlingId);
      expect(viewReveal.isQuizling).toBe(true);
      expect(viewReveal.category).toBeTruthy();
    });

    it('provides per-question answer to quizling during quiz phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      const quizlingId = game.quizlingIds[0];

      // Advance to role-reveal, confirm roles, submit lagnavn, advance to quiz-0
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      let gameForLagnavn = await getGame(gameCode);
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: gameForLagnavn!.lagnavnOptions[0] } });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      const gameQ0 = (await getGame(gameCode))!;
      expect(gameQ0.phase).toBe('quiz-0');
      const view = getPlayerView(gameQ0, quizlingId);
      expect(view.currentAnswerForQuizling).toBe(gameQ0.questions[0].answer);
    });
  });

  describe('new actions', () => {
    it('reveal-fasit-question increments fasitRevealCount', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      // Fast-forward to fasit by directly setting phase (use in-memory store)
      const game = (await getGame(gameCode))!;
      game.phase = 'fasit';
      game.fasitRevealCount = 0;
      // Save directly (in-memory)
      await processAction(gameCode, { type: 'reveal-fasit-question', playerId: hostId });
      const updated = (await getGame(gameCode))!;
      expect(updated.fasitRevealCount).toBe(1);
    });

    it('advance-reveal-step increments revealStep', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'reveal';
      game.revealStep = 0;
      await processAction(gameCode, { type: 'advance-reveal-step', playerId: hostId });
      const updated = (await getGame(gameCode))!;
      expect(updated.revealStep).toBe(1);
    });

    it('restart avoids same quizling twice in a row', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game1 = (await getGame(gameCode))!;
      const firstQuizlings = game1.quizlingIds;

      // Restart multiple times and check that quizling changes at least once
      let changed = false;
      for (let i = 0; i < 10; i++) {
        await processAction(gameCode, { type: 'restart-game', playerId: hostId });
        const g = (await getGame(gameCode))!;
        const overlap = g.quizlingIds.some((id: string) => firstQuizlings.includes(id));
        if (!overlap) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);
    });

    it('black pin usable during voting phase to see team answer', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.powerPins[hostId] = 'black';
      game.quizAnswers = { 0: 'TestAnswer', 1: 'AnotherAnswer' };

      // Not usable during quiz phase
      game.phase = 'quiz-1';
      let view = getPlayerView(game, hostId);
      expect(view.canUsePin).toBe(false);

      // Usable during voting
      game.phase = 'voting';
      view = getPlayerView(game, hostId);
      expect(view.canUsePin).toBe(true);

      // After activation: see chosen question's answer
      game.pinUsedAt = { [hostId]: 0 };
      view = getPlayerView(game, hostId);
      expect(view.blackPinReveal).toBe('TestAnswer');
      expect(view.pinType).toBe('black');
    });
  });

  describe('reveal-fasit-question action', () => {
    it('rejects non-host from revealing fasit', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'fasit';
      game.fasitRevealCount = 0;

      await expect(
        processAction(gameCode, { type: 'reveal-fasit-question', playerId: 'p-2' })
      ).rejects.toThrow('Only host can reveal');
    });

    it('rejects revealing fasit outside fasit phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      await expect(
        processAction(gameCode, { type: 'reveal-fasit-question', playerId: hostId })
      ).rejects.toThrow('Not in fasit phase');
    });

    it('increments fasitRevealCount multiple times', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'fasit';
      game.fasitRevealCount = 0;

      await processAction(gameCode, { type: 'reveal-fasit-question', playerId: hostId });
      await processAction(gameCode, { type: 'reveal-fasit-question', playerId: hostId });
      await processAction(gameCode, { type: 'reveal-fasit-question', playerId: hostId });

      const updated = (await getGame(gameCode))!;
      expect(updated.fasitRevealCount).toBe(3);
    });
  });

  describe('advance-reveal-step action', () => {
    it('rejects non-host from advancing reveal', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'reveal';
      game.revealStep = 0;

      await expect(
        processAction(gameCode, { type: 'advance-reveal-step', playerId: 'p-2' })
      ).rejects.toThrow('Only host can advance');
    });

    it('rejects advancing reveal outside reveal phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      await expect(
        processAction(gameCode, { type: 'advance-reveal-step', playerId: hostId })
      ).rejects.toThrow('Not in reveal phase');
    });

    it('increments revealStep through all steps', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'reveal';
      game.revealStep = 0;

      for (let i = 0; i < 5; i++) {
        await processAction(gameCode, { type: 'advance-reveal-step', playerId: hostId });
      }
      const updated = (await getGame(gameCode))!;
      expect(updated.revealStep).toBe(5);
    });
  });

  describe('set-mode action', () => {
    it('rejects non-host from setting mode', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await expect(
        processAction(gameCode, { type: 'set-mode', playerId: 'p-2', payload: { mode: 'short' } })
      ).rejects.toThrow('Only host can set mode');
    });

    it('rejects setting mode after game started', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      await expect(
        processAction(gameCode, { type: 'set-mode', playerId: hostId, payload: { mode: 'short' } })
      ).rejects.toThrow('Can only set mode in lobby');
    });

    it('sets mode to medium', async () => {
      await processAction(gameCode, { type: 'set-mode', playerId: hostId, payload: { mode: 'medium' } });
      const game = await getGame(gameCode);
      expect(game!.mode).toBe('medium');
    });
  });

  describe('confirm-role action', () => {
    it('ignores duplicate confirmations', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });

      const game = await getGame(gameCode);
      expect(game!.confirmedRoles.filter(id => id === hostId)).toHaveLength(1);
    });

    it('does not transition until all players confirm', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });

      const game = await getGame(gameCode);
      expect(game!.phase).toBe('role-reveal');
      expect(game!.confirmedRoles).toHaveLength(2);
    });
  });

  describe('advance-phase transitions', () => {
    it('rules -> role-reveal', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = await getGame(gameCode);
      expect(game!.phase).toBe('rules');

      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      const updated = await getGame(gameCode);
      expect(updated!.phase).toBe('role-reveal');
    });

    it('rejects non-host from advancing phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      await expect(
        processAction(gameCode, { type: 'advance-phase', playerId: 'p-2' })
      ).rejects.toThrow('Only host can advance');
    });

    it('sets questionStartedAt when entering quiz phase from lagnavn-confirmed', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      let game = await getGame(gameCode);
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: game!.lagnavnOptions[0] } });

      const before = Date.now();
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      const after = Date.now();

      game = await getGame(gameCode);
      expect(game!.phase).toBe('quiz-0');
      expect(game!.questionStartedAt).toBeGreaterThanOrEqual(before);
      expect(game!.questionStartedAt).toBeLessThanOrEqual(after);
    });

    it('sets questionStartedAt when advancing between quiz questions', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      let game = await getGame(gameCode);
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: game!.lagnavnOptions[0] } });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId }); // -> quiz-0

      await processAction(gameCode, { type: 'submit-quiz-answer', playerId: hostId, payload: { answer: 'x' } });
      const before = Date.now();
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId }); // -> quiz-1
      const after = Date.now();

      game = await getGame(gameCode);
      expect(game!.phase).toBe('quiz-1');
      expect(game!.questionStartedAt).toBeGreaterThanOrEqual(before);
      expect(game!.questionStartedAt).toBeLessThanOrEqual(after);
    });

    it('resets fasitRevealCount when entering fasit after voting', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      // Manually put into voting and trigger fasit transition
      game.phase = 'voting';
      game.votes = {};
      game.fasitRevealCount = 99; // stale value from previous round

      // All vote to trigger auto-transition to fasit
      await processAction(gameCode, { type: 'submit-vote', playerId: hostId, payload: { targetIds: ['p-2'] } });
      await processAction(gameCode, { type: 'submit-vote', playerId: 'p-2', payload: { targetIds: ['p-3'] } });
      await processAction(gameCode, { type: 'submit-vote', playerId: 'p-3', payload: { targetIds: [hostId] } });

      const updated = (await getGame(gameCode))!;
      expect(updated.phase).toBe('fasit');
    });

    it('power-result requires pin choice before advancing', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      let game = await getGame(gameCode);
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: game!.lagnavnOptions[0] } });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      // Quiz 0-2
      for (let i = 0; i < 3; i++) {
        await processAction(gameCode, { type: 'submit-quiz-answer', playerId: hostId, payload: { answer: 'x' } });
        await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      }

      // Power-q-0: all answer
      await processAction(gameCode, { type: 'submit-power-answer', playerId: hostId, payload: { answer: 460 } });
      await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-2', payload: { answer: 500 } });
      await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-3', payload: { answer: 300 } });

      game = await getGame(gameCode);
      expect(game!.phase).toBe('power-result-0');

      // Try to advance without choosing pin
      await expect(
        processAction(gameCode, { type: 'advance-phase', playerId: hostId })
      ).rejects.toThrow('Winner must choose a pin before advancing');
    });
  });

  describe('getPlayerView security', () => {
    it('hides quiz answers from non-writers during quiz phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      let game = await getGame(gameCode);
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: game!.lagnavnOptions[0] } });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      // Submit an answer
      await processAction(gameCode, { type: 'submit-quiz-answer', playerId: hostId, payload: { answer: 'secret' } });

      game = (await getGame(gameCode))!;
      const writerId = game!.writerQueue[0 % game!.writerQueue.length];
      const nonWriterId = game!.players.find(p => p.id !== writerId)!.id;

      const writerView = getPlayerView(game, writerId);
      const nonWriterView = getPlayerView(game, nonWriterId);

      // Writer can see the actual answer
      expect(writerView.quizAnswers[0]).toBe('secret');
      // Non-writer sees masked answer
      expect(nonWriterView.quizAnswers[0]).toBe('***');
    });

    it('shows quizAnswers to everyone during fasit phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'fasit';
      game.quizAnswers = { 0: 'answer1', 1: 'answer2' };

      const view = getPlayerView(game, 'p-2');
      expect(view.quizAnswers[0]).toBe('answer1');
    });

    it('does not expose quizlingIds during quiz phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'quiz-0';

      const view = getPlayerView(game, 'p-2');
      expect(view.quizlingIds).toBeUndefined();
    });

    it('exposes quizlingIds during fasit/reveal/result phases', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      for (const phase of ['fasit', 'reveal', 'result'] as const) {
        game.phase = phase;
        const view = getPlayerView(game, 'p-2');
        expect(view.quizlingIds).toEqual(game.quizlingIds);
      }
    });

    it('does not expose isQuizling during lobby', async () => {
      const game = (await getGame(gameCode))!;
      const view = getPlayerView(game, hostId);
      expect(view.isQuizling).toBeUndefined();
    });

    it('does not expose category to non-quizling', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'role-reveal';
      const nonQuizling = game.players.find(p => !game.quizlingIds.includes(p.id))!.id;

      const view = getPlayerView(game, nonQuizling);
      expect(view.category).toBeUndefined();
    });
  });

  describe('pin reveal logic', () => {
    let setupGame: () => Promise<{ code: string; players: string[] }>;

    beforeEach(() => {
      setupGame = async () => {
        const g = await createGame('H', 'pin-h');
        await joinGame(g.code, 'B', 'pin-2');
        await joinGame(g.code, 'C', 'pin-3');
        await startGame(g.code, 'pin-h');
        return { code: g.code, players: ['pin-h', 'pin-2', 'pin-3'] };
      };
    });

    it('blue pin reveals answer only on last question', async () => {
      const { code } = await setupGame();
      const game = (await getGame(code))!;
      game.powerPins['pin-h'] = 'blue';

      // Not last question -> no reveal
      game.phase = 'quiz-0';
      let view = getPlayerView(game, 'pin-h');
      expect(view.pinReveal).toBeNull();

      // Last question -> reveal
      game.phase = `quiz-${game.questions.length - 1}`;
      view = getPlayerView(game, 'pin-h');
      expect(view.pinReveal).toBe(game.questions[game.questions.length - 1].answer);
      expect(view.pinType).toBe('blue');
    });

    it('white pin requires activation before revealing', async () => {
      const { code } = await setupGame();
      const game = (await getGame(code))!;
      game.powerPins['pin-h'] = 'white';

      // First question -> no previous, no reveal, no canUsePin
      game.phase = 'quiz-0';
      let view = getPlayerView(game, 'pin-h');
      expect(view.pinReveal).toBeNull();
      expect(view.canUsePin).toBe(false);

      // Second question -> not yet used, canUsePin = true
      game.phase = 'quiz-1';
      view = getPlayerView(game, 'pin-h');
      expect(view.pinReveal).toBeNull();
      expect(view.canUsePin).toBe(true);

      // Activate the pin on quiz-1
      game.pinUsedAt = { 'pin-h': 1 };
      view = getPlayerView(game, 'pin-h');
      expect(view.pinReveal).toBe(game.questions[0].answer);
      expect(view.pinType).toBe('white');
      expect(view.canUsePin).toBe(false);
    });

    it('black pin reveals nothing when no previous answer submitted', async () => {
      const { code } = await setupGame();
      const game = (await getGame(code))!;
      game.powerPins['pin-h'] = 'black';
      game.phase = 'quiz-1';
      game.quizAnswers = {}; // no answer for q0

      const view = getPlayerView(game, 'pin-h');
      expect(view.pinReveal).toBeNull();
    });

    it('no pin reveal when player has no pin', async () => {
      const { code } = await setupGame();
      const game = (await getGame(code))!;
      game.phase = 'quiz-5';
      game.quizAnswers = { 4: 'something' };

      const view = getPlayerView(game, 'pin-h');
      expect(view.pinReveal).toBeNull();
      expect(view.pinType).toBeNull();
    });

    it('no pin reveal outside quiz phase', async () => {
      const { code } = await setupGame();
      const game = (await getGame(code))!;
      game.powerPins['pin-h'] = 'blue';
      game.phase = 'voting';

      const view = getPlayerView(game, 'pin-h');
      expect(view.pinReveal).toBeNull();
    });
  });

  describe('per-question answer for quizling', () => {
    it('does not provide answer outside quiz phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      const quizlingId = game.quizlingIds[0];

      game.phase = 'voting';
      const view = getPlayerView(game, quizlingId);
      expect(view.currentAnswerForQuizling).toBeUndefined();
    });

    it('does not provide answer to non-quizling', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      const nonQuizling = game.players.find(p => !game.quizlingIds.includes(p.id))!.id;

      game.phase = 'quiz-0';
      const view = getPlayerView(game, nonQuizling);
      expect(view.currentAnswerForQuizling).toBeUndefined();
    });

    it('provides correct answer for each quiz index', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      const quizlingId = game.quizlingIds[0];

      for (let i = 0; i < Math.min(3, game.questions.length); i++) {
        game.phase = `quiz-${i}`;
        const view = getPlayerView(game, quizlingId);
        expect(view.currentAnswerForQuizling).toBe(game.questions[i].answer);
      }
    });
  });

  describe('restart-game action', () => {
    it('rejects non-host from restarting', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      await expect(
        processAction(gameCode, { type: 'restart-game', playerId: 'p-2' })
      ).rejects.toThrow('Only host can restart');
    });

    it('resets all game state on restart', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.lagnavn = 'TestTeam';
      game.quizAnswers = { 0: 'a', 1: 'b' };
      game.votes = { [hostId]: ['p-2'] };
      game.powerPins[hostId] = 'blue';
      game.fasitRevealCount = 5;
      game.revealStep = 3;

      await processAction(gameCode, { type: 'restart-game', playerId: hostId });
      const fresh = (await getGame(gameCode))!;

      expect(fresh.phase).toBe('rules');
      expect(fresh.lagnavn).toBeNull();
      expect(fresh.quizAnswers).toEqual({});
      expect(fresh.votes).toEqual({});
      expect(fresh.powerPins).toEqual({});
      expect(fresh.fasitRevealCount).toBe(0);
      expect(fresh.revealStep).toBe(0);
      expect(fresh.questionStartedAt).toBeNull();
      expect(fresh.confirmedRoles).toEqual([]);
      expect(fresh.quizlingIds.length).toBeGreaterThan(0);
      expect(fresh.questions.length).toBeGreaterThan(0);
    });

    it('preserves players on restart', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      await processAction(gameCode, { type: 'restart-game', playerId: hostId });
      const game = (await getGame(gameCode))!;

      expect(game.players).toHaveLength(3);
      expect(game.players.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(game.hostId).toBe(hostId);
    });

    it('sets previousQuizlingIds on restart', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game1 = (await getGame(gameCode))!;
      const firstQuizlings = game1.quizlingIds;

      await processAction(gameCode, { type: 'restart-game', playerId: hostId });
      const game2 = (await getGame(gameCode))!;

      expect(game2.previousQuizlingIds).toEqual(firstQuizlings);
    });
  });

  describe('medium mode flow', () => {
    it('follows correct phase sequence (6Q, 2PQ)', async () => {
      const freshGame = await createGame('Host3', 'h3');
      const fc = freshGame.code;
      await joinGame(fc, 'B3', 'p3-2');
      await joinGame(fc, 'C3', 'p3-3');
      await processAction(fc, { type: 'set-mode', playerId: 'h3', payload: { mode: 'medium' } });
      await startGame(fc, 'h3');

      let game = await getGame(fc);
      expect(game!.questions).toHaveLength(6);
      expect(game!.powerQuestions).toHaveLength(2);

      // Advance through rules -> role-reveal -> lagnavn -> quiz
      await processAction(fc, { type: 'advance-phase', playerId: 'h3' });
      await processAction(fc, { type: 'confirm-role', playerId: 'h3' });
      await processAction(fc, { type: 'confirm-role', playerId: 'p3-2' });
      await processAction(fc, { type: 'confirm-role', playerId: 'p3-3' });
      game = await getGame(fc);
      await processAction(fc, { type: 'submit-lagnavn', playerId: 'h3', payload: { lagnavn: game!.lagnavnOptions[0] } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h3' });

      // Medium: powerBefore = [2, 5]
      // Q0, Q1
      for (let i = 0; i < 2; i++) {
        await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h3', payload: { answer: 'a' } });
        await processAction(fc, { type: 'advance-phase', playerId: 'h3' });
      }

      game = await getGame(fc);
      expect(game!.phase).toBe('power-q-0');

      // PQ0
      await processAction(fc, { type: 'submit-power-answer', playerId: 'h3', payload: { answer: 100 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'p3-2', payload: { answer: 200 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'p3-3', payload: { answer: 300 } });
      game = await getGame(fc);
      await processAction(fc, { type: 'choose-pin', playerId: game!.powerWinners[0], payload: { pin: 'black' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h3' });

      // Q2, Q3, Q4
      for (let i = 0; i < 3; i++) {
        await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h3', payload: { answer: 'a' } });
        await processAction(fc, { type: 'advance-phase', playerId: 'h3' });
      }

      game = await getGame(fc);
      expect(game!.phase).toBe('power-q-1');

      // PQ1
      await processAction(fc, { type: 'submit-power-answer', playerId: 'h3', payload: { answer: 100 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'p3-2', payload: { answer: 200 } });
      await processAction(fc, { type: 'submit-power-answer', playerId: 'p3-3', payload: { answer: 300 } });
      game = await getGame(fc);
      await processAction(fc, { type: 'choose-pin', playerId: game!.powerWinners[1], payload: { pin: 'white' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h3' });

      // Q5
      await processAction(fc, { type: 'submit-quiz-answer', playerId: 'h3', payload: { answer: 'a' } });
      await processAction(fc, { type: 'advance-phase', playerId: 'h3' });

      game = await getGame(fc);
      expect(game!.phase).toBe('voting');
    });
  });

  describe('createGame initial state', () => {
    it('initializes new state fields', async () => {
      const game = await getGame(gameCode);
      expect(game!.fasitRevealCount).toBe(0);
      expect(game!.revealStep).toBe(0);
      expect(game!.previousQuizlingIds).toEqual([]);
      expect(game!.questionStartedAt).toBeNull();
    });
  });

  describe('joinGame edge cases', () => {
    it('rejects case-insensitive duplicate names', async () => {
      await expect(joinGame(gameCode, 'alice', 'p-2')).rejects.toThrow('Name already taken');
      await expect(joinGame(gameCode, 'ALICE', 'p-3')).rejects.toThrow('Name already taken');
    });
  });

  describe('calcPowerWinner', () => {
    it('picks the player closest to correct answer', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });
      let game = await getGame(gameCode);
      await processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: game!.lagnavnOptions[0] } });
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });

      // Q0-Q2
      for (let i = 0; i < 3; i++) {
        await processAction(gameCode, { type: 'submit-quiz-answer', playerId: hostId, payload: { answer: 'x' } });
        await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      }

      // Power question - p-3 is furthest away, p-2 guesses exactly 0 off
      game = (await getGame(gameCode))!;
      const correctAnswer = Number(game!.powerQuestions[0].answer);

      await processAction(gameCode, { type: 'submit-power-answer', playerId: hostId, payload: { answer: correctAnswer + 50 } });
      await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-2', payload: { answer: correctAnswer } });
      await processAction(gameCode, { type: 'submit-power-answer', playerId: 'p-3', payload: { answer: correctAnswer + 1000 } });

      const updated = (await getGame(gameCode))!;
      expect(updated.powerWinners[0]).toBe('p-2');
    });
  });

  describe('getPlayerView fields', () => {
    it('includes totalQuestions and totalPowerQuestions', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      const view = getPlayerView(game, hostId);
      expect(view.totalQuestions).toBe(10);
      expect(view.totalPowerQuestions).toBe(3);
    });

    it('includes fasitRevealCount and revealStep', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      const view = getPlayerView(game, hostId);
      expect(view.fasitRevealCount).toBe(0);
      expect(view.revealStep).toBe(0);
    });

    it('exposes allQuestions during power-result phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'power-result-0';

      const view = getPlayerView(game, hostId);
      expect(view.allPowerQuestions).toBeDefined();
      // quizlingIds should NOT be exposed during power-result
      expect(view.quizlingIds).toBeUndefined();
    });

    it('includes lagnavn', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.lagnavn = 'MyTeam';
      const view = getPlayerView(game, hostId);
      expect(view.lagnavn).toBe('MyTeam');
    });

    it('identifies writer correctly based on writerQueue rotation', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);

      const game = (await getGame(gameCode))!;
      game.phase = 'quiz-0';

      const expectedWriter = game.writerQueue[0 % game.writerQueue.length];
      const writerView = getPlayerView(game, expectedWriter);
      expect(writerView.isWriter).toBe(true);

      const nonWriter = game.players.find(p => p.id !== expectedWriter)!.id;
      const nonWriterView = getPlayerView(game, nonWriter);
      expect(nonWriterView.isWriter).toBe(false);
    });
  });

  describe('getQuizlingCount', () => {
    it('returns 1 for short mode regardless of player count', () => {
      expect(getQuizlingCount(3, 'short')).toBe(1);
      expect(getQuizlingCount(5, 'short')).toBe(1);
    });
    it('returns 1 for medium/long with <5 players', () => {
      expect(getQuizlingCount(3, 'medium')).toBe(1);
      expect(getQuizlingCount(4, 'long')).toBe(1);
    });
    it('returns 2 for medium/long with 5+ players', () => {
      expect(getQuizlingCount(5, 'medium')).toBe(2);
      expect(getQuizlingCount(6, 'long')).toBe(2);
      expect(getQuizlingCount(7, 'medium')).toBe(2);
      expect(getQuizlingCount(9, 'long')).toBe(2);
    });
  });

  describe('lagnavn options', () => {
    it('generates lagnavnOptions on game start', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      const game = await getGame(gameCode);
      expect(game!.lagnavnOptions).toHaveLength(5);
      expect(game!.quizlingLagnavnTarget).toBeTruthy();
      expect(game!.lagnavnOptions).toContain(game!.quizlingLagnavnTarget);
    });

    it('rejects lagnavn not in options', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });

      await expect(
        processAction(gameCode, { type: 'submit-lagnavn', playerId: hostId, payload: { lagnavn: 'Not An Option' } })
      ).rejects.toThrow('Must choose one of the provided team names');
    });

    it('exposes quizlingLagnavnTarget only to quizlings during lagnavn phase', async () => {
      await joinGame(gameCode, 'Bob', 'p-2');
      await joinGame(gameCode, 'Charlie', 'p-3');
      await startGame(gameCode, hostId);
      await processAction(gameCode, { type: 'advance-phase', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: hostId });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-2' });
      await processAction(gameCode, { type: 'confirm-role', playerId: 'p-3' });

      const game = (await getGame(gameCode))!;
      expect(game.phase).toBe('lagnavn');

      const quizlingId = game.quizlingIds[0];
      const nonQuizling = game.players.find(p => !game.quizlingIds.includes(p.id))!.id;

      const qView = getPlayerView(game, quizlingId);
      expect(qView.quizlingLagnavnTarget).toBeTruthy();
      expect(qView.lagnavnOptions).toHaveLength(5);

      const nqView = getPlayerView(game, nonQuizling);
      expect(nqView.quizlingLagnavnTarget).toBeUndefined();
      expect(nqView.lagnavnOptions).toHaveLength(5);
    });
  });

  describe('multi-quizling and short mode restrictions', () => {
    it('rejects short mode with more than 5 players', async () => {
      const g = await createGame('H', 'h-short');
      for (let i = 2; i <= 6; i++) await joinGame(g.code, `P${i}`, `ps-${i}`);
      await processAction(g.code, { type: 'set-mode', playerId: 'h-short', payload: { mode: 'short' } });
      await expect(startGame(g.code, 'h-short')).rejects.toThrow('Short mode supports max 5 players');
    });

    it('assigns multiple quizlings for 6+ players', async () => {
      const g = await createGame('H', 'h-mq');
      for (let i = 2; i <= 6; i++) await joinGame(g.code, `P${i}`, `mq-${i}`);
      await startGame(g.code, 'h-mq');
      const game = await getGame(g.code);
      expect(game!.quizlingIds).toHaveLength(2);
    });
  });
});
