import { ChatMessage } from './types';

const KEY_PREFIX = 'chat:history:';

/**
 * Retrieves chat history from Cloudflare KV
 */
export async function getHistory(
  kv: KVNamespace | undefined,
  chatId: number
): Promise<ChatMessage[]> {
  if (!kv) {
    console.warn('CHAT_HISTORY KV binding is not configured. Conversation memory is disabled.');
    return [];
  }

  try {
    const raw = await kv.get(`${KEY_PREFIX}${chatId}`, 'text');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error(`Failed to read history for chat ${chatId}:`, error);
    return [];
  }
}

/**
 * Saves chat history to Cloudflare KV with a sliding window and TTL
 */
export async function saveHistory(
  kv: KVNamespace | undefined,
  chatId: number,
  messages: ChatMessage[],
  maxMessages: number = 10,
  ttlSeconds: number = 604800 // 7 days default
): Promise<void> {
  if (!kv) return;

  try {
    // Keep only the last `maxMessages`
    const trimmed = messages.slice(-maxMessages);
    await kv.put(`${KEY_PREFIX}${chatId}`, JSON.stringify(trimmed), {
      expirationTtl: ttlSeconds,
    });
  } catch (error) {
    console.error(`Failed to save history for chat ${chatId}:`, error);
  }
}

/**
 * Deletes chat history from Cloudflare KV to reset the conversation
 */
export async function clearHistory(
  kv: KVNamespace | undefined,
  chatId: number
): Promise<boolean> {
  if (!kv) return true;

  try {
    await kv.delete(`${KEY_PREFIX}${chatId}`);
    return true;
  } catch (error) {
    console.error(`Failed to clear history for chat ${chatId}:`, error);
    return false;
  }
}
