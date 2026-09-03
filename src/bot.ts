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
          '👋 سلام! من دستیار هوش مصنوعی شما هستم.\n' +
          'هر پیام یا سوالی دارید به فارسی یا انگلیسی بفرستید تا گفتگو کنیم. 💬\n\n' +
          '• `/new` — شروع چت جدید (پاک‌سازی حافظه)\n' +
          '• `/help` — راهنما';
        await sendMessage(token, chatId, startMessage);
        return;
      }

      case '/new':
      case '/clear':
      case '/reset': {
        await clearHistory(env.CHAT_HISTORY, chatId);
        const resetMessage =
          '🔄 **Conversation memory has been cleared!**\n\n' +
          'حافظه گفت‌وگو پاک شد. چت جدید آغاز شد! هر پیامی که بفرستید گفت‌وگوی جدیدی خواهد بود.';
        await sendMessage(token, chatId, resetMessage);
        return;
      }

      case '/help': {
        const helpMessage =
          '🤖 **Bot Help & Guide**\n\n' +
          '• **Natural Chat**: Send any question or prompt in Persian or English.\n' +
          '• **Memory**: I remember previous messages in our conversation so you can ask follow-up questions.\n' +
          '• `/new` / `/clear`: Reset memory whenever you want to start a fresh topic.\n' +
          '• `/model`: Check which Workers AI model is currently answering your prompts.';
        await sendMessage(token, chatId, helpMessage);
        return;
      }

      case '/model': {
        const modelMessage =
          `⚡ **Active AI Model:**\n\`${model}\`\n\n` +
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
      env.TEMPERATURE !== undefined && env.TEMPERATURE !== '' ? Number(env.TEMPERATURE) : 1.35;
    const topP = env.TOP_P !== undefined && env.TOP_P !== '' ? Number(env.TOP_P) : 0.98;
    const repetitionPenalty =
      env.REPETITION_PENALTY !== undefined && env.REPETITION_PENALTY !== ''
        ? Number(env.REPETITION_PENALTY)
        : 1.15;

    // 2. Generate response from Workers AI
    const aiReply = await generateChatResponse(
      env.AI,
      model,
      systemPrompt,
      history,
      rawText,
      { temperature, topP, repetitionPenalty }
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
      '⚠️ در پردازش پیام خطایی رخ داد. لطفاً دوباره پیام دهید یا با `/new` چت جدیدی شروع کنید.',
      message.message_id
    );
  }
}
