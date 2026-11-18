import { Injectable, Logger } from '@nestjs/common';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  get enabled(): boolean {
    return Boolean(
      process.env.LLM_API_KEY?.trim() &&
        process.env.LLM_BASE_URL?.trim() &&
        process.env.LLM_MODEL?.trim(),
    );
  }

  async complete(messages: LlmMessage[]): Promise<string | null> {
    if (!this.enabled) return null;

    const baseUrl = (process.env.LLM_BASE_URL ?? '').replace(/\/+$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 12_000));

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL,
          messages,
          temperature: 0.2,
          max_tokens: 700,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(`LLM respondió ${response.status}; se usa el motor local.`);
        return null;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      return typeof content === 'string' && content.trim().length > 20 ? content.trim() : null;
    } catch (error) {
      this.logger.warn(`LLM no disponible (${(error as Error).message}); se usa el motor local.`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
