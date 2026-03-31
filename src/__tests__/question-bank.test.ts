import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create a mock tagged-template function
const mockSql = vi.fn();

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => mockSql),
}));

process.env.DATABASE_URL = 'postgresql://user:pass@host.tld/dbname';

// Dynamic import after mock is set up — must reimport each test to reset _sql cache
async function loadModule() {
  // Clear module cache to get fresh _sql
  vi.resetModules();
  // Re-apply mock after resetModules
  vi.doMock('@neondatabase/serverless', () => ({
    neon: vi.fn(() => mockSql),
  }));
  return await import('../lib/question-bank');
}

describe('question-bank', () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  describe('initQuestionBank', () => {
    it('executes CREATE TABLE IF NOT EXISTS', async () => {
      const { initQuestionBank } = await loadModule();
      mockSql.mockResolvedValue([]);
      await initQuestionBank();
      expect(mockSql).toHaveBeenCalled();
      const callArgs = mockSql.mock.calls[0];
      const sqlText = callArgs[0].join('');
      expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS question_bank');
    });
  });

  describe('getQuestions', () => {
    it('returns all questions when no filters provided', async () => {
      const { getQuestions } = await loadModule();
      const mockRows = [
        { id: 1, type: 'quiz', question: 'Q1', answer: 'A1', difficulty: 'medium', created_at: '2026-01-01' },
      ];
      mockSql.mockResolvedValue(mockRows);
      const result = await getQuestions();
      expect(result).toEqual(mockRows);
    });

    it('filters by type when provided', async () => {
      const { getQuestions } = await loadModule();
      mockSql.mockResolvedValue([]);
      await getQuestions('quiz');
      const sqlText = mockSql.mock.calls[0][0].join('');
      expect(sqlText).toContain('type =');
    });

    it('filters by difficulty when provided', async () => {
      const { getQuestions } = await loadModule();
      mockSql.mockResolvedValue([]);
      await getQuestions(undefined, 'hard');
      const sqlText = mockSql.mock.calls[0][0].join('');
      expect(sqlText).toContain('difficulty =');
    });

    it('filters by both type and difficulty', async () => {
      const { getQuestions } = await loadModule();
      mockSql.mockResolvedValue([]);
      await getQuestions('power', 'easy');
      const sqlText = mockSql.mock.calls[0][0].join('');
      expect(sqlText).toContain('type =');
      expect(sqlText).toContain('difficulty =');
    });
  });

  describe('addQuestion', () => {
    it('inserts a question and returns the new row', async () => {
      const { addQuestion } = await loadModule();
      const newRow = { id: 1, type: 'quiz', question: 'Q1', answer: 'A1', difficulty: 'medium' };
      mockSql.mockResolvedValue([newRow]);
      const result = await addQuestion('quiz', 'Q1', 'A1', 'medium');
      expect(result).toEqual(newRow);
      const sqlText = mockSql.mock.calls[0][0].join('');
      expect(sqlText).toContain('INSERT INTO question_bank');
      expect(sqlText).toContain('RETURNING');
    });
  });

  describe('updateQuestion', () => {
    it('updates a question by id and returns the updated row', async () => {
      const { updateQuestion } = await loadModule();
      const current = { question: 'Old', answer: 'A1' };
      const updated = { id: 1, type: 'quiz', question: 'Updated', answer: 'A1', difficulty: 'hard' };
      // First call: SELECT current question/answer for hash. Second call: UPDATE
      mockSql.mockResolvedValueOnce([current]).mockResolvedValueOnce([updated]);
      const result = await updateQuestion(1, { question: 'Updated', difficulty: 'hard' });
      expect(result).toEqual(updated);
      // First call is the SELECT, second is the UPDATE
      const sqlText = mockSql.mock.calls[1][0].join('');
      expect(sqlText).toContain('UPDATE question_bank');
    });
  });

  describe('deleteQuestion', () => {
    it('deletes a question by id', async () => {
      const { deleteQuestion } = await loadModule();
      mockSql.mockResolvedValue([{ id: 1 }]);
      const result = await deleteQuestion(1);
      expect(result).toEqual({ id: 1 });
      const sqlText = mockSql.mock.calls[0][0].join('');
      expect(sqlText).toContain('DELETE FROM question_bank');
    });
  });
});
