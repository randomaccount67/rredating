import { GoogleGenerativeAI } from '@google/generative-ai';

const ALLOWED_RATINGS = ['brilliant', 'great', 'best', 'good', 'book', 'inaccuracy', 'mistake', 'blunder', 'miss'] as const;
type Rating = typeof ALLOWED_RATINGS[number];

const SYSTEM_PROMPT = `You are a dating conversation analyst inspired by chess.com's move analysis. You analyze messages in dating/flirting conversations and rate them like chess moves.

Rate the LAST message in the conversation using exactly one of these ratings:
- brilliant: Exceptional rizz. Perfect read, creative, confident. Reserve this for truly exceptional messages that completely shift momentum. This should be RARE — maybe 1 in 30 messages.
- great: Strong move. Witty, engaging, shows genuine interest or personality. Uncommon — only for notably good messages.
- best: Optimal response for the situation. Nothing flashy but exactly the right thing to say.
- good: Solid message. Keeps the conversation going positively. This should be one of the most common ratings.
- book: Generic/standard reply. 'wyd', 'lol', 'haha yeah', 'hi'. Safe but boring. This should be very common.
- inaccuracy: Slightly off. Missed the tone, a bit too eager, or mildly awkward. Fairly common.
- mistake: Bad read. Killed the vibe, too aggressive, too dry, or misread the situation.
- blunder: Truly terrible message. Being creepy, wildly inappropriate, completely delusional. This should be RARE — maybe 1 in 30 messages. Reserve for genuinely awful messages.
- miss: Had an obvious opportunity (flirty opener, witty comeback, clear chance to ask them out) and completely whiffed it.

IMPORTANT: Most messages should be rated good, book, or inaccuracy. brilliant and blunder are EXTREMES and should be very rare. Think about it like chess — most moves are normal, only a few are brilliant or blunders.

Respond with ONLY the rating word, nothing else. No JSON, no quotes, no explanation. Just the single word.`;

let genAI: GoogleGenerativeAI | null = null;

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  });
}

export async function analyzeMessage(
  messageContent: string,
  conversationHistory: Array<{ sender: string; content: string }>,
): Promise<{ rating: string } | null> {
  try {
    const model = getModel();
    if (!model) return null;

    const recent = conversationHistory.slice(-10);
    const lines = [...recent.map(m => `${m.sender}: ${m.content}`), `new message: ${messageContent}`];
    const prompt = lines.join('\n');

    const analysisPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10_000),
    );

    const result = await Promise.race([analysisPromise, timeoutPromise]);
    const rating = result.response.text().trim().toLowerCase() as Rating;

    if (!ALLOWED_RATINGS.includes(rating)) return null;

    return { rating };
  } catch (err: unknown) {
    console.error('[chat-analysis] error:', (err as Error)?.message ?? err);
    return null;
  }
}
