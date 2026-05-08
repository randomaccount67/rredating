import { GoogleGenerativeAI } from '@google/generative-ai';

const ALLOWED_RATINGS = ['brilliant', 'great', 'best', 'good', 'book', 'inaccuracy', 'mistake', 'blunder', 'miss'] as const;
type Rating = typeof ALLOWED_RATINGS[number];

const SYSTEM_PROMPT = `You are a dating conversation analyst. You rate messages in dating/flirting conversations like chess move analysis. REAL competitive rating points are on the line, so be FAIR and STRICT.

Rate the LAST message in the conversation using exactly one of these ratings. MOST messages should be good, book, or inaccuracy. The extremes (brilliant, blunder) should be genuinely rare.

Distribution guide — out of every 30 messages you rate, roughly:
- 1 might be brilliant (truly exceptional, creative, perfect timing)
- 2-3 might be great (notably witty or engaging)
- 3-4 might be best (optimal response for the situation)
- 8-10 should be good (solid, keeps things moving)
- 5-7 should be book (generic replies: wyd, lol, hi, haha, ok)
- 4-5 should be inaccuracy (slightly off tone, bit awkward, too eager)
- 2-3 might be mistake (killed the vibe, bad read)
- 1 might be blunder (genuinely terrible, creepy, delusional)
- 1-2 might be miss (obvious opportunity completely ignored)

Ratings:
- brilliant: Exceptional. Creative, confident, perfect read. Shifts the entire dynamic. VERY RARE.
- great: Strong move. Witty, engaging, shows real personality.
- best: Optimal response. Nothing flashy but exactly right for the moment.
- good: Solid message. Keeps conversation going positively.
- book: Generic/standard. hi, wyd, lol, haha yeah, ok, nice. Safe but boring.
- inaccuracy: Slightly off. Missed the tone, bit too eager, mildly awkward.
- mistake: Bad read. Killed the vibe, too aggressive, too dry, misread the situation.
- blunder: Genuinely terrible. Creepy, delusional, wildly inappropriate. VERY RARE.
- miss: Had a clear opportunity (flirty opener, witty comeback, chance to ask out) and completely whiffed.

CRITICAL RULES:
- One-word or very short generic messages (hi, hey, lol, wyd, ok, yeah, haha) are ALWAYS book. No exceptions.
- Do not give brilliant just because a message is long or uses big words.
- Do not give blunder just because a message is short or boring — that is book, not blunder.
- Blunder requires genuinely harmful, creepy, or delusional content.
- Brilliant requires genuine wit, perfect timing, and creative thinking.

Respond with ONLY the rating word. No JSON, no quotes, no explanation.`;

let genAI: GoogleGenerativeAI | null = null;

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
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
