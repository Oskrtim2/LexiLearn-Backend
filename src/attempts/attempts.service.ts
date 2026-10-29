import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExerciseAttempt } from './entities/exercise-attempt.entity';
import { Exercise } from '../exercises/entities/exercise.entity';

@Injectable()
export class AttemptsService {
  constructor(
    @InjectRepository(ExerciseAttempt)
    private readonly attemptRepository: Repository<ExerciseAttempt>,
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
  ) {}

  async submitAttempt(studentId: number, exerciseId: number, answerData: any, timeTaken: number) {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: exerciseId },
    });

    if (!exercise) throw new NotFoundException(`Ejercicio con ID ${exerciseId} no encontrado`);

    const isCorrect = answerData?.isCorrect === true;
    const score = isCorrect ? 100 : 0;

    const attempt = await this.attemptRepository.save({
      studentId,
      exerciseId,
      score,
      isCorrect,
      timeTaken,
      answerData,
    });

    return {
      message: 'Intento registrado con éxito',
      data: attempt,
    };
  }
}
