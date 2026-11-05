import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { StudentResponseDto } from '../../students/dto/student.dto.js';

const normalizeStudentCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const normalizeSequence = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? value.map((item: unknown) => (typeof item === 'string' ? item.trim().toLowerCase() : item))
    : value;

export class LoginPinDto {
  @ApiProperty({ example: 'LEX-001' })
  @Transform(normalizeStudentCode)
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/, { message: 'studentCode has an invalid format' })
  studentCode!: string;

  @ApiProperty({ example: '4821', format: 'password', writeOnly: true })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'pin must contain between 4 and 6 digits' })
  pin!: string;
}

export class LoginQrDto {
  @ApiProperty({
    description: 'Signed QR sign-in token. It can be scanned and submitted by the client.',
  })
  @IsString()
  @MaxLength(4096)
  qrToken!: string;
}

export class LoginVisualDto {
  @ApiProperty({ example: 'LEX-001' })
  @Transform(normalizeStudentCode)
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/, { message: 'studentCode has an invalid format' })
  studentCode!: string;

  @ApiProperty({
    type: [String],
    example: ['star', 'moon', 'leaf'],
    minItems: 3,
    maxItems: 6,
  })
  @Transform(normalizeSequence)
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]{1,30}$/, {
    each: true,
    message: 'each image token must be a lowercase icon identifier',
  })
  imageSequence!: string[];
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token.' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: 43200, description: 'Token lifetime in seconds.' })
  expiresIn!: number;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ type: StudentResponseDto })
  student!: StudentResponseDto;
}

export class GenerateQrTokenDto {
  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'When true, invalidates every previously issued QR token for this student.',
  })
  @IsOptional()
  @IsBoolean()
  rotate?: boolean;
}

export class QrTokenResponseDto {
  @ApiProperty({ description: 'Signed QR sign-in token.' })
  qrToken!: string;

  @ApiProperty({ example: 'LEX-001' })
  studentCode!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ example: 31536000 })
  expiresIn!: number;
}

export class SetVisualTokenDto {
  @ApiProperty({
    type: [String],
    example: ['star', 'moon', 'leaf'],
    minItems: 3,
    maxItems: 6,
    description: 'Sequence of icon identifiers used for visual sign-in.',
  })
  @Transform(normalizeSequence)
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]{1,30}$/, {
    each: true,
    message: 'each image token must be a lowercase icon identifier',
  })
  imageSequence!: string[];
}

export class VisualTokenResponseDto {
  @ApiProperty({ example: 'Visual sign-in is ready.' })
  message!: string;

  @ApiProperty({ example: true })
  visualTokenConfigured!: boolean;
}

export class ChangePinDto {
  @ApiProperty({ example: '4821', format: 'password', writeOnly: true })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'currentPin must contain between 4 and 6 digits' })
  currentPin!: string;

  @ApiProperty({ example: '9274', format: 'password', writeOnly: true })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'newPin must contain between 4 and 6 digits' })
  newPin!: string;
}

export class PinChangedResponseDto {
  @ApiProperty({ example: 'Your new sign-in PIN is ready.' })
  message!: string;
}
