import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration, validateEnvironment } from './config/configuration.js';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { SecurityModule } from './common/security/security.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { GamificationModule } from './modules/gamification/gamification.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { OcrModule } from './modules/ocr/ocr.module.js';
import { ReadingAssistantModule } from './modules/reading-assistant/reading-assistant.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { TtsModule } from './modules/tts/tts.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      load: [configuration],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('throttle.ttlMs'),
          limit: configService.getOrThrow<number>('throttle.limit'),
        },
      ],
    }),
    PrismaModule,
    SecurityModule,
    AuthModule,
    StudentsModule,
    OcrModule,
    TtsModule,
    ReadingAssistantModule,
    GamificationModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('{*path}');
  }
}
