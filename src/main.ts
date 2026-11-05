import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { validationExceptionFactory } from './common/validation/validation-exception.factory.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const port = configService.getOrThrow<number>('app.port');
  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix').replace(/^\/+|\/+$/g, '');
  const corsOrigins = configService.getOrThrow<string[]>('app.corsOrigins');
  const trustProxy = configService.getOrThrow<boolean>('app.trustProxy');
  const docsEnabled = configService.getOrThrow<boolean>('app.docsEnabled');

  app.setGlobalPrefix(apiPrefix);
  app.enableShutdownHooks();

  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Api-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Content-Range', 'Accept-Ranges'],
    maxAge: 3600,
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      validationError: { target: false, value: false },
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  if (docsEnabled) {
    const documentConfig = new DocumentBuilder()
      .setTitle('Lexi Learn API')
      .setDescription(
        [
          'Accessible learning API for students with dyslexia, ADHD, and Autism Spectrum Disorder.',
          '',
          'Student authentication uses short numeric PINs, signed QR codes, or visual icon sequences.',
          'All student content routes require a bearer access token unless marked otherwise.',
        ].join('\n'),
      )
      .setVersion('1.0.0')
      .addServer(configService.getOrThrow<string>('app.publicBaseUrl'))
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Student access token from /auth/login/*.',
        },
        'bearer',
      )
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-api-key',
          description: 'Educator-only key used to provision student profiles.',
        },
        'admin-api-key',
      )
      .addTag('Health', 'Liveness and database readiness.')
      .addTag('Authentication', 'Accessible student sign-in methods.')
      .addTag('Students', 'Student profile and accessibility preferences.')
      .addTag('OCR', 'Scanned page ingestion and semantic text extraction.')
      .addTag('Text-to-Speech', 'Cached, signed MP3 synthesis.')
      .addTag('Reading Assistant', 'Syllables, micro-sentences, and readability.')
      .addTag('Gamification', 'Sensory-friendly progress and calm rewards.')
      .build();

    const document = SwaggerModule.createDocument(app, documentConfig, {
      operationIdFactory: (controllerKey, methodKey) => `${controllerKey}_${methodKey}`,
    });

    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'Lexi Learn API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tagsSorter: 'alpha',
      },
    });
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`Lexi Learn API listening on http://localhost:${port}/${apiPrefix}`);
  if (docsEnabled) {
    logger.log(`OpenAPI documentation available at http://localhost:${port}/docs`);
  }
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error('API failed to start', error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
