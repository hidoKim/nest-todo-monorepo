import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../common/exceptions/domain.exception";
import { ErrorCode } from "../common/exceptions/error-code.enum";

// Tag 도메인의 비즈니스 예외.

export class TagNotFoundException extends DomainException {
  constructor(identifier?: string | number) {
    const msg =
      identifier !== undefined && identifier !== ""
        ? `Tag not found: ${identifier}`
        : "Tag not found";
    super(ErrorCode.TAG_NOT_FOUND, msg, HttpStatus.NOT_FOUND);
  }
}

export class TagDuplicateException extends DomainException {
  constructor() {
    super(
      ErrorCode.TAG_DUPLICATE,
      "Tag already exists",
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class TagNameInUseException extends DomainException {
  constructor() {
    super(
      ErrorCode.TAG_NAME_IN_USE,
      "Tag name already in use",
      HttpStatus.BAD_REQUEST,
    );
  }
}
