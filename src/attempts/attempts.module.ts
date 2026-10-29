import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { ExerciseAttempt } from './entities/exercise-attempt.entity';
import { Exercise } from '../exercises/entities/exercise.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExerciseAttempt, Exercise])],
  controllers: [AttemptsController],
  providers: [AttemptsService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
