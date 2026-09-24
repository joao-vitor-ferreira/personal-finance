import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { DecimalSerializerInterceptor } from './common/interceptors/decimal-serializer.interceptor.js';
import type { AppEnvironment } from './config/environment.js';

export function configureApp(app: INestApplication): void {
  const configService =
    app.get<ConfigService<AppEnvironment, true>>(ConfigService);
  const nodeEnvironment = configService.get('NODE_ENV', { infer: true });
  const allowedOrigins = configService
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new DecimalSerializerInterceptor());
  app.useGlobalFilters(
    new ApiExceptionFilter(
      app.get(HttpAdapterHost),
      nodeEnvironment === 'production',
    ),
  );
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Personal Finance API')
    .setDescription(
      'API REST de controle financeiro pessoal. Valores monetários são recebidos e retornados como números JSON com até duas casas decimais e persistidos como Decimal(19,2).',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token retornado por /auth/login ou /auth/register.',
      },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
