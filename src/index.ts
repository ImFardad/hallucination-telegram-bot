import { Env, TelegramUpdate } from './types';
import { handleTelegramUpdate } from './bot';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'hallucination-telegram-bot',
          version: '1.0.2',
          tokenConfigured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_TOKEN.trim() !== ''),
          message: 'Telegram AI Bot Worker is active and ready.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Telegram webhook handler (supports root / and /webhook)
    if (request.method === 'POST' && (url.pathname === '/' || url.pathname === '/webhook')) {

      try {
        const update: TelegramUpdate = await request.json();

        // Process Telegram update asynchronously so Telegram receives 200 OK immediately
        ctx.waitUntil(handleTelegramUpdate(update, env));

        return new Response('OK', { status: 200 });
      } catch (err: any) {
        console.error('Failed to parse incoming Telegram update:', err);
        return new Response('Bad Request', { status: 400 });
      }
    }

    // Default 404 for unrecognized routes
    return new Response('Not Found', { status: 404 });
  },
};
