import { describe, it, expect } from 'vitest';
import { isAnswerCorrect } from '../lib/fuzzy-match';

describe('isAnswerCorrect', () => {
  describe('exact match', () => {
    it('matches identical strings', () => {
      expect(isAnswerCorrect('Oslo', 'Oslo')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isAnswerCorrect('oslo', 'Oslo')).toBe(true);
      expect(isAnswerCorrect('GALDHØPIGGEN', 'Galdhøpiggen')).toBe(true);
    });

    it('trims whitespace', () => {
      expect(isAnswerCorrect('  Oslo  ', 'Oslo')).toBe(true);
      expect(isAnswerCorrect('Oslo', '  Oslo  ')).toBe(true);
    });
  });

  describe('empty / undefined input', () => {
    it('rejects undefined', () => {
      expect(isAnswerCorrect(undefined, 'Oslo')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isAnswerCorrect('', 'Oslo')).toBe(false);
    });
  });

  describe('substring match', () => {
    it('matches when player answer contains correct answer', () => {
      expect(isAnswerCorrect('Det er Galdhøpiggen', 'Galdhøpiggen')).toBe(true);
    });

    it('matches when correct answer contains player answer', () => {
      expect(isAnswerCorrect('Sahara', 'Sahara-ørkenen')).toBe(true);
    });
  });

  describe('levenshtein / typo tolerance', () => {
    it('accepts 1-character typo in medium-length words', () => {
      expect(isAnswerCorrect('Canberr', 'Canberra')).toBe(true);
      expect(isAnswerCorrect('Canbera', 'Canberra')).toBe(true);
    });

    it('accepts 2-character typo in longer words', () => {
      expect(isAnswerCorrect('Galdhøpigen', 'Galdhøpiggen')).toBe(true);
    });

    it('rejects completely wrong answers', () => {
      expect(isAnswerCorrect('Bergen', 'Oslo')).toBe(false);
      expect(isAnswerCorrect('Stockholm', 'Canberra')).toBe(false);
    });

    it('rejects too many typos', () => {
      expect(isAnswerCorrect('Gull', 'Sølv')).toBe(false);
    });
  });

  describe('Norwegian number words', () => {
    it('matches "to" → "2"', () => {
      expect(isAnswerCorrect('to', '2')).toBe(true);
    });

    it('matches "åtte" → "8"', () => {
      expect(isAnswerCorrect('åtte', '8')).toBe(true);
    });

    it('matches "atte" → "8" (without å)', () => {
      expect(isAnswerCorrect('atte', '8')).toBe(true);
    });

    it('matches "en" → "1"', () => {
      expect(isAnswerCorrect('en', '1')).toBe(true);
    });

    it('matches "ett" → "1"', () => {
      expect(isAnswerCorrect('ett', '1')).toBe(true);
    });

    it('matches "syv" and "sju" → "7"', () => {
      expect(isAnswerCorrect('syv', '7')).toBe(true);
      expect(isAnswerCorrect('sju', '7')).toBe(true);
    });

    it('matches "ti" → "10"', () => {
      expect(isAnswerCorrect('ti', '10')).toBe(true);
    });

    it('matches digit → number word', () => {
      expect(isAnswerCorrect('3', 'tre')).toBe(true);
    });

    it('does not match unrelated number words', () => {
      expect(isAnswerCorrect('fem', '3')).toBe(false);
    });
  });

  describe('Norwegian stem matching', () => {
    it('matches kondensering ≈ kondensasjon', () => {
      expect(isAnswerCorrect('kondensering', 'kondensasjon')).toBe(true);
    });

    it('matches fordamping ≈ fordampning', () => {
      expect(isAnswerCorrect('fordamping', 'fordampning')).toBe(true);
    });

    it('matches evolusjon ≈ evolusjon (identical)', () => {
      expect(isAnswerCorrect('evolusjon', 'evolusjon')).toBe(true);
    });

    it('matches fotosyntese ≈ fotosyntesen', () => {
      expect(isAnswerCorrect('fotosyntesen', 'fotosyntese')).toBe(true);
    });

    it('does not stem-match short words to avoid false positives', () => {
      // Both less than 5 chars, should not try stem matching
      expect(isAnswerCorrect('ring', 'rask')).toBe(false);
    });

    it('does not match completely different long words', () => {
      expect(isAnswerCorrect('demokrati', 'geografi')).toBe(false);
    });
  });

  describe('date normalization', () => {
    it('matches "17.05" ≈ "17. mai"', () => {
      expect(isAnswerCorrect('17.05', '17. mai')).toBe(true);
    });

    it('matches "17/05" ≈ "17. mai"', () => {
      expect(isAnswerCorrect('17/05', '17. mai')).toBe(true);
    });

    it('matches "1.1" ≈ "1. januar"', () => {
      expect(isAnswerCorrect('1.1', '1. januar')).toBe(true);
    });

    it('matches "24.12" ≈ "24. desember"', () => {
      expect(isAnswerCorrect('24.12', '24. desember')).toBe(true);
    });

    it('matches both as numeric dates', () => {
      expect(isAnswerCorrect('17.05', '17/05')).toBe(true);
    });

    it('matches "1 januar" ≈ "1. januar"', () => {
      expect(isAnswerCorrect('1 januar', '1. januar')).toBe(true);
    });

    it('does not match different dates', () => {
      expect(isAnswerCorrect('17.05', '24.12')).toBe(false);
    });
  });

  describe('combined edge cases', () => {
    it('number words are case-insensitive', () => {
      expect(isAnswerCorrect('To', '2')).toBe(true);
      expect(isAnswerCorrect('ÅTTE', '8')).toBe(true);
    });

    it('handles year answers as exact numbers', () => {
      expect(isAnswerCorrect('1905', '1905')).toBe(true);
      expect(isAnswerCorrect('1789', '1789')).toBe(true);
    });

    it('rejects year that is close but wrong', () => {
      expect(isAnswerCorrect('1904', '1814')).toBe(false);
    });
  });
});
