import {
   BadRequestException,
   Body,
   Controller,
   Get,
   HttpCode,
   Param,
   Post,
   Query,
   Res,
   UploadedFiles,
   UseInterceptors,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AIService } from './ai.service';
import { AppService } from './app.service';
import { AppConfig } from './config';
import { GenerateDto } from './dto/generate.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ModelConfigService } from './model-config.service';

type UploadedFile = {
   buffer: Buffer;
   mimetype: string;
   originalname: string;
};

const TEN_MB = 10 * 1024 * 1024;
const ACCEPTED_DOCUMENT_MIME_TYPES = new Set([
   'application/pdf',
   'text/plain',
   'text/markdown',
   'image/png',
   'image/jpeg',
   'image/jpg',
]);

@Controller()
export class AppController {
   constructor(
      private readonly appService: AppService,
      private readonly aiService: AIService,
      private readonly modelConfigService: ModelConfigService,
      private readonly configService: ConfigService,
   ) {}

   @Get('/model')
   async getActiveModel() {
      const modelName = await this.modelConfigService.getActiveModelName();
      return { modelName };
   }

   @Post('/model')
   async updateActiveModel(@Body() payload: UpdateModelDto) {
      const modelName = await this.modelConfigService.updateActiveModelName(
         payload.modelName,
      );

      return {
         message: 'Active model updated successfully',
         modelName,
      };
   }

   @Get('/models')
   listModels(
      @Query('pageSize') pageSize?: number,
      @Query('pageToken') pageToken?: string,
   ) {
      return this.aiService.listModels(pageSize, pageToken);
   }

   @Get('/models/:modelName')
   getModelDetails(@Param('modelName') modelName: string) {
      return this.aiService.getModelDetails(modelName);
   }

   @Post('/generate')
   @HttpCode(200)
   @UseInterceptors(
      FilesInterceptor('files', 5, {
         limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
            files: 5,
         },
         fileFilter: (_, file, cb) => {
            if (!ACCEPTED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
               return cb(
                  new BadRequestException(
                     `Unsupported file type: ${file.mimetype}`,
                  ),
                  false,
               );
            }
            cb(null, true);
         },
      }),
   )
   async generateContent(
      @Body() payload: GenerateDto,
      @UploadedFiles() files: UploadedFile[],
      @Res() res: Response,
   ) {
      console.log('Received generate request with payload:', payload);
      try {
         const appConfig = this.configService.getOrThrow<AppConfig>('app');
         const modelName = await this.modelConfigService.getActiveModelName();
         const stream = await this.aiService.generate(
            modelName,
            {
               text: payload.prompt,
               files: files?.map((file) => ({
                  file: {
                     buffer: file.buffer,
                     mimetype: file.mimetype,
                     originalname: file.originalname,
                  },
               })),
            },
            {
               personality: appConfig.GENERATE_PERSONALITY,
               guardRails: appConfig.GENERATE_GUARDRAILS,
            },
         );

         res.setHeader('Content-Type', 'text/event-stream');
         res.setHeader('Cache-Control', 'no-cache');
         res.setHeader('Connection', 'keep-alive');
         res.flushHeaders();

         for await (const chunk of stream) {
            if (!chunk.text) {
               continue;
            }

            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
         }

         res.write('event: done\ndata: [DONE]\n\n');
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Failed to generate content';

         res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
      } finally {
         res.end();
      }
   }


   @Post('/summarize')
   @HttpCode(200)
   @UseInterceptors(
      FilesInterceptor('files', 5, {
         limits: {
            fileSize: TEN_MB,
            files: 5,
         },
         fileFilter: (_, file, cb) => {
            if (!ACCEPTED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
               return cb(
                  new BadRequestException(
                     `Unsupported file type: ${file.mimetype}`,
                  ),
                  false,
               );
            }
            cb(null, true);
         },
      }),
   )
   async summarize(
      @Body() payload: SummarizeDto,
      @UploadedFiles() files: UploadedFile[],
      @Res() res: Response,
   ) {
      console.log('Received summarize request with payload:', payload);
      const { text, creativity } = payload;

      try {
         const appConfig = this.configService.getOrThrow<AppConfig>('app');
         const modelName = await this.modelConfigService.getActiveModelName();
         const result = await this.aiService.generate(
            modelName,
            {
               text: `Summarize the following text:"\n\n${text}`,
               files: files?.map((file) => ({
                  file: {
                     buffer: file.buffer,
                     mimetype: file.mimetype,
                     originalname: file.originalname,
                  },
               })),
            },
            {
               temperature: creativity, // Lower temperature for more focused summaries
               personality: appConfig.SUMMARIZE_PERSONALITY,
               guardRails: appConfig.SUMMARIZE_GUARDRAILS,
            },
         );

         res.setHeader('Content-Type', 'text/event-stream');
         res.setHeader('Cache-Control', 'no-cache');
         res.setHeader('Connection', 'keep-alive');
         res.flushHeaders();

         for await (const chunk of result) {
            if (!chunk.text) {
               continue;
            }

            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
         }

         res.write('event: done\ndata: [DONE]\n\n');
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Failed to generate content';

         res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
      } finally {
         res.end();
      }
   }
}
