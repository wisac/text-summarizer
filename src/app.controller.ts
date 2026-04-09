import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { GenerateDto } from './dto/generate.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { AIService } from './ai.service';

@Controller()
export class AppController {
   constructor(
      private readonly appService: AppService,
      private readonly aiService: AIService,
   ) {}

   @Get()
   getHello(): string {
      return this.appService.getHello();
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
   generateContent(@Body() payload: GenerateDto) {
      return this.aiService.generate(payload.modelName, payload.prompt);
   }

   @Post('/summarize')
   summarize(@Body() payload: SummarizeDto): string {
      const { text } = payload;
      console.log(payload);
      console.log('Received text for summarization:', text);

      return 'This is a text summarizer API.';
   }
}
