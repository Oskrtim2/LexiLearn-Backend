import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
import { Assessment } from './entities/assessment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Assessment])],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
