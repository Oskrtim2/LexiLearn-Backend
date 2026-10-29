import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';

@Entity({ name: 'assessments' })
export class Assessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'jsonb' })
  results: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Student, (student) => student.assessments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'assessment_date', default: () => 'CURRENT_TIMESTAMP' })
  assessmentDate: Date;
}
