import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedStudent } from '../../common/auth/auth.interfaces.js';
import { CurrentStudent } from '../../common/decorators/current-student.decorator.js';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto.js';
import { ImageUploadPipe, MAX_IMAGE_BYTES } from '../../common/upload/image-upload.pipe.js';
import type { ValidatedImageFile } from '../../common/upload/image-upload.pipe.js';
import { ExtractTextRequestDto, OcrExtractResponseDto } from './dto/ocr.dto.js';
import { OcrService } from './ocr.service.js';

@ApiTags('OCR')
@ApiBearerAuth()
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('extract')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 1,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ExtractTextRequestDto })
  @ApiOperation({
    summary: 'Extract accessible, structured text from a scanned image',
    description:
      'Accepts PNG, JPEG, or WebP under 10 MB, verifies magic bytes, removes scan artifacts, and returns paragraphs, sentence chunk IDs, and offset-addressable words.',
  })
  @ApiCreatedResponse({ type: OcrExtractResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 413, type: ApiErrorResponseDto })
  @ApiResponse({ status: 422, type: ApiErrorResponseDto })
  extract(
    @CurrentStudent() student: AuthenticatedStudent,
    @UploadedFile(new ImageUploadPipe()) file: ValidatedImageFile,
  ): Promise<OcrExtractResponseDto> {
    return this.ocrService.extract(student.studentId, file);
  }
}
