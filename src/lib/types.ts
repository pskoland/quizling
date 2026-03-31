export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export interface Question {
  question: string;
  answer: string;
}

export type GamePhase =
  | 'lobby'
  | 'rules'
  | 'role-reveal'
  | 'lagnavn'
  | 'lagnavn-confirmed'
  | 'power-q-0'
  | 'power-q-1'
  | 'power-q-2'
  | 'power-result-0'
  | 'power-result-1'
  | 'power-result-2'
  | `quiz-${number}`
  | 'voting'
  | 'reveal'
  | 'fasit'
  | 'result';

export type PowerPin = 'blue' | 'white' | 'black';

export type GameMode = 'short' | 'medium' | 'long';

export interface GameModeConfig {
  quizCount: number;
  powerCount: number;
  /** Quiz indices before which a power question is inserted */
  powerBefore: number[];
}

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  short:  { quizCount: 4,  powerCount: 2, powerBefore: [1, 3] },
  medium: { quizCount: 6,  powerCount: 2, powerBefore: [2, 5] },
  long:   { quizCount: 10, powerCount: 3, powerBefore: [3, 6, 9] },
};

export interface GameState {
  code: string;
  phase: GamePhase;
  mode: GameMode;
  players: Player[];
  hostId: string;
  quizlingIds: string[];
  category: string | null;
  questions: Question[];
  powerQuestions: Question[];
  lagnavn: string | null;
  lagnavnOptions: string[];
  quizlingLagnavnTarget: string | null;
  currentQuizQ: number;
  quizAnswers: Record<number, string>;
  powerAnswers: Record<number, Record<string, number>>;
  powerAnswerTimestamps: Record<number, Record<string, number>>;
  powerWinners: Record<number, string>;
  powerPins: Record<number, PowerPin>;
  pinUsedAt: Record<string, number>;
  votes: Record<string, string[]>;
  writerQueue: string[];
  confirmedRoles: string[];
  fasitRevealCount: number;
  revealStep: number;
  previousQuizlingIds: string[];
  questionStartedAt: number | null;
  updatedAt: number;
  createdAt: number;
}

export interface GameAction {
  type:
    | 'confirm-role'
    | 'submit-lagnavn'
    | 'advance-phase'
    | 'submit-power-answer'
    | 'choose-pin'
    | 'submit-quiz-answer'
    | 'submit-vote'
    | 'restart-game'
    | 'set-mode'
    | 'reveal-fasit-question'
    | 'advance-reveal-step'
    | 'use-pin'
    | 'use-black-pin';
  playerId: string;
  payload?: Record<string, unknown>;
}
