import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config';

async function bootstrap() {
   const app = await NestFactory.create(AppModule);
   const configService = app.get(ConfigService);
   const appConfig = configService.getOrThrow<AppConfig>('app');

   app.useGlobalPipes(
      new ValidationPipe({
         whitelist: true,
         forbidNonWhitelisted: true,
         transform: true,
         transformOptions: {
            enableImplicitConversion: true, //

         }
      }),
   );

   await app.listen(appConfig.PORT);
   console.log(`${appConfig.APP_NAME} is running on port ${appConfig.PORT}`);
}
bootstrap().catch((error) => {
   console.error('Error starting the server:', error);
});
