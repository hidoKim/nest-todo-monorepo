import { ApiProperty } from "@nestjs/swagger";
import { ErrorCode } from "../exceptions/error-code.enum";

/**
 * 모든 에러 응답이 따르는 표준 모양.
 * HttpExceptionFilter가 이 형태로 응답을 직렬화한다.
 * 컨트롤러의 @ApiResponse(4xx/5xx)에 type으로 지정해 Swagger 문서를 통일.
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 404, description: "HTTP 상태 코드" })
  statusCode!: number;

  // enum: ErrorCode → Swagger UI가 가능한 모든 에러 코드를 드롭다운으로 노출.
  // 프론트는 이 enum 값을 참고해 분기 로직을 작성한다.
  @ApiProperty({
    enum: ErrorCode,
    enumName: "ErrorCode",
    example: ErrorCode.TODO_NOT_FOUND,
    description:
      "기계 가독 에러 코드. 프론트는 메시지가 아닌 이 값으로 분기한다.",
  })
  errorCode!: ErrorCode;

  @ApiProperty({
    example: "Todo not found: 42",
    description: "사람이 읽을 수 있는 설명. 카피 변경 가능성 있음.",
  })
  message!: string;

  @ApiProperty({ example: "/todos/42", description: "요청 path" })
  path!: string;

  @ApiProperty({
    example: "2026-05-16T12:34:56.789Z",
    description: "서버 시각 (ISO 8601)",
  })
  timestamp!: string;
}
