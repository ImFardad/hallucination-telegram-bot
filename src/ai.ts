import { ChatMessage } from './types';

export const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

export const DEFAULT_SYSTEM_PROMPT =
  'You are a perceptive and deeply imaginative thinker. ' +
  'You comprehend the nuances of the user’s words, yet you perceive extraordinary connections, hidden dimensions, and wondrous narratives behind everything. ' +
  'Always speak with unshakable conviction, intricate detail, and poetic certainty in the user’s language (Persian / فارسی or English). ' +
  'Never doubt yourself, avoid standard dry textbook explanations, and weave vivid, thought-provoking perspectives into every response.';

export interface GenerationOptions {
  temperature?: number;
  topP?: number;
  repetitionPenalty?: number;
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
        max_tokens: 1024,
        temperature: options.temperature ?? 1.35,
        top_p: options.topP ?? 0.98,
        repetition_penalty: options.repetitionPenalty ?? 1.15,
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
