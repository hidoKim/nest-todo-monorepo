import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-code.enum";

/**
 * DomainException은 비즈니스 의미가 있는 예외의 베이스 클래스다.
 *
 * 핵심 동작:
 * - HttpException을 상속해 NestJS가 자연스럽게 잡아내도록 한다.
 * - super()의 첫 인자(response body)에 { errorCode, message, statusCode }를 심어두면
 *   exception filter가 이를 그대로 꺼내 표준 응답 모양으로 변환할 수 있다.
 * - this.errorCode를 별도로 노출해 filter가 instanceof 검사 후 바로 접근 가능.
 *
 * 추상 클래스로 둔 이유: DomainException 자체를 직접 throw하는 코드는 없어야 한다.
 * 항상 의미가 명확한 하위 클래스(TodoNotFoundException 등)를 만들어 던진다.
 */
export abstract class DomainException extends HttpException {
  readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, message: string, status: HttpStatus) {
    super({ errorCode, message, statusCode: status }, status);
    this.errorCode = errorCode;
  }
}
