import { Module } from '@nestjs/common';
import { ReadingAssistantController } from './reading-assistant.controller.js';
import { ReadingAssistantService } from './reading-assistant.service.js';
import { MicroChunkerService } from './services/micro-chunker.service.js';
import { ReadabilityService } from './services/readability.service.js';
import { SyllabifierService } from './services/syllabifier.service.js';

@Module({
  controllers: [ReadingAssistantController],
  providers: [ReadingAssistantService, SyllabifierService, MicroChunkerService, ReadabilityService],
  exports: [SyllabifierService],
})
export class ReadingAssistantModule {}
