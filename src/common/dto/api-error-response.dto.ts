import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code.' })
  statusCode!: number;

  @ApiProperty({
    example: '2026-11-05T14:11:00.000Z',
    description: 'ISO-8601 timestamp of the error.',
  })
  timestamp!: string;

  @ApiProperty({
    example: '/api/v1/ocr/extract',
    description: 'Request path that produced the error.',
  })
  path!: string;

  @ApiProperty({ example: 'Bad Request', description: 'HTTP status reason.' })
  error!: string;

  @ApiProperty({
    type: [String],
    example: ['image must be a valid image file buffer'],
    description: 'One or more safe, actionable error messages.',
  })
  message!: string[];
}
