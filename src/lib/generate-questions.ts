import Anthropic from '@anthropic-ai/sdk';
import { getQuestionsRandom, questionHash } from './question-bank';
import { getLagnavnRandom } from './lagnavn-bank';

interface GeneratedQuestions {
  category: string;
  questions: { question: string; answer: string }[];
  powerQuestions: { question: string; answer: string }[];
  /** Content hashes for all questions (quiz + power) for dedup tracking */
  questionHashes: string[];
}

const FALLBACK_QUESTIONS = [
  { question: 'Hva heter Norges høyeste fjell?', answer: 'Galdhøpiggen' },
  { question: 'Hvilket år ble den franske revolusjonen?', answer: '1789' },
  { question: 'Hva er hovedstaden i Australia?', answer: 'Canberra' },
  { question: 'Hvor mange bein har en edderkopp?', answer: '8' },
  { question: 'Hvilket land har flest innbyggere i verden?', answer: 'India' },
  { question: 'Hva heter den lengste elven i verden?', answer: 'Nilen' },
  { question: 'Hvor mange planeter er det i solsystemet?', answer: '8' },
  { question: 'Hvilket grunnstoff har symbolet Au?', answer: 'Gull' },
  { question: 'Hva heter verdens største ørken?', answer: 'Sahara' },
  { question: 'Hvilket år ble Norge selvstendig?', answer: '1905' },
];

const FALLBACK_POWER_QUESTIONS = [
  { question: 'Omtrent hvor mange kilometer er det fra Oslo til Bergen langs vei?', answer: '462' },
  { question: 'Omtrent hvor mange land er det i verden?', answer: '195' },
  { question: 'Omtrent hvor mange øyer har Norge?', answer: '50000' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CATEGORIES = [
  'dyreriket', 'mat og drikke', 'sport', 'farger', 'musikk',
  'verdensrom', 'norsk natur', 'byer i Europa', 'filmer', 'vitenskap',
];

async function loadFromQuestionBank(difficulty?: string, quizCount = 10, powerCount = 2, excludeHashes?: string[]): Promise<GeneratedQuestions | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const [quizRows, powerRows] = await Promise.all([
      getQuestionsRandom('quiz', quizCount, difficulty, excludeHashes),
      getQuestionsRandom('power', powerCount, difficulty, excludeHashes),
    ]);

    if (quizRows.length >= quizCount && powerRows.length >= powerCount) {
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const hashes = [
        ...quizRows.map(r => r.content_hash || questionHash(r.question, r.answer)),
        ...powerRows.map(r => r.content_hash || questionHash(r.question, r.answer)),
      ];
      return {
        category,
        questions: quizRows.map((r) => ({ question: r.question, answer: r.answer })),
        powerQuestions: powerRows.map((r) => ({ question: r.question, answer: r.answer })),
        questionHashes: hashes,
      };
    }
  } catch {
    // Question bank not available — fall through
  }

  return null;
}

/** Compute hashes for a set of questions */
function computeHashes(questions: { question: string; answer: string }[]): string[] {
  return questions.map(q => questionHash(q.question, q.answer));
}

export async function generateQuestions(difficulty?: string, quizCount = 10, powerCount = 2, excludeHashes?: string[]): Promise<GeneratedQuestions> {
  // 1. Try the question bank first
  const fromBank = await loadFromQuestionBank(difficulty, quizCount, powerCount, excludeHashes);
  if (fromBank) return fromBank;

  // 2. Fall back to AI generation
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const qs = FALLBACK_QUESTIONS.slice(0, quizCount);
    const pqs = FALLBACK_POWER_QUESTIONS.slice(0, powerCount);
    return { category: 'dyreriket', questions: qs, powerQuestions: pqs, questionHashes: computeHashes([...qs, ...pqs]) };
  }

  try {
    const client = new Anthropic({ apiKey });

    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Generer spørsmål for et norsk quizspill. Kategorien for lagnavnet er "${category}".

Lag NØYAKTIG dette i JSON-format:
- ${quizCount} allmenkunnskapsspørsmål med korte, entydige svar (maks 3 ord). Varier temaer: geografi, historie, vitenskap, kultur, sport, natur osv. Middels vanskelighetsgrad.
- ${powerCount} "maktspørsmål" som er tallspørsmål der svaret er et tall (ca-svar). Bruk formuleringen "Omtrent hvor mange..."

Svar KUN med gyldig JSON, ingen annen tekst:
{
  "questions": [{"question": "...", "answer": "..."}],
  "powerQuestions": [{"question": "...", "answer": "123"}]
}`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);

    if (parsed.questions?.length >= quizCount && parsed.powerQuestions?.length >= powerCount) {
      const qs = parsed.questions.slice(0, quizCount);
      const pqs = parsed.powerQuestions.slice(0, powerCount);
      return {
        category,
        questions: qs,
        powerQuestions: pqs,
        questionHashes: computeHashes([...qs, ...pqs]),
      };
    }

    const qs = FALLBACK_QUESTIONS.slice(0, quizCount);
    const pqs = FALLBACK_POWER_QUESTIONS.slice(0, powerCount);
    return { category, questions: qs, powerQuestions: pqs, questionHashes: computeHashes([...qs, ...pqs]) };
  } catch {
    return { category: 'dyreriket', questions: FALLBACK_QUESTIONS, powerQuestions: FALLBACK_POWER_QUESTIONS, questionHashes: computeHashes([...FALLBACK_QUESTIONS, ...FALLBACK_POWER_QUESTIONS]) };
  }
}

const FALLBACK_LAGNAVN = [
  'Turbo Tansen', 'Blåbærbandittene', 'Nordlys Ninjaene',
  'Fjordfiffen', 'Trollstansen', 'Brunostbrødrene',
  'Kvikklunsj Klubben', 'Sildekongene', 'Polarsirkelen',
  'Vaffelvandrerne', 'Elgpatruljen', 'Frostansen',
  'Snøstormerne', 'Pinnekjøttgjengen', 'Rypejakterne',
];

export async function generateLagnavnOptions(): Promise<string[]> {
  // 1. Try the lagnavn bank in DB
  if (process.env.DATABASE_URL) {
    try {
      const fromBank = await getLagnavnRandom(5);
      if (fromBank.length >= 5) return fromBank;
    } catch {
      // fall through to hardcoded
    }
  }

  // 2. Fall back to hardcoded list
  return shuffle(FALLBACK_LAGNAVN).slice(0, 5);
}
