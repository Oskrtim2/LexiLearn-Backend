import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Env } from './env.model';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { ExercisesModule } from './exercises/exercises.module';
import { AttemptsModule } from './attempts/attempts.module';
import { AssessmentModule } from './assessment/assessment.module';
import { SkillsModule } from './skills/skills.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService<Env>) => ({
        type: 'postgres',
        host: configService.getOrThrow('POSTGRES_HOST'),
        port: Number(configService.getOrThrow('POSTGRES_PORT')),
        username: configService.getOrThrow('POSTGRES_USER'),
        password: configService.getOrThrow('POSTGRES_PASSWORD'),
        database: configService.getOrThrow('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    StudentsModule,
    ExercisesModule,
    AttemptsModule,
    AssessmentModule,
    SkillsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
