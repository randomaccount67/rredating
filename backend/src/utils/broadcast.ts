/**
 * Sends a Supabase Realtime broadcast via the REST API using the service-role key.
 * This bypasses RLS (which strips postgres_changes payloads for protected tables).
 * Errors are logged but never thrown — broadcast failures must not break the main flow.
 */
export async function broadcast(
  topic: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const url = `${process.env.SUPABASE_URL}/realtime/v1/api/broadcast`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      },
      body: JSON.stringify({
        messages: [{ topic, event, payload }],
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`[broadcast] HTTP ${response.status} topic="${topic}":`, text);
    }
  } catch (err) {
    console.error(`[broadcast] error topic="${topic}":`, err);
  }
}
