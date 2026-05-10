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

// 응답 전용 DTO. Tag 엔티티엔 user/todos 관계가 달려있어 직접 노출하면 위험.
// 안전하게 노출할 필드만 골라 화이트리스트로 둔다.
export class TagResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 7 })
  userId!: number;

  @ApiProperty({ example: '집안일' })
  name!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
