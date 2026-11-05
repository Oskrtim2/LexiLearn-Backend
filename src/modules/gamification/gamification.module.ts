import { Module } from '@nestjs/common';
import { OcrModule } from '../ocr/ocr.module.js';
import { StudentsModule } from '../students/students.module.js';
import { GamificationController } from './gamification.controller.js';
import { GamificationRepository } from './gamification.repository.js';
import { GamificationService } from './gamification.service.js';

@Module({
  imports: [StudentsModule, OcrModule],
  controllers: [GamificationController],
  providers: [GamificationService, GamificationRepository],
})
export class GamificationModule {}
