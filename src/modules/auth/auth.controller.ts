import { Body, Controller, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedStudent } from '../../common/auth/auth.interfaces.js';
import { CurrentStudent } from '../../common/decorators/current-student.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto.js';
import { AuthService } from './auth.service.js';
import {
  AuthResponseDto,
  ChangePinDto,
  GenerateQrTokenDto,
  LoginPinDto,
  LoginQrDto,
  LoginVisualDto,
  PinChangedResponseDto,
  QrTokenResponseDto,
  SetVisualTokenDto,
  VisualTokenResponseDto,
} from './dto/auth.dto.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('login/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with student code and short numeric PIN',
    description: 'Rate-limited and temporarily locked after repeated failures.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 429, type: ApiErrorResponseDto })
  loginWithPin(@Body() dto: LoginPinDto): Promise<AuthResponseDto> {
    return this.authService.loginWithPin(dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('login/qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with a signed QR reader token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  loginWithQr(@Body() dto: LoginQrDto): Promise<AuthResponseDto> {
    return this.authService.loginWithQr(dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('login/visual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with a visual icon sequence' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 429, type: ApiErrorResponseDto })
  loginWithVisual(@Body() dto: LoginVisualDto): Promise<AuthResponseDto> {
    return this.authService.loginWithVisual(dto);
  }

  @Post('qr-token')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a QR sign-in token for the current student',
    description: 'Set rotate=true to invalidate all previously printed QR codes.',
  })
  @ApiOkResponse({ type: QrTokenResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  generateQrToken(
    @CurrentStudent() student: AuthenticatedStudent,
    @Body() dto: GenerateQrTokenDto,
  ): Promise<QrTokenResponseDto> {
    return this.authService.generateQrToken(student, dto.rotate ?? false);
  }

  @Post('visual-token')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure the visual icon sign-in sequence' })
  @ApiOkResponse({ type: VisualTokenResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  setVisualToken(
    @CurrentStudent() student: AuthenticatedStudent,
    @Body() dto: SetVisualTokenDto,
  ): Promise<VisualTokenResponseDto> {
    return this.authService.setVisualToken(student, dto);
  }

  @Patch('pin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the current student PIN' })
  @ApiOkResponse({ type: PinChangedResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  changePin(
    @CurrentStudent() student: AuthenticatedStudent,
    @Body() dto: ChangePinDto,
  ): Promise<PinChangedResponseDto> {
    return this.authService.changePin(student, dto);
  }
}
