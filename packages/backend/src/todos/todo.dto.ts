import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export type TodoListFilter = "today" | "tomorrow" | "this-week" | "next-week";

export class CreateTodoDto {
  @ApiProperty({ example: "장보기" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: "우유, 계란, 과일" })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiPropertyOptional({ example: "집안일" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @ApiPropertyOptional({ example: "03/25 (수)" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dueDate?: string;

  @ApiPropertyOptional({
    enum: ["today", "tomorrow", "this-week", "next-week"],
  })
  @IsOptional()
  @IsString()
  listType?: TodoListFilter;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateTodoDto {
  @ApiPropertyOptional({ example: "장보기 (수정)" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: "우유, 계란, 과일, 치즈" })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: "준비물" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @ApiPropertyOptional({ example: "04/01 (월)" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dueDate?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: "ISO date string or null",
    example: "2026-03-26T10:00:00.000Z",
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }
    return value;
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  completedAt?: string | null;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ReorderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderTodosDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}

export class TodoQueryDto {
  @ApiPropertyOptional({
    enum: ["today", "tomorrow", "this-week", "next-week"],
  })
  @IsOptional()
  @IsString()
  list?: TodoListFilter;

  @ApiPropertyOptional({ example: "집안일" })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ example: "장보기" })
  @IsOptional()
  @IsString()
  keyword?: string;
}
