import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { parseCorsOrigins } from './common/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // S1: Security headers — must be applied before any other middleware
  app.use(helmet());

  // S5: CORS origins from env (CORS_ORIGINS + CORS_REGEX)
  app.enableCors({
    origin: parseCorsOrigins(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI — available at /api
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Zenkai API')
    .setDescription('Team Activity Dashboard API — multi-tenant, real-time, time-tracked')
    .setVersion('1.1.0-beta')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(3001, '0.0.0.0');
  console.log('Backend running on http://0.0.0.0:3001');
  console.log('Swagger docs at   http://0.0.0.0:3001/api');
}
void bootstrap().catch(console.error);
