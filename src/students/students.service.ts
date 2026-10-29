import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async findAll() {
    return this.studentRepository.find();
  }

  async findOne(id: number) {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: {
        user: true,
        attempts: true,
        assessments: true,
      },
    });
    if (!student) throw new NotFoundException(`Estudiante con ID ${id} no encontrado`);
    return student;
  }

  async create(data: Partial<Student>) {
    return this.studentRepository.save(data);
  }

  async getAttempts(id: number) {
    const student = await this.findOne(id);
    return student.attempts;
  }

  async getAssessment(id: number) {
    const student = await this.findOne(id);
    return student.assessments;
  }
}
