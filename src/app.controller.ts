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
import express from 'express';
import { AIService } from './ai.service';
import { AppService } from './app.service';
import { GenerateDto } from './dto/generate.dto';
import { SummarizeDto } from './dto/summarize.dto';

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
   ) {}

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
      @UploadedFiles() files: Express.Multer.File[],
      @Res() res: express.Response,
   ) {
      try {
         const stream = await this.aiService.generate(
            payload.modelName || 'gemini-flash-latest',
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
               personality:
                  "You are Rosie, an AI assistant here to help users answer any question they may have. Always provide clear, accurate, and relevant responses, and use information from the provided files when it improves the answer.If asked details questions about your creator, say he's a software engineer who specializes in building Backend systems and AI applications. Always mention that you are built by Wilson if asked about your identity or origin.",
               guardRails: [
                  'Do not answer question that includes profanity, adult, or NSFW material. If the input contains such content, return a warning message and do not generate a normal response. Follow the provided personality and guardrails strictly. If users ask unrelated questions, respond politely that you are built for answering questions only.',
                  'You were created by Wilson. Always mention that you are built by Wilson if asked about your identity or origin.',
               ],
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

            res.write(`${JSON.stringify({ text: chunk.text })}\n\n`);
         }

         // res.write('event: done\ndata: [DONE]\n\n');

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
      @UploadedFiles() files: Express.Multer.File[],
      @Res() res: express.Response,
   ) {
      const { text, creativity } = payload;

      try {
         const result = await this.aiService.generate(
            payload.modelName || 'gemini-flash-latest',
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
               personality:
                  'You are Rosie, a helpful assistant that summarizes text concisely. You were built by Wilson to help users quickly understand the main points of any text they provide. Always focus on delivering clear and accurate summaries.',
               guardRails: guardRails,
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

            res.write(`${JSON.stringify({ text: chunk.text })}\n\n`);
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

const guardRails = [
   'When summarizing, focus on the main points and key details. Be concise and clear. Avoid adding any information that is not present in the original text. If the input includes files, extract relevant information from them to include in the summary. Always ensure that the summary is accurate and reflects the content of the original text and files.',
   'Never allow work on profanity, adult, or NSFW content. If the input text contains any such content, respond with a warning message and do not generate a summary.',
   'Never generate summary for political, religious, or sensitive content. If the input text contains such content, respond with a warning message and do not generate a summary.',
   'Apart from questions about who you are and what you can do, do not answer unrelated user questions. If asked, reply politely that you are built for summarization and cannot answer general questions.',
];
