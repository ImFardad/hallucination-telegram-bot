/**
 * Cloudflare Worker Environment Bindings
 */
export interface Env {
  // Workers AI binding
  AI: Ai;

  // Cloudflare KV binding for persistent chat memory
  CHAT_HISTORY?: KVNamespace;

  // Secrets
  TELEGRAM_BOT_TOKEN: string;
  SECRET_TOKEN?: string;

  // Optional environment variables
  AI_MODEL?: string;
  MAX_HISTORY_MESSAGES?: string | number;
  HISTORY_TTL_SECONDS?: string | number;
  SYSTEM_PROMPT?: string;
}

/**
 * Chat history message item format for Workers AI
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Telegram API Types
 */
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}
