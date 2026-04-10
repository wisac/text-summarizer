import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import appConfig from './config';
import { AIService } from './ai.service';
import { AppService } from './app.service';
import { ModelConfigService } from './model-config.service';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         cache: true,
         expandVariables: true,
         envFilePath: ['.env.local', '.env'],
         load: [appConfig],
      }),
      ServeStaticModule.forRoot({
         rootPath: join(__dirname, '..', 'public'),
      }),
   ],
   controllers: [AppController],
   providers: [AIService, AppService, ModelConfigService],
})
export class AppModule {}
