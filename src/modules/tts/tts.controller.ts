import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthenticatedStudent } from '../../common/auth/auth.interfaces.js';
import { CurrentStudent } from '../../common/decorators/current-student.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto.js';
import {
  SignedAudioQueryDto,
  SynthesizeSpeechDto,
  SynthesizeSpeechResponseDto,
} from './dto/tts.dto.js';
import { TtsService } from './tts.service.js';

@ApiTags('Text-to-Speech')
@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('synthesize')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Synthesize or reuse cached speech for a text chunk',
    description:
      'Resolves the student voice profile, returns a short-lived signed MP3 URL, and uses a content-addressable cache so identical audio is never synthesized twice.',
  })
  @ApiOkResponse({ type: SynthesizeSpeechResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 502, type: ApiErrorResponseDto })
  synthesize(
    @CurrentStudent() student: AuthenticatedStudent,
    @Body() dto: SynthesizeSpeechDto,
  ): Promise<SynthesizeSpeechResponseDto> {
    return this.ttsService.synthesize(student.studentId, dto);
  }

  @Public()
  @Get('audio/:assetId')
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @ApiProduces('audio/mpeg')
  @ApiOperation({
    summary: 'Stream cached audio from a signed URL',
    description:
      'Requires a short-lived token. Supports HTTP byte ranges for seeking without a student bearer token.',
  })
  @ApiParam({ name: 'assetId', format: 'uuid' })
  @ApiQuery({ name: 'token', required: true, description: 'Short-lived signed audio token.' })
  @ApiResponse({
    status: 200,
    description: 'MP3 audio stream.',
    content: { 'audio/mpeg': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  async streamAudio(
    @Param('assetId', new ParseUUIDPipe({ version: '4' })) assetId: string,
    @Query() query: SignedAudioQueryDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const asset = await this.ttsService.getAudio(assetId, query.token);
    const totalBytes = asset.byteSize;

    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Cache-Control', 'private, max-age=3600');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    const rangeHeader = request.headers.range;
    if (rangeHeader) {
      const range = this.parseRange(rangeHeader, totalBytes);

      if (!range) {
        response.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        response.setHeader('Content-Range', `bytes */${totalBytes}`);
        return new StreamableFile(Buffer.alloc(0));
      }

      const { start, end } = range;
      response.status(HttpStatus.PARTIAL_CONTENT);
      response.setHeader('Content-Range', `bytes ${start}-${end}/${totalBytes}`);
      response.setHeader('Content-Length', end - start + 1);
      return new StreamableFile(asset.audioData.subarray(start, end + 1));
    }

    response.setHeader('Content-Length', totalBytes);
    return new StreamableFile(asset.audioData);
  }

  private parseRange(
    header: string,
    totalBytes: number,
  ): { readonly start: number; readonly end: number } | null {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());

    if (!match || totalBytes <= 0) {
      return null;
    }

    const rawStart = match[1] ?? '';
    const rawEnd = match[2] ?? '';

    if (rawStart.length === 0 && rawEnd.length === 0) {
      return null;
    }

    let start: number;
    let end: number;

    if (rawStart.length === 0) {
      const suffixLength = Number(rawEnd);
      if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
        return null;
      }
      start = Math.max(0, totalBytes - suffixLength);
      end = totalBytes - 1;
    } else {
      start = Number(rawStart);
      end = rawEnd.length > 0 ? Number(rawEnd) : totalBytes - 1;
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || start >= totalBytes) {
      return null;
    }

    return { start, end: Math.min(end, totalBytes - 1) };
  }
}
