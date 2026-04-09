import { GoogleGenAI } from '@google/genai';
import {
   HttpException,
   Injectable,
   UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config';

@Injectable()
export class AIService {
   private ai: GoogleGenAI;

   constructor(private readonly configService: ConfigService) {
      const appConfig = this.configService.getOrThrow<AppConfig>('app');
      this.ai = new GoogleGenAI({ apiKey: appConfig.GEMINI_API_KEY });
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
                  pageLength: response.pageLength
                  
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
         throw new UnprocessableEntityException('Failed to fetch model details');
      }
   }

   async generate(modelName: string, prompt: string) {
      try {
         // const response = await this.ai.models.generateContent({
         //    model: modelName,
         //    contents: prompt
         // });

         const response = await this.ai.models.generateContentStream({
            model: modelName,
            contents: prompt,
         });

         return response

         // console.log('Generation response:', JSON.stringify(response, null, 2));

      //    return {
      //      result: response.text,
      //      metadata: {
      //         model: modelName,
      //          prompt: prompt,
      //        },
      //   };
      } catch (error) {
         console.error(`Error generating content with model ${modelName}:`, error);
         throw new UnprocessableEntityException('Failed to generate content');
      }
   }
}
