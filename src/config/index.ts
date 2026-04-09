import { registerAs } from '@nestjs/config';

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
   APP_NAME: string;
   NODE_ENV: NodeEnv;
   PORT: number;
   GEMINI_API_KEY: string;
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

export default registerAs(
   'app',
   (): AppConfig => ({
      APP_NAME: process.env.APP_NAME?.trim() || 'Text Summarizer',
      NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
      PORT: parsePort(process.env.PORT),
      GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
   }),
);
