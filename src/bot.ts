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
          '👋 **Hello!** I am an AI assistant running entirely on **Cloudflare Workers** using **Workers AI**.\n\n' +
          '💬 You can talk to me in **English** or **Persian (فارسی)**. I remember our ongoing conversation context.\n\n' +
          '📌 **Available Commands:**\n' +
          '• `/new` or `/clear` - Reset conversation history and start fresh\n' +
          '• `/model` - View the active AI model\n' +
          '• `/help` - Show usage tips and help\n\n' +
          'Send me any message to get started!';
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

    // 2. Generate response from Workers AI
    const aiReply = await generateChatResponse(
      env.AI,
      model,
      systemPrompt,
      history,
      rawText
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
      '⚠️ Sorry, an error occurred while processing your request. Please try again or use `/new` to reset.',
      message.message_id
    );
  }
}
