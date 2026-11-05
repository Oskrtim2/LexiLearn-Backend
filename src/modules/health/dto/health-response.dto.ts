import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'up' })
  database!: string;

  @ApiProperty({ example: 182.4 })
  uptimeSeconds!: number;

  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiProperty({ example: '2026-11-05T14:11:00.000Z' })
  timestamp!: string;
}
