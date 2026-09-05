import { Env, TelegramUpdate } from './types';
import { sendMessage, sendChatAction } from './telegram';
import { getHistory, saveHistory, clearHistory } from './storage';
import { generateChatResponse, DEFAULT_MODEL, DEFAULT_SYSTEM_PROMPT } from './ai';

/**
 * Main dispatcher for Telegram webhook updates
 */
export async function handleTelegramUpdate(update: TelegramUpdate, env: Env): Promise<void> {
  const message = update.message || update.edited_message;

  // Ignore updates without text or chat ID
  if (!message || !message.text || !message.chat?.id) {
    return;
  }

  const chatId = message.chat.id;
  const rawText = message.text.trim();
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN secret is not set.');
    return;
  }

  const model = env.AI_MODEL || DEFAULT_MODEL;
  const systemPrompt = env.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;
  const maxHistory = Number(env.MAX_HISTORY_MESSAGES) || 10;
  const ttlSeconds = Number(env.HISTORY_TTL_SECONDS) || 604800; // 7 days

  // Command handling
  if (rawText.startsWith('/')) {
    const command = rawText.split(' ')[0].toLowerCase().split('@')[0];

    switch (command) {
      case '/start': {
        const startMessage =
          'Hello, Im your AI assistant\n' +
          '• `/new` — start new chat\n' +
          '• `/help` — guide';
        await sendMessage(token, chatId, startMessage);
        return;
      }

      case '/new':
      case '/clear':
      case '/reset': {
        await clearHistory(env.CHAT_HISTORY, chatId);
        const resetMessage =
          'Conversation memory has been cleared!\n'
        await sendMessage(token, chatId, resetMessage);
        return;
      }

      case '/help': {
        const helpMessage =
          'Bot Help & Guide\n\n' +
          '• Memory: I remember previous messages in our conversation so you can ask follow-up questions.\n' +
          '• `/new` / `/clear`: Reset memory whenever you want to start a fresh topic.\n' +
          '• `/model`: Check which Workers AI model is currently answering your prompts.';
        await sendMessage(token, chatId, helpMessage);
        return;
      }

      case '/model': {
        const modelMessage =
          `Active AI Model:\n\`${model}\`\n\n` +
          `• Runtime: Cloudflare Workers\n` +
          `• Memory: Cloudflare KV (Last ${maxHistory} messages)\n` +
          `• Low-consumption & fast inference enabled.`;
        await sendMessage(token, chatId, modelMessage);
        return;
      }

      default:
        // Unknown commands can either be ignored or passed to AI
        break;
    }
  }

  // Regular chat message: send typing action
  await sendChatAction(token, chatId, 'typing');

  try {
    // 1. Fetch conversational history from KV
    const history = await getHistory(env.CHAT_HISTORY, chatId);

    const temperature =
      env.TEMPERATURE !== undefined && env.TEMPERATURE !== '' ? Number(env.TEMPERATURE) : 0.8;
    const topP = env.TOP_P !== undefined && env.TOP_P !== '' ? Number(env.TOP_P) : 0.9;

    // 2. Generate response from Workers AI
    const aiReply = await generateChatResponse(
      env.AI,
      model,
      systemPrompt,
      history,
      rawText,
      { temperature, topP }
    );

    // 3. Save new exchange into KV history
    const updatedHistory = [
      ...history,
      { role: 'user' as const, content: rawText },
      { role: 'assistant' as const, content: aiReply },
    ];
    await saveHistory(env.CHAT_HISTORY, chatId, updatedHistory, maxHistory, ttlSeconds);

    // 4. Send response to Telegram
    await sendMessage(token, chatId, aiReply, message.message_id);
  } catch (error: any) {
    console.error('Error handling message:', error);
    await sendMessage(
      token,
      chatId,
      'Error!',
      message.message_id
    );
  }
}
