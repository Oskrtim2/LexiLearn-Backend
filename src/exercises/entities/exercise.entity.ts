import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Skill } from '../../skills/entities/skill.entity';
import { ExerciseAttempt } from '../../attempts/entities/exercise-attempt.entity';

@Entity({ name: 'exercises' })
export class Exercise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 1 })
  difficulty: number;

  @Column({ type: 'jsonb', default: {} })
  content: any;

  @ManyToOne(() => Skill, (skill) => skill.exercises, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill: Skill;

  @Column({ name: 'skill_id' })
  skillId: number;

  @OneToMany(() => ExerciseAttempt, (attempt) => attempt.exercise)
  attempts: ExerciseAttempt[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
