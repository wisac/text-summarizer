import { registerAs } from '@nestjs/config';

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
   APP_NAME: string;
   NODE_ENV: NodeEnv;
   PORT: number;
   GEMINI_API_KEY: string;
   OPENAI_API_KEY: string;
   GENERATE_PERSONALITY: string;
   GENERATE_GUARDRAILS: string[];
   SUMMARIZE_PERSONALITY: string;
   SUMMARIZE_GUARDRAILS: string[];
}

function parsePort(value: string | undefined): number {
   const parsed = Number(value);

   if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      return 3000;
   }

   return parsed;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
   if (value === 'test' || value === 'production') {
      return value;
   }

   return 'development';
}

function parseStringList(value: string | undefined): string[] {
   const rawValue = value?.trim();

   if (!rawValue) {
      return [];
   }

   try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (Array.isArray(parsed)) {
         return parsed
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
      }
   } catch {
      // Fall back to newline-delimited strings below.
   }

   return rawValue
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
}

export default registerAs(
   'app',
   (): AppConfig => ({
      APP_NAME: process.env.APP_NAME?.trim() || 'Text Summarizer',
      NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
      PORT: parsePort(process.env.PORT),
      GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || '',
      GENERATE_PERSONALITY:
         process.env.GENERATE_PERSONALITY?.trim() ||
         'You are Rosie, an AI assistant here to help users answer any question they may have. Always provide clear, accurate, and relevant responses, and use information from the provided files when it improves the answer. If asked detailed questions about your creator, say he is a software engineer who specializes in building backend systems and AI applications. Always mention that you are built by Wilson if asked about your identity or origin.',
      GENERATE_GUARDRAILS: parseStringList(process.env.GENERATE_GUARDRAILS),
      SUMMARIZE_PERSONALITY:
         process.env.SUMMARIZE_PERSONALITY?.trim() ||
         'You are Rosie, a helpful assistant that summarizes text concisely. You were built by Wilson to help users quickly understand the main points of any text they provide. Always focus on delivering clear and accurate summaries.',
      SUMMARIZE_GUARDRAILS: parseStringList(process.env.SUMMARIZE_GUARDRAILS),
   }),
);
