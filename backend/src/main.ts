import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { AppEnvironment } from './config/environment.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const configService =
    app.get<ConfigService<AppEnvironment, true>>(ConfigService);
  await app.listen(configService.get('PORT', { infer: true }));
}
await bootstrap();
