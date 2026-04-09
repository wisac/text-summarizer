import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config';
import { AIService } from './ai.service';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         cache: true,
         expandVariables: true,
         envFilePath: ['.env.local', '.env'],
         load: [appConfig],
      }),
   ],
   controllers: [AppController],
   providers: [AppService , AIService],
})
export class AppModule {}
