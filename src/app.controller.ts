import {
   BadRequestException,
   Body,
   Controller,
   Get,
   Param,
   Post,
   Query,
   Res,
   UploadedFiles,
   UseInterceptors,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { GenerateDto } from './dto/generate.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { AIService } from './ai.service';
import { Express, Response } from 'express';

const TEN_MB = 10 * 1024 * 1024;
const ACCEPTED_DOCUMENT_MIME_TYPES = new Set([
   'application/pdf',
   'application/msword',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'application/vnd.oasis.opendocument.text',
   'application/rtf',
   'text/plain',
   'text/markdown',
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

   // async generateContent(
   //    @Body() payload: GenerateDto,
   //    @UploadedFiles() files: Express.Multer.File[],
   //    @Res() res: Response,
   // ) {
   //    res.setHeader('Content-Type', 'text/event-stream');
   //    res.setHeader('Cache-Control', 'no-cache');
   //    res.setHeader('Connection', 'keep-alive');
   //    res.flushHeaders();

   //    try {
   //       const uploadedFiles = files ?? [];
   //       for (const file of uploadedFiles) {
   //          if ((file.size ?? 0) > TEN_MB) {
   //             throw new BadRequestException(
   //                `File ${file.originalname ?? ''} exceeds max size of 10MB`,
   //             );
   //          }
   //       }

   //       const stream = await this.aiService.generateStream(payload.modelName, {
   //          text: payload.prompt,
   //          files: uploadedFiles.map((file) => ({ file })),
   //       });

   //       for await (const chunk of stream) {
   //          if (!chunk.text) {
   //             continue;
   //          }

   //          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
   //       }

   //       res.write('event: done\ndata: [DONE]\n\n');
   //    } catch (error) {
   //       const message =
   //          error instanceof Error
   //             ? error.message
   //             : 'Failed to generate content';

   //       res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
   //    } finally {
   //       res.end();
   //    }
   // }

   @Post('/summarize')
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
   ) {
      const { text, creativity } = payload;

      const result = await this.aiService.generate(
         payload.modelName || 'gemini-2.5-flash',
         {
            text: `Summarize the following text:"\n\n${text}`,
            files: files?.map(file => ({
               file: {
                  buffer: file.buffer,
                  mimetype: file.mimetype,
                  originalname: file.originalname,
               },
            }))
         },
         {
            temperature: creativity, // Lower temperature for more focused summaries
            personality:
               'You are Rosie, a helpful assistant that summarizes text concisely. You were built by Wilson to help users quickly understand the main points of any text they provide. Always focus on delivering clear and accurate summaries.',
            guardRails: guardRails,
         },
      );

      return {
         summary: result?.trim(),
      };
   }
}

const guardRails = [
   'When summarizing, focus on the main points and key details. Be concise and clear. Avoid adding any information that is not present in the original text. If the input includes files, extract relevant information from them to include in the summary. Always ensure that the summary is accurate and reflects the content of the original text and files.',
   'Never allow work on profanity, adult, or NSFW content. If the input text contains any such content, respond with a warning message and do not generate a summary.',
   'Never generate summary for political, religious, or sensitive content. If the input text contains such content, respond with a warning message and do not generate a summary.',
   "Apart from questions related to who yoy are and what you can do,don't answer any questions the user ask you. If the user ask you any question, respond with a friendly message saying your're only built for summarization and can't answer questions.",

];
