import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  addDays,
  getDateAfterDaysString,
  getDateOnlyString,
  getNextWeekRange,
  getThisWeekRange,
  getTodayDate,
  getTomorrowDate,
  parseDateOnlyString,
} from "../utils/date.util";
import { TagsService } from "../tags/tag.service";
import {
  CreateTodoDto,
  ReorderTodosDto,
  TodoListFilter,
  TodoQueryDto,
  UpdateTodoDto,
} from "./todo.dto";
import { Todo } from "./todo.entity";

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo) // TypeORM의 Repository를 주입하기 위한 데코레이터. Todo 엔티티에 대한 Repository를 주입한다.
    private readonly todoRepository: Repository<Todo>, // <Todo> 제네릭을 사용하여 Repository가 Todo 엔티티를 관리하도록 지정한다.
    private readonly tagsService: TagsService,
  ) {}

  // applyActiveScope는 할 일 조회 시 삭제되거나 휴지통에 있는 항목을 제외하는 공통 조건을 쿼리에 적용하는 헬퍼 메서드다.
  private applyActiveScope(
    // <Todo> 제네릭을 사용하여 Repository의 createQueryBuilder가 Todo 엔티티에 대한 쿼리 빌더를 반환하도록 지정한다.
    query: ReturnType<Repository<Todo>["createQueryBuilder"]>,
  ) {
    return query
      .andWhere("todo.deletedAt IS NULL")
      .andWhere("todo.trashedAt IS NULL");
  }

  // resolveTagId는 태그 이름을 받아 해당 태그의 ID를 반환하는 헬퍼 메서드다. 태그 이름이 제공되지 않으면 null을 반환한다.
  private async resolveTagId(tagName?: string): Promise<number | null> {
    // Promise<number | null>은 이 메서드가 number 또는 null을 반환하는 비동기 함수임을 나타낸다.
    if (!tagName) {
      return null;
    }

    const tag = await this.tagsService.findByName(tagName); // 태그 이름으로 태그를 조회한다.
    if (!tag) {
      throw new BadRequestException(`Tag not found: ${tagName}`); // 태그가 존재하지 않으면 BadRequestException을 던진다.
    }

    return tag.id; // 태그가 존재하면 해당 태그의 ID를 반환한다.
  }

  // getDateRangeForList는 리스트 유형에 따라 해당 날짜 범위를 계산하여 반환하는 헬퍼 메서드다.
  private getDateRangeForList(listType: TodoListFilter): {
    // TodoListFilter는 "today", "tomorrow", "this-week", "next-week" 중 하나의 문자열을 허용하는 타입이다.
    start: string;
    end: string;
  } {
    if (listType === "today") {
      const today = getDateOnlyString(getTodayDate());
      return { start: today, end: today };
    }

    if (listType === "tomorrow") {
      const tomorrow = getDateOnlyString(getTomorrowDate());
      return { start: tomorrow, end: tomorrow };
    }

    if (listType === "this-week") {
      const range = getThisWeekRange();
      return {
        start: getDateOnlyString(range.start),
        end: getDateOnlyString(range.end),
      };
    }

    const range = getNextWeekRange();
    return {
      start: getDateOnlyString(range.start),
      end: getDateOnlyString(range.end),
    };
  }

  // getExistingTodo는 ID로 할 일을 조회하여 반환하는 헬퍼 메서드다.
  private async getExistingTodo(id: number): Promise<Todo> {
    const todo = await this.todoRepository.findOne({
      where: { id },
      relations: { tag: true },
    });

    if (!todo) {
      throw new NotFoundException(`Todo not found: ${id}`); // 할 일이 존재하지 않으면 NotFoundException을 던진다.
    }

    return todo; // 할 일이 존재하면 해당 할 일 엔티티를 반환한다.
  }

  // getSubtreeIds는 주어진 루트 ID를 포함하여 해당 할 일과 모든 자식 할 일들의 ID를 재귀적으로 조회하여 반환하는 너비 우선 탐색 헬퍼 메서드다.
  private async getSubtreeIds(rootId: number): Promise<number[]> {
    // Promise<number[]>는 이 메서드가 number 배열을 반환하는 비동기 함수임을 나타낸다.
    const allIds = new Set<number>([rootId]);
    // Set<number>을 사용하여 중복된 ID를 방지한다. <number>는 number만 들어올 수 있다. 초기값으로 루트 ID를 포함한다.
    const queue: number[] = [rootId]; // 너비 우선 탐색을 위한 큐를 초기화한다. 초기값으로 루트 ID를 포함한다.

    while (queue.length > 0) {
      const batch = queue.splice(0, queue.length);
      // splice(0, queue.length)는 큐의 모든 요소를 추출하여 batch 배열로 만든다.
      // 이렇게 하면 큐가 비워지고 batch에는 현재 레벨의 모든 ID가 들어있게 된다.
      const children = await this.todoRepository.find({
        where: { parentId: In(batch) }, // In(batch)는 parentId가 batch 배열에 포함된 모든 자식 할 일을 조회한다.
        select: ["id"], // ID만 조회하여 불필요한 데이터 로드를 방지한다.
      });

      for (const child of children) {
        // 자식 할 일들의 ID를 순회한다.
        if (!allIds.has(child.id)) {
          // 이미 처리된 ID인지 확인한다. 중복된 ID는 처리하지 않는다.
          allIds.add(child.id); // 새로운 ID를 Set에 추가한다.
          queue.push(child.id); // 새로운 ID를 큐에 추가하여 다음 레벨에서 해당 할 일의 자식들을 조회할 수 있도록 한다.
        }
      }
    }

    return Array.from(allIds); // Set에 저장된 모든 ID를 Array로 변환하여 반환한다.
  }

  // toResponse는 Todo 엔티티를 API 응답에 적합한 형태로 변환하는 헬퍼 메서드다. 여기서는 태그 이름을 포함하도록 변환한다.
  private toResponse(todo: Todo): Record<string, unknown> {
    // Record<string, unknown>는 문자열 키와 알 수 없는 값으로 구성된 객체를 나타내는 타입이다. API 응답으로 반환할 객체의 형태를 정의한다.
    return {
      ...todo, // ...todo는 Todo 엔티티의 모든 속성을 포함한다.
      tag: todo.tag?.name ?? null,
      // tag?는 todo.tag가 존재할 때만 name 속성을 접근한다. tag가 존재하지 않으면 null을 반환한다.
      // ?? null은 todo.tag?.name이 undefined인 경우 null로 대체한다.
      // 이렇게 하면 tag가 없는 경우에도 API 응답에서 tag 필드가 null로 명확하게 나타나도록 한다.
    };
  }

  // create는 새로운 할 일을 생성하는 메서드다. CreateTodoDto를 받아서 할 일을 생성하고, 생성된 할 일의 정보를 반환한다.
  async create(createTodoDto: CreateTodoDto): Promise<Record<string, unknown>> {
    // Promise<Record<string, unknown>>는 이 메서드가 Record<string, unknown> 타입의 객체를 반환하는 비동기 함수임을 나타낸다.

    // getTodayDate()로 오늘 날짜를 가져와서 getDateOnlyString()으로 날짜 부분만 문자열로 변환하여 targetDate의 초기값으로 설정한다.
    let targetDate = getDateOnlyString(getTodayDate());

    if (createTodoDto.listType) {
      // listType 필드가 제공된 경우 해당 리스트 유형에 맞는 날짜 범위를 계산하여 targetDate를 설정한다.
      const { start } = this.getDateRangeForList(createTodoDto.listType);
      targetDate = start;
    }

    if (createTodoDto.parentId) {
      // parentId 필드가 제공된 경우 해당 부모 할 일을 조회하고, deletedAt 또는 trashedAt이 설정되어 있으면 예외를 던진다.
      const parent = await this.getExistingTodo(createTodoDto.parentId);
      if (parent.deletedAt || parent.trashedAt) {
        throw new BadRequestException(
          "Cannot add child to deleted or trashed parent",
        );
      }
      targetDate = parent.targetDate;
    }

    const tagId = await this.resolveTagId(createTodoDto.tag);
    // resolveTagId 헬퍼 메서드를 사용하여 태그 이름을 태그 ID로 변환한다.
    const todo = this.todoRepository.create({
      // Repository의 create() 메서드를 사용하여 새로운 Todo 엔티티 인스턴스를 생성한다.
      // 이 메서드는 실제로 데이터베이스에 저장하지는 않고, 단지 엔티티 객체를 생성하는 역할을 한다.
      title: createTodoDto.title,
      content: createTodoDto.content ?? null,
      parentId: createTodoDto.parentId ?? null,
      order: createTodoDto.order ?? 0,
      dueDate: createTodoDto.dueDate ?? null,
      targetDate,
      tagId,
    });

    const saved = await this.todoRepository.save(todo);
    const loaded = await this.todoRepository.findOne({
      where: { id: saved.id },
      relations: { tag: true },
    });

    if (!loaded) {
      throw new NotFoundException("Failed to load created todo");
    }

    return this.toResponse(loaded);
  }

  async findAll(query: TodoQueryDto): Promise<Record<string, unknown>[]> {
    const qb = this.todoRepository
      .createQueryBuilder("todo")
      .leftJoinAndSelect("todo.tag", "tag")
      .orderBy("todo.order", "ASC")
      .addOrderBy("todo.createdAt", "ASC");
    // createQueryBuilder로 Todo 엔티티 쿼리빌더를 생성하고, leftJoinAndSelect로 태그 정보를 조인하여 함께 조회한다.
    // orderBy로 order 필드를 기준으로 오름차순 정렬하고, order 값이 같은 경우 createdAt을 기준으로 오름차순 정렬한다.

    // applyActiveScope 헬퍼 메서드를 사용하여 삭제되거나 휴지통에 있는 항목을 제외하는 공통 조건을 쿼리에 적용한다.
    this.applyActiveScope(qb);

    if (query.list) {
      // list 필드가 제공된 경우 해당 리스트에 맞는 날짜 범위를 계산하여 쿼리에 적용한다.
      const { start, end } = this.getDateRangeForList(query.list);
      qb.andWhere("todo.targetDate BETWEEN :start AND :end", { start, end });
    }

    if (query.tag) {
      // tag 필드가 제공된 경우 해당 태그 이름과 일치하는 할 일을 조회한다.
      qb.andWhere("tag.name = :tagName", { tagName: query.tag });
    }

    if (query.keyword) {
      // keyword 필드가 제공된 경우 해당 키워드와 일치하는 할 일을 조회한다.
      qb.andWhere(
        "(LOWER(todo.title) LIKE :keyword OR LOWER(todo.content) LIKE :keyword)",
        {
          keyword: `%${query.keyword.toLowerCase()}%`,
        },
      );
    }

    const todos = await qb.getMany();
    return todos.map((todo) => this.toResponse(todo)); // 조회된 할 일 엔티티 배열을 API 응답에 적합한 형태로 변환하여 반환한다.
  }

  // findByList는 특정 리스트 유형에 해당하는 할 일들을 조회하여 반환하는 메서드다. 내부적으로 findAll을 호출하여 리스트 필터를 적용한다.
  async findByList(
    listType: TodoListFilter,
  ): Promise<Record<string, unknown>[]> {
    return this.findAll({ list: listType });
  }

  // findOne는 ID로 특정 할 일을 조회하여 반환하는 메서드다.
  // 삭제되거나 휴지통에 있는 항목은 조회할 수 없도록 예외를 던진다.
  async findOne(id: number): Promise<Record<string, unknown>> {
    const todo = await this.getExistingTodo(id);

    if (todo.deletedAt || todo.trashedAt) {
      throw new NotFoundException(`Todo is deleted or in trash: ${id}`);
    }

    return this.toResponse(todo);
  }

  // update는 ID로 특정 할 일을 조회하여 UpdateTodoDto의 필드로 업데이트하는 메서드다.
  async update(
    id: number,
    updateTodoDto: UpdateTodoDto,
  ): Promise<Record<string, unknown>> {
    const todo = await this.getExistingTodo(id);

    // 삭제되거나 휴지통에 있는 항목은 업데이트할 수 없도록 예외를 던진다.
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot update deleted or trashed todo");
    }

    // UpdateTodoDto의 각 필드가 undefined가 아닌 경우에만 해당 필드를 업데이트한다.
    // content, dueDate, order, completedAt 필드도 동일한 방식으로 업데이트한다.
    if (updateTodoDto.title !== undefined) {
      todo.title = updateTodoDto.title;
    }
    if (updateTodoDto.content !== undefined) {
      todo.content = updateTodoDto.content;
    }
    if (updateTodoDto.dueDate !== undefined) {
      todo.dueDate = updateTodoDto.dueDate;
    }
    if (updateTodoDto.order !== undefined) {
      todo.order = updateTodoDto.order;
    }
    if (updateTodoDto.completedAt !== undefined) {
      todo.completedAt = updateTodoDto.completedAt
        ? new Date(updateTodoDto.completedAt)
        : null;
    }

    // tag 필드는 특별히 처리하여, 빈 문자열인 경우 태그를 제거하고, 그렇지 않은 경우 해당 태그 이름으로 태그를 조회하여 설정한다.
    if (updateTodoDto.tag !== undefined) {
      const nextTagName = updateTodoDto.tag.trim(); // 태그 이름에서 양쪽 공백을 제거한다.
      if (nextTagName === "") {
        todo.tagId = null;
        todo.tag = null;
      } else {
        const nextTag = await this.tagsService.findByName(nextTagName);
        if (!nextTag) {
          throw new BadRequestException(`Tag not found: ${nextTagName}`);
        }
        todo.tagId = nextTag.id;
        todo.tag = nextTag;
      }
    }

    // 업데이트된 할 일 엔티티를 저장한다. save() 메서드는 엔티티가 이미 존재하는 경우 업데이트하고, 존재하지 않는 경우 새로 생성한다.
    const saved = await this.todoRepository.save(todo);
    // 저장된 엔티티를 다시 조회하여 태그 정보를 포함한 완전한 할 일 정보를 가져온다.
    const loaded = await this.todoRepository.findOne({
      where: { id: saved.id },
      relations: { tag: true },
    });

    if (!loaded) {
      throw new NotFoundException("Failed to load updated todo");
    }

    // toResponse 헬퍼 메서드를 사용하여 업데이트된 할 일 엔티티를 API 응답에 적합한 형태로 변환하여 반환한다.
    return this.toResponse(loaded);
  }

  // complete는 ID로 특정 할 일을 조회하여 completedAt 필드를 현재 시간으로 설정하는 메서드다. 삭제되거나 휴지통에 있는 항목은 완료할 수 없도록 예외를 던진다.
  async complete(id: number): Promise<Record<string, unknown>> {
    const todo = await this.getExistingTodo(id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot complete deleted or trashed todo");
    }

    todo.completedAt = new Date(); // completedAt 필드를 현재 시간으로 설정하여 완료 상태로 표시한다.
    const saved = await this.todoRepository.save(todo);
    const loaded = await this.todoRepository.findOne({
      where: { id: saved.id },
      relations: { tag: true },
    });

    if (!loaded) {
      throw new NotFoundException("Failed to load completed todo");
    }

    return this.toResponse(loaded);
  }

  // incomplete는 ID로 특정 할 일을 조회하여 completedAt 필드를 null로 설정하는 메서드다. 삭제되거나 휴지통에 있는 항목은 미완료로 표시할 수 없도록 예외를 던진다.
  async incomplete(id: number): Promise<Record<string, unknown>> {
    const todo = await this.getExistingTodo(id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException(
        "Cannot mark incomplete for deleted or trashed todo",
      );
    }

    todo.completedAt = null; // completedAt 필드를 null로 설정하여 미완료 상태로 표시한다.
    const saved = await this.todoRepository.save(todo);
    const loaded = await this.todoRepository.findOne({
      where: { id: saved.id },
      relations: { tag: true },
    });

    if (!loaded) {
      throw new NotFoundException("Failed to load incomplete todo");
    }

    return this.toResponse(loaded);
  }

  // moveSubtreeTargetDate는 주어진 루트 ID를 포함하여 해당 할 일과 모든 자식 할 일들의 targetDate를 지정된 날짜로 업데이트하는 헬퍼 메서드다.
  private async moveSubtreeTargetDate(
    rootId: number,
    targetDate: string,
  ): Promise<void> {
    const ids = await this.getSubtreeIds(rootId);
    await this.todoRepository.update({ id: In(ids) }, { targetDate }); // In(ids)는 id가 ids 배열에 포함된 모든 할 일의 targetDate를 업데이트한다.
  }

  // deferToTomorrow는 ID로 특정 할 일을 조회하여 해당 할 일과 모든 자식 할 일들의 targetDate를 내일로 변경하는 메서드다. 삭제되거나 휴지통에 있는 항목은 연기할 수 없도록 예외를 던진다.
  // A.K.A "하루 미루기"
  async deferToTomorrow(id: number): Promise<{ message: string }> {
    const todo = await this.getExistingTodo(id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot defer deleted or trashed todo");
    }

    const todayString = getDateOnlyString(getTodayDate()); // 오늘 날짜를 YYYY-MM-DD 문자열로 가져온다.
    if (todo.targetDate !== todayString) {
      throw new BadRequestException(
        "defer-to-tomorrow is only allowed for today list",
      );
    }

    await this.moveSubtreeTargetDate(id, getDateAfterDaysString(1));
    // getDateAfterDaysString(1)은 오늘 날짜에 1일을 더한 날짜를 YYYY-MM-DD 문자열로 반환한다.
    // moveSubtreeTargetDate는 해당 날짜로 할 일과 자식 할 일들의 targetDate를 업데이트한다.
    return { message: "Todo deferred to tomorrow (including children)" };
  }

  // deferToNextWeek는 ID로 특정 할 일을 조회하여 해당 할 일과 모든 자식 할 일들의 targetDate를 다음 주로 변경하는 메서드다. 삭제되거나 휴지통에 있는 항목은 연기할 수 없도록 예외를 던진다.
  // A.K.A "한주 미루기"
  async deferToNextWeek(id: number): Promise<{ message: string }> {
    const todo = await this.getExistingTodo(id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot defer deleted or trashed todo");
    }

    const thisWeek = getThisWeekRange(); // 이번 주의 시작과 끝 날짜를 Date 객체로 가져온다.
    const targetDate = parseDateOnlyString(todo.targetDate);
    // todo.targetDate는 YYYY-MM-DD 문자열이므로, parseDateOnlyString을 사용하여 Date 객체로 변환한다.
    if (targetDate < thisWeek.start || targetDate > thisWeek.end) {
      throw new BadRequestException(
        "defer-to-next-week is only allowed for this-week list",
      );
    }

    await this.moveSubtreeTargetDate(
      id,
      getDateOnlyString(addDays(targetDate, 7)),
      // targetDate에 7일을 더한 날짜를 YYYY-MM-DD 문자열로 반환한다.
      // moveSubtreeTargetDate는 해당 날짜로 할 일과 자식 할 일들의 targetDate를 업데이트한다.
    );
    return { message: "Todo deferred to next week (including children)" };
  }

  // softDelete는 ID로 특정 할 일을 조회하여 deletedAt 필드를 현재 시간으로 설정하는 메서드다.
  async softDelete(id: number): Promise<{ message: string }> {
    const todo = await this.getExistingTodo(id);
    if (todo.trashedAt) {
      throw new BadRequestException("Todo is already in trash");
    }

    const ids = await this.getSubtreeIds(id); // 해당 할 일과 모든 자식 할 일들의 ID를 재귀적으로 조회한다.
    await this.todoRepository.update(
      { id: In(ids) },
      {
        deletedAt: new Date(),
      },
    );

    return { message: "Todo soft deleted (including children)" };
  }

  // toTrash는 ID로 특정 할 일을 조회하여 trashedAt 필드를 현재 시간으로 설정하는 메서드다.
  // deletedAt이 설정된 항목은 휴지통으로 이동할 수 없도록 예외를 던진다.
  async toTrash(id: number): Promise<{ message: string }> {
    await this.getExistingTodo(id);
    const ids = await this.getSubtreeIds(id);
    const now = new Date();

    await this.todoRepository.update(
      { id: In(ids) },
      {
        deletedAt: now,
        trashedAt: now,
      },
    );

    return { message: "Todo moved to trash (including children)" };
  }

  // restore는 ID로 특정 할 일을 조회하여 deletedAt과 trashedAt 필드를 null로 설정하는 메서드다. 삭제된 항목은 복원할 수 없도록 예외를 던진다.
  async restore(id: number): Promise<{ message: string }> {
    await this.getExistingTodo(id);
    const ids = await this.getSubtreeIds(id);

    await this.todoRepository.update(
      { id: In(ids) },
      {
        deletedAt: null,
        trashedAt: null,
      },
    );

    return { message: "Todo restored (including children)" };
  }

  // getTrash는 trashedAt이 설정된 할 일들을 조회하여 반환하는 메서드다. 태그 정보도 함께 조회한다.
  async getTrash(): Promise<Record<string, unknown>[]> {
    const qb = this.todoRepository
      .createQueryBuilder("todo")
      .leftJoinAndSelect("todo.tag", "tag")
      .where("todo.trashedAt IS NOT NULL")
      .orderBy("todo.trashedAt", "DESC");
    // createQueryBuilder로 Todo 엔티티 쿼리빌더를 생성하고, leftJoinAndSelect로 태그 정보를 조인하여 함께 조회한다.
    // where 절로 trashedAt이 null이 아닌 항목만 조회한다. orderBy로 trashedAt을 기준으로 내림차순 정렬한다.
    const trashed = await qb.getMany();
    return trashed.map((todo) => this.toResponse(todo));
  }

  // permanentDelete는 ID로 특정 할 일을 조회하여 해당 할 일과 모든 자식 할 일들을 데이터베이스에서 완전히 삭제하는 메서드다.
  async permanentDelete(id: number): Promise<{ message: string }> {
    await this.getExistingTodo(id);
    const ids = await this.getSubtreeIds(id);

    await this.todoRepository.delete({ id: In(ids) });
    return { message: "Todo permanently deleted (including children)" };
  }

  // reorder는 ReorderTodosDto를 받아서 여러 할 일 항목의 순서를 한 번에 업데이트하는 메서드다.
  async reorder(
    reorderTodosDto: ReorderTodosDto,
  ): Promise<{ message: string }> {
    const ids = reorderTodosDto.items.map((item) => item.id); // ReorderItemDto 배열에서 ID만 추출하여 ids 배열을 만든다.
    const todos = await this.todoRepository.find({
      where: { id: In(ids) },
      select: ["id", "deletedAt", "trashedAt"],
    });

    if (todos.length !== ids.length) {
      throw new NotFoundException("One or more todos were not found");
    }

    const hasInactive = todos.some((todo) => todo.deletedAt || todo.trashedAt);
    if (hasInactive) {
      throw new BadRequestException("Cannot reorder deleted or trashed todos");
    }

    await this.todoRepository.manager.transaction(async (manager) => {
      // 트랜잭션을 사용하여 모든 업데이트가 원자적으로 처리되도록 한다. manager는 트랜잭션 내에서 사용할 수 있는 EntityManager 인스턴스다.
      for (const item of reorderTodosDto.items) {
        await manager.update(Todo, { id: item.id }, { order: item.order });
      }
    });

    return { message: "Todo order updated" };
  }

  // purgeOldTrash는 days 매개변수로 지정된 일 수보다 오래된 휴지통 항목들을 완전히 삭제하는 메서드다. 기본값은 30일이다.
  async purgeOldTrash(days = 30): Promise<number> {
    const threshold = addDays(new Date(), -days);
    const oldTrash = await this.todoRepository
      .createQueryBuilder("todo")
      .select(["todo.id", "todo.trashedAt"])
      .where("todo.trashedAt IS NOT NULL")
      .getMany();
    // createQueryBuilder로 Todo 엔티티 쿼리빌더를 생성하고, select로 ID와 trashedAt 필드만 조회한다.
    // where 절로 trashedAt이 null이 아닌 항목만 조회한다.
    const idsToDelete = oldTrash
      .filter((todo) => todo.trashedAt && todo.trashedAt < threshold)
      .map((todo) => todo.id);
    // 조회된 휴지통 항목 중에서 trashedAt이 threshold보다 오래된 항목들의 ID를 추출하여 idsToDelete 배열을 만든다.
    if (idsToDelete.length === 0) {
      return 0;
    }

    await this.todoRepository.delete({ id: In(idsToDelete) });
    return idsToDelete.length;
  }
}
