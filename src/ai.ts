import { ChatMessage } from './types';

export const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

export const DEFAULT_SYSTEM_PROMPT =
  'You are an intelligent, articulate, and helpful AI assistant on Telegram. ' +
  'Always respond naturally, accurately, and fluently in the language the user addresses you in (Persian / فارسی or English). ' +
  'Provide well-reasoned, direct answers, and format your output cleanly for mobile chat.';

/**
 * Executes chat completion through Cloudflare Workers AI
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

  try {
    const output = (await ai.run(model as any, {
      messages,
      max_tokens: 1024,
      temperature: 0.7,
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
    } else {
      responseText = JSON.stringify(output);
    }

    return responseText.trim();
  } catch (error: any) {
    console.error('Workers AI execution failed:', error);
    throw new Error(`AI generation error: ${error?.message || 'Unknown error'}`);
  }
}
