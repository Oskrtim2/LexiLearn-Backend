import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.exercise.findMany();
  }

  async findOne(id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: { skill: true }
    });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return exercise;
  }

  async create(data: any) {
    return this.prisma.exercise.create({
      data,
    });
  }
}
