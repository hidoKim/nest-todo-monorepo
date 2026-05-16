import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { DomainException } from "../exceptions/domain.exception";
import { ErrorCode } from "../exceptions/error-code.enum";

/**
 * 전역 예외 필터.
 * APP_FILTER 토큰으로 등록해 모든 라우트의 예외를 가로챈다.
 *
 * 3단 분기:
 *  1) DomainException — 우리가 정의한 비즈니스 예외. errorCode를 그대로 사용.
 *  2) HttpException   — NestJS 기본(가드, ValidationPipe 등). status로부터 코드 유추.
 *  3) 그 외           — 알 수 없는 에러(=버그). 메시지를 외부로 노출하지 않고 로그만 남김.
 *
 * @Catch() 인자를 비워두면 모든 예외를 잡는다.
 * @Catch(HttpException)으로 좁히면 일반 Error는 다른 곳으로 흘러가는데, 그러면
 * 표준 응답 모양이 깨지므로 모두 잡아 처리하는 게 안전하다.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const timestamp = new Date().toISOString();
    const path = request.url;

    // ── 1. DomainException ──
    if (exception instanceof DomainException) {
      const status = exception.getStatus();
      response.status(status).json({
        statusCode: status,
        errorCode: exception.errorCode,
        message: exception.message,
        path,
        timestamp,
      });
      return;
    }

    // ── 2. NestJS HttpException ──
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      response.status(status).json({
        statusCode: status,
        errorCode: this.mapStatusToErrorCode(status, res),
        message: this.extractMessage(res),
        path,
        timestamp,
      });
      return;
    }

    // ── 3. Unknown / 5xx ──
    // 알 수 없는 예외는 내부 메시지를 외부로 흘리지 않는다.
    // 스택 트레이스는 서버 로그에만 기록.
    this.logger.error(
      "Unhandled exception",
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_ERROR,
      message: "Internal server error",
      path,
      timestamp,
    });
  }

  /**
   * NestJS HttpException.getResponse()는 string 또는 객체.
   * ValidationPipe는 { message: string[] | string, error: string, statusCode } 형태로 던진다.
   * 배열이면 콤마로 합쳐 단일 문자열로 만든다.
   */
  private extractMessage(res: string | object): string {
    if (typeof res === "string") {
      return res;
    }
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.message)) {
      return (obj.message as string[]).join(", ");
    }
    if (typeof obj.message === "string") {
      return obj.message;
    }
    return "Unknown error";
  }

  /**
   * 도메인 코드가 없는 HttpException은 상태 코드로부터 의미를 유추한다.
   * ValidationPipe(BadRequest + message 배열)는 VALIDATION_FAILED로 매핑.
   * JwtAuthGuard 같은 가드의 UnauthorizedException은 AUTH_NOT_AUTHENTICATED로 매핑.
   */
  private mapStatusToErrorCode(
    status: number,
    res: string | object,
  ): ErrorCode | string {
    if (status === HttpStatus.BAD_REQUEST) {
      const obj = typeof res === "object" ? (res as Record<string, unknown>) : null;
      if (obj && Array.isArray(obj.message)) {
        return ErrorCode.VALIDATION_FAILED;
      }
      return "BAD_REQUEST";
    }
    if (status === HttpStatus.UNAUTHORIZED) {
      return ErrorCode.AUTH_NOT_AUTHENTICATED;
    }
    if (status === HttpStatus.NOT_FOUND) {
      return "NOT_FOUND";
    }
    if (status === HttpStatus.CONFLICT) {
      return "CONFLICT";
    }
    return `HTTP_${status}`;
  }
}
