const TELEGRAM_API_BASE = 'https://api.telegram.org';
const TELEGRAM_MAX_LENGTH = 4000; // Telegram limit is 4096; safe margin

/**
 * Sends a chat action (e.g. typing indicator) to Telegram
 */
export async function sendChatAction(
  token: string,
  chatId: number,
  action: string = 'typing'
): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    });
  } catch (err) {
    // Non-fatal: just log failure to send typing indicator
    console.warn('Failed to send chat action:', err);
  }
}

/**
 * Splits text into chunks that fit within Telegram's max message length
 */
function splitMessage(text: string, maxLength: number = TELEGRAM_MAX_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Attempt to break at the last newline before maxLength
    let breakPoint = remaining.lastIndexOf('\n', maxLength);

    // If no newline, attempt to break at a space
    if (breakPoint === -1 || breakPoint < maxLength * 0.5) {
      breakPoint = remaining.lastIndexOf(' ', maxLength);
    }

    // Fallback: hard cut at maxLength
    if (breakPoint === -1 || breakPoint < maxLength * 0.3) {
      breakPoint = maxLength;
    }

    chunks.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return chunks;
}

/**
 * Sends a text message to a Telegram chat, automatically chunking long responses
 */
export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  replyToMessageId?: number
): Promise<void> {
  const chunks = splitMessage(text);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: chunk,
    };

    // Reply to original message on the first chunk if specified
    if (i === 0 && replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Telegram sendMessage failed [${response.status}]:`, errorText);
    }
  }
}
