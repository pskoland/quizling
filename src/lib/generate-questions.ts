import Anthropic from '@anthropic-ai/sdk';
import { getQuestionsRandom } from './question-bank';
import { getLagnavnRandom } from './lagnavn-bank';

interface GeneratedQuestions {
  category: string;
  questions: { question: string; answer: string }[];
  powerQuestions: { question: string; answer: string }[];
}

const FALLBACK: GeneratedQuestions = {
  category: 'dyreriket',
  questions: [
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
  ],
  powerQuestions: [
    { question: 'Omtrent hvor mange kilometer er det fra Oslo til Bergen langs vei?', answer: '462' },
    { question: 'Omtrent hvor mange land er det i verden?', answer: '195' },
    { question: 'Omtrent hvor mange øyer har Norge?', answer: '50000' },
  ],
};

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

async function loadFromQuestionBank(difficulty?: string, quizCount = 10, powerCount = 2): Promise<GeneratedQuestions | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const [quizRows, powerRows] = await Promise.all([
      getQuestionsRandom('quiz', quizCount, difficulty),
      getQuestionsRandom('power', powerCount, difficulty),
    ]);

    if (quizRows.length >= quizCount && powerRows.length >= powerCount) {
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      return {
        category,
        questions: quizRows.map((r) => ({ question: r.question, answer: r.answer })),
        powerQuestions: powerRows.map((r) => ({ question: r.question, answer: r.answer })),
      };
    }
  } catch {
    // Question bank not available — fall through
  }

  return null;
}

export async function generateQuestions(difficulty?: string, quizCount = 10, powerCount = 2): Promise<GeneratedQuestions> {
  // 1. Try the question bank first
  const fromBank = await loadFromQuestionBank(difficulty, quizCount, powerCount);
  if (fromBank) return fromBank;

  // 2. Fall back to AI generation
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ...FALLBACK, questions: FALLBACK.questions.slice(0, quizCount), powerQuestions: FALLBACK.powerQuestions.slice(0, powerCount) };

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
      return {
        category,
        questions: parsed.questions.slice(0, quizCount),
        powerQuestions: parsed.powerQuestions.slice(0, powerCount),
      };
    }

    return { category, questions: FALLBACK.questions.slice(0, quizCount), powerQuestions: FALLBACK.powerQuestions.slice(0, powerCount) };
  } catch {
    return FALLBACK;
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
