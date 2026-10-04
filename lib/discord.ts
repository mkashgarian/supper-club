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

/**
 * A name as it should appear in a message: a real @mention if DISCORD_USER_IDS
 * (JSON like {"Allie":"1234567890"}) has an entry for them, otherwise just the name.
 */
export function mentionOrName(name: string): string {
  try {
    const ids = JSON.parse(process.env.DISCORD_USER_IDS ?? "{}") as Record<string, string>;
    const id = ids[name];
    return id ? `<@${id}>` : name;
  } catch {
    return name;
  }
}
