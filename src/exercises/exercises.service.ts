import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from './entities/exercise.entity';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
  ) {}

  async findAll() {
    return this.exerciseRepository.find();
  }

  async findOne(id: number) {
    const exercise = await this.exerciseRepository.findOne({
      where: { id },
      relations: { skill: true },
    });
    if (!exercise) throw new NotFoundException(`Ejercicio con ID ${id} no encontrado`);
    return exercise;
  }

  async create(data: Partial<Exercise>) {
    return this.exerciseRepository.save(data);
  }
}
