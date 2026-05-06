import { GoogleGenerativeAI } from '@google/generative-ai';

const ALLOWED_RATINGS = ['brilliant', 'great', 'best', 'good', 'book', 'inaccuracy', 'mistake', 'blunder', 'miss'] as const;
type Rating = typeof ALLOWED_RATINGS[number];

const SYSTEM_PROMPT = `You are a dating conversation analyst inspired by chess.com's move analysis. You analyze messages in dating/flirting conversations and rate them like chess moves.

Rate the LAST message in the conversation using exactly one of these ratings:
- brilliant: Exceptional rizz. Perfect read of the situation, creative, flirty, confident. The kind of message that completely shifts momentum.
- great: Strong move. Witty, engaging, shows genuine interest or personality.
- best: Optimal response for the situation. Nothing flashy but exactly right.
- good: Solid message. Keeps the conversation going in a positive direction.
- book: Generic/standard reply. 'wyd', 'lol', 'haha yeah'. Safe but boring.
- inaccuracy: Slightly off. Missed the tone, was a bit too eager, or slightly awkward.
- mistake: Bad read. Killed the vibe, was too aggressive, too dry, or misread the situation.
- blunder: Terrible message. Double texting walls of text, being creepy, saying something completely wrong for the moment.
- miss: Had an obvious opportunity (flirty opener, witty comeback, asking them out) and completely missed it.

Respond in exactly this JSON format and nothing else, no markdown backticks:
{"rating": "one_of_the_ratings_above", "reason": "A short funny 5-15 word explanation"}

Be entertaining and funny with the reasons. Be a little mean when warranted. Think like a dating coach watching a chess match.`;

let genAI: GoogleGenerativeAI | null = null;

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite-preview-06-17',
    systemInstruction: SYSTEM_PROMPT,
  });
}

export async function analyzeMessage(
  messageContent: string,
  conversationHistory: Array<{ sender: string; content: string }>,
): Promise<{ rating: string; reason: string } | null> {
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
    const text = result.response.text().trim();

    const parsed = JSON.parse(text) as { rating: unknown; reason: unknown };
    if (!ALLOWED_RATINGS.includes(parsed.rating as Rating)) return null;
    if (typeof parsed.reason !== 'string') return null;

    return { rating: parsed.rating as string, reason: parsed.reason };
  } catch {
    return null;
  }
}
