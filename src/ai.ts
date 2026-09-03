import { ChatMessage } from './types';

export const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

export const DEFAULT_SYSTEM_PROMPT =
  'You are an intelligent, articulate, and helpful AI assistant on Telegram. ' +
  'Always respond naturally, accurately, and fluently in the language the user addresses you in (Persian / فارسی or English). ' +
  'Provide well-reasoned, direct answers, and format your output cleanly for mobile chat.';

/**
 * Executes chat completion through Cloudflare Workers AI with automatic fallback
 */
export async function generateChatResponse(
  ai: Ai,
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  newUserMessage: string
): Promise<string> {
  // Construct the message array including system prompt and conversational history
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: newUserMessage },
  ];

  // Candidates to try in priority order
  const candidateModels = Array.from(
    new Set([
      model,
      '@cf/meta/llama-3.1-8b-instruct-fast',
      '@cf/meta/llama-3.2-3b-instruct',
    ])
  );

  let lastError: any = null;

  for (const candidate of candidateModels) {
    try {
      const output = (await ai.run(candidate as any, {
        messages,
        max_tokens: 1024,
      })) as any;

      let responseText = '';

      if (typeof output === 'string') {
        responseText = output;
      } else if (output && typeof output.response === 'string') {
        responseText = output.response;
      } else if (output && output.result && typeof output.result.response === 'string') {
        responseText = output.result.response;
      } else if (output && typeof output.text === 'string') {
        responseText = output.text;
      } else if (output) {
        responseText = JSON.stringify(output);
      }

      if (responseText && responseText.trim()) {
        return responseText.trim();
      }
    } catch (err: any) {
      console.warn(`Model ${candidate} failed:`, err?.message || err);
      lastError = err;
    }
  }

  console.error('All Workers AI candidate models failed. Last error:', lastError);
  throw new Error(`Workers AI execution failed: ${lastError?.message || lastError}`);
}
