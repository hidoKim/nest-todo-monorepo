import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../common/exceptions/domain.exception";
import { ErrorCode } from "../common/exceptions/error-code.enum";

// Auth 도메인의 비즈니스 예외.
// 메시지는 일부러 짧고 모호하게 유지한다(특히 InvalidCredentials) — enumeration attack 방지.

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      "Invalid credentials",
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class EmailInUseException extends DomainException {
  constructor() {
    super(
      ErrorCode.AUTH_EMAIL_IN_USE,
      "Email already in use",
      HttpStatus.CONFLICT,
    );
  }
}

export class UserNotFoundException extends DomainException {
  constructor() {
    super(
      ErrorCode.AUTH_USER_NOT_FOUND,
      "User no longer exists",
      HttpStatus.UNAUTHORIZED,
    );
  }
}
