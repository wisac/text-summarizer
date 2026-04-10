import {
   ContentListUnion,
   GoogleGenAI,
   HarmBlockThreshold,
   HarmCategory,
} from '@google/genai';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config';

type GenerateInput =
   | string
   | {
        text?: string;
        files?: Array<{
           file: {
              buffer: Buffer;
              mimetype: string;
              originalname?: string;
           };
        }>;
     };

@Injectable()
export class AIService {
   private ai: GoogleGenAI;

   constructor(private readonly configService: ConfigService) {
      const appConfig = this.configService.getOrThrow<AppConfig>('app');

      this.ai = new GoogleGenAI({
         apiKey: appConfig.GEMINI_API_KEY, httpOptions: {
         // apiVersion: 'v1',
      }});
   }

   async listModels(pageSize?: number, pageToken?: string) {
      {
         try {
            const response = await this.ai.models.list({
               config: {
                  pageSize: pageSize || 10,
                  pageToken: pageToken,
               },
            });

            const paginationConfig = response.params.config;
            const models = response.page;
            return {
               models: models,
               pagination: {
                  ...paginationConfig,
                  hasNextPage: paginationConfig?.pageToken ? true : false,
                  pageLength: response.pageLength,
               },
            };
         } catch (error) {
            console.error('Error listing models:', error);
            throw new UnprocessableEntityException('Failed to list AI models');
         }
      }
   }

   async getModelDetails(modelName: string) {
      try {
         const model = await this.ai.models.get({ model: modelName });
         return model;
      } catch (error) {
         console.error(`Error fetching model details for ${modelName}:`, error);
         throw new UnprocessableEntityException(
            'Failed to fetch model details',
         );
      }
   }

   async generate(
      modelName: string,
      input: GenerateInput,
      config?: {
         temperature?: number;
         maxOutputTokens?: number;
         personality?: string;
         guardRails?: string;
      },
   ) {
      try {
         const text = typeof input === 'string' ? input : (input.text ?? '');
         const files = typeof input === 'string' ? [] : (input.files ?? []);

         const fileParts = files.map(({ file }) => ({
            inlineData: {
               mimeType: file.mimetype,
               data: file.buffer.toString('base64'),
            },
         }));

         const contents: ContentListUnion = [{ text: text }, ...fileParts];
         if (!contents.length) {
            throw new UnprocessableEntityException('No content provided');
         }


         const response = await this.ai.models.generateContentStream({
            model: modelName,
            contents,
            config: {
               temperature: config?.temperature,
               maxOutputTokens: config?.maxOutputTokens,
               systemInstruction: {
                  text:
                     config?.personality +
                     '\n\n' +
                    config?.guardRails
               },
               safetySettings: [
                  {
                     category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                     threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                  },
                  {
                     category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                     threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
                  },
                  {
                     category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                     threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                  },
               ],
            },
         });

         return response;
      } catch (error) {
         console.error(
            `Error generating content with model ${modelName}:`,
            error,
         );
         throw new UnprocessableEntityException(
            this.extractErrorMessage(error, 'Failed to generate content'),
         );
      }
   }

   async embed(modelName: string, input: string | string[]) {
      try {
         const response = await this.ai.models.embedContent({
            model: modelName,
            contents: input,
            config: {
               outputDimensionality: 64, // You can adjust this based on your needs and model capabilities
            },
         });

         console.log(response.embeddings);
         return response.embeddings;
      } catch (error) {
         console.error(
            `Error generating embeddings with model ${modelName}:`,
            error,
         );
         throw new UnprocessableEntityException(
            this.extractErrorMessage(error, 'Failed to generate embeddings'),
         );
      }
   }

   private extractErrorMessage(error: unknown, fallback: string): string {
      const objectError =
         typeof error === 'object' && error !== null
            ? (error as Record<string, unknown>)
            : null;

      const directMessage =
         typeof objectError?.message === 'string'
            ? objectError.message
            : typeof error === 'string'
              ? error
              : '';

      if (!directMessage) {
         return fallback;
      }

      const nested = this.extractMessageFromJsonChain(directMessage);
      return nested || directMessage || fallback;
   }

   private extractMessageFromJsonChain(rawMessage: string): string {
      let current: string | Record<string, unknown> = rawMessage.trim();

      for (let i = 0; i < 4; i += 1) {
         if (typeof current === 'string') {
            const parsed = this.tryParseJsonObject(current);
            if (!parsed) {
               return current;
            }
            current = parsed;
         }

         const candidate =
            current.error && typeof current.error === 'object'
               ? (current.error as Record<string, unknown>).message
               : current.message;

         if (typeof candidate !== 'string') {
            return rawMessage.trim();
         }

         current = candidate.trim();
      }

      return typeof current === 'string' ? current : rawMessage.trim();
   }

   private tryParseJsonObject(value: string): Record<string, unknown> | null {
      try {
         const parsed = JSON.parse(value);
         if (typeof parsed === 'object' && parsed !== null) {
            return parsed as Record<string, unknown>;
         }
         return null;
      } catch {
         return null;
      }
   }
}
