import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';

@Entity({ name: 'exercise_attempts' })
export class ExerciseAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'boolean', name: 'is_correct' })
  isCorrect: boolean;

  @Column({ type: 'int', name: 'time_taken', nullable: true })
  timeTaken: number;

  @Column({ type: 'jsonb', name: 'answer_data', nullable: true })
  answerData: any;

  @ManyToOne(() => Student, (student) => student.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => Exercise, (exercise) => exercise.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ name: 'exercise_id' })
  exerciseId: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'attempt_date', default: () => 'CURRENT_TIMESTAMP' })
  attemptDate: Date;
}
