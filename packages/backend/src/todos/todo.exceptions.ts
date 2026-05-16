import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../common/exceptions/domain.exception";
import { ErrorCode } from "../common/exceptions/error-code.enum";

// Todo 도메인의 비즈니스 예외 모음.
// service의 throw new XxxException(...) 한 줄이면 filter가 표준 응답으로 변환한다.

export class TodoNotFoundException extends DomainException {
  constructor(id: number | string) {
    super(
      ErrorCode.TODO_NOT_FOUND,
      `Todo not found: ${id}`,
      HttpStatus.NOT_FOUND,
    );
  }
}

// 저장 직후 다시 못 읽는 경우. 사실상 발생 가능성 거의 0이지만 안전장치.
// 의미상 서버 측 일관성 깨짐에 가까우므로 NOT_FOUND 대신 INTERNAL_SERVER_ERROR가 더 정확할 수 있다.
// 다만 외부로 INTERNAL_ERROR가 빈번하게 노출되면 디버그가 어려워져 NOT_FOUND로 유지.
export class TodoLoadFailedException extends DomainException {
  constructor(reason: string) {
    super(ErrorCode.TODO_LOAD_FAILED, reason, HttpStatus.NOT_FOUND);
  }
}

// "삭제/휴지통 상태인데 변경 시도"처럼 사용자 의도에 명확히 알려야 할 케이스.
export class TodoDeletedOrTrashedException extends DomainException {
  constructor(message: string) {
    super(ErrorCode.TODO_DELETED_OR_TRASHED, message, HttpStatus.BAD_REQUEST);
  }
}

export class TodoAlreadyTrashedException extends DomainException {
  constructor() {
    super(
      ErrorCode.TODO_ALREADY_TRASHED,
      "Todo is already in trash",
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class TodoDeferTomorrowTodayOnlyException extends DomainException {
  constructor() {
    super(
      ErrorCode.TODO_DEFER_TOMORROW_TODAY_ONLY,
      "defer-to-tomorrow is only allowed for today list",
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class TodoDeferNextWeekThisWeekOnlyException extends DomainException {
  constructor() {
    super(
      ErrorCode.TODO_DEFER_NEXT_WEEK_THIS_WEEK_ONLY,
      "defer-to-next-week is only allowed for this-week list",
      HttpStatus.BAD_REQUEST,
    );
  }
}

// 자식 생성/이동 시 부모 상태가 유효하지 않음.
export class TodoParentInvalidException extends DomainException {
  constructor(message: string) {
    super(ErrorCode.TODO_PARENT_INVALID, message, HttpStatus.BAD_REQUEST);
  }
}

// reorder 요청의 일부 id가 본인 소유가 아니거나, inactive 항목이 포함된 경우.
export class TodoReorderInvalidException extends DomainException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(ErrorCode.TODO_REORDER_INVALID, message, status);
  }
}
