import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto.js';
import { ProcessTextResponseDto } from './dto/process-text-response.dto.js';
import { ProcessTextDto } from './dto/process-text.dto.js';
import { ReadingAssistantService } from './reading-assistant.service.js';

@ApiTags('Reading Assistant')
@ApiBearerAuth()
@Controller('reading-assistant')
export class ReadingAssistantController {
  constructor(private readonly readingAssistantService: ReadingAssistantService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('process-text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Adapt raw text for accessible reading',
    description:
      'Returns syllable-aware words with stable offsets, clause-aware micro-sentences, estimated reading time, and a readability assessment.',
  })
  @ApiOkResponse({ type: ProcessTextResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  process(@Body() dto: ProcessTextDto): ProcessTextResponseDto {
    return this.readingAssistantService.process(dto);
  }
}
