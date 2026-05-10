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

// CreateTodoDto는 할 일 생성에 필요한 데이터 구조를 정의하는 DTO다.
export class CreateTodoDto {
  @ApiProperty({ example: "장보기" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string; // !는 null 또는 undefined가 아니라는 의미다.

  @ApiPropertyOptional({ example: "우유, 계란, 과일" })
  @IsOptional()
  @IsString()
  content?: string; // ?는 값이 null 또는 undefined일 수 있음을 나타낸다.

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
  }) // API 문서에서 listType이 가질 수 있는 값들을 명시하여 Swagger UI에서 드롭다운으로 선택할 수 있도록 한다.
  @IsOptional()
  @IsString()
  listType?: TodoListFilter;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

// UpdateTodoDto는 할 일 업데이트에 필요한 데이터 구조를 정의하는 DTO다.
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
  // Transform 데코레이터는 클래스 변환 시 특정 속성의 값을 변환하는 데 사용된다.
  // 여기서는 completedAt이 null 또는 undefined이거나 빈 문자열인 경우 null로 변환하도록 설정한다.
  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }
    return value;
  })
  // ValidateIf는 특정 조건이 충족될 때만 유효성 검사를 수행하도록 설정하는 조건부 검사기다.
  // 여기서는 값이 null 또는 undefined가 아닌 경우에만 IsDateString 검사를 수행하도록 설정한다.
  // _는 객체를 나타내지만 사용되지 않으므로 밑줄로 명명하여 무시한다. (개발자들의 관례)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  completedAt?: string | null;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

// ReorderItemDto는 개별 할 일 항목의 ID와 새 순서를 나타내는 DTO다.
export class ReorderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order!: number;
}

// ReorderTodosDto는 여러 할 일 항목의 순서를 한 번에 업데이트하는 데 사용되는 DTO다.
export class ReorderTodosDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  // ValidateNested는 클래스 내부의 객체 속성에 대한 유효성 검사를 수행할 때 사용한다.
  // each: true 옵션은 배열의 각 요소에 대해 ReorderItemDto의 유효성 검사를 수행하도록 설정한다.
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}

// TodoResponseDto는 GET/POST/PATCH가 반환하는 todo의 응답 모양을 명시한다.
// 엔티티를 그대로 노출하면 user 관계나 password hash 같은 인접 데이터가 새어나갈 위험이 있어
// 응답 전용 클래스를 분리해 화이트리스트 방식으로 필드를 노출한다.
// service.toResponse가 Todo 엔티티 → 이 DTO 인스턴스로 명시 변환한다.
export class TodoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 7, description: "Owner user id" })
  userId!: number;

  @ApiProperty({ example: "장보기" })
  title!: string;

  @ApiPropertyOptional({ example: "우유, 계란", nullable: true })
  content!: string | null;

  @ApiPropertyOptional({
    example: "2026-05-10T10:00:00.000Z",
    nullable: true,
    description: "완료 시각 (ISO 8601), 미완료면 null",
  })
  completedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  deletedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  trashedAt!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  parentId!: number | null;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiPropertyOptional({ example: "03/25 (수)", nullable: true })
  dueDate!: string | null;

  @ApiProperty({ example: "2026-05-10", description: "리스트 분류용 날짜 (YYYY-MM-DD)" })
  targetDate!: string;

  @ApiPropertyOptional({
    example: "집안일",
    nullable: true,
    description: "태그 이름. 엔티티가 아닌 문자열로 변환되어 반환된다.",
  })
  tag!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

// 단순 액션(연기, 삭제, 복원, 순서 변경 등)이 반환하는 메시지 응답.
export class MessageResponseDto {
  @ApiProperty({ example: "Todo deferred to tomorrow (including children)" })
  message!: string;
}

// TodoQueryDto는 할 일 조회 시 사용할 수 있는 쿼리 매개변수를 정의하는 DTO다.
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
