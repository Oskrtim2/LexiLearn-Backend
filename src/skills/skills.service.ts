import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './entities/skill.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
  ) {}

  async findAll() {
    return this.skillRepository.find();
  }

  async findOne(id: number) {
    const skill = await this.skillRepository.findOne({
      where: { id },
      relations: { exercises: true },
    });
    if (!skill) throw new NotFoundException(`Habilidad con ID ${id} no encontrada`);
    return skill;
  }

  async create(data: Partial<Skill>) {
    return this.skillRepository.save(data);
  }
}
