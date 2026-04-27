import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: '집안일' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;
}

export class UpdateTagDto {
  @ApiProperty({ example: '준비물' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;
}
