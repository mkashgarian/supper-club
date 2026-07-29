export async function postToDiscord(content: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error(`Discord webhook failed: ${res.status} ${await res.text()}`);
  }
}
