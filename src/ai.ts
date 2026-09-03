import { ChatMessage } from './types';

export const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

export const DEFAULT_SYSTEM_PROMPT =
  'You are an AI assistant communicating on Telegram. ' +
  'Always respond strictly in fluent, natural Persian (فارسی) or English based on the language of the user message. ' +
  'Keep your answers concise, clear, and coherent (maximum 2 to 3 paragraphs). ' +
  'Never output random symbols, broken tokens, or mixed unrelated languages.';

export interface GenerationOptions {
  temperature?: number;
  topP?: number;
}

/**
 * Executes chat completion through Cloudflare Workers AI with automatic fallback
 */
export async function generateChatResponse(
  ai: Ai,
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  newUserMessage: string,
  options: GenerationOptions = {}
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
        max_tokens: 512,
        temperature: options.temperature ?? 0.8,
        top_p: options.topP ?? 0.9,
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
