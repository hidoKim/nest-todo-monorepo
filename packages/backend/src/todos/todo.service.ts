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
  MessageResponseDto,
  ReorderTodosDto,
  TodoListFilter,
  TodoQueryDto,
  TodoResponseDto,
  UpdateTodoDto,
} from "./todo.dto";
import { Todo } from "./todo.entity";

// Date | null → ISO string | null 변환 헬퍼.
// JSON 직렬화에 맡기지 않고 명시 변환하면 응답 스키마가 더 분명해진다.
const toIso = (value: Date | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

// 모든 public 메서드는 첫 인자로 userId를 받아 user-scope 안에서 동작한다.
// 다른 사용자의 데이터에 접근하려는 모든 시도는 NotFoundException으로 막힌다.
// (404로 통일하면 "리소스가 존재하지만 권한이 없다"는 정보 노출도 차단된다.)
@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
    private readonly tagsService: TagsService,
  ) {}

  private applyActiveScope(
    query: ReturnType<Repository<Todo>["createQueryBuilder"]>,
  ) {
    return query
      .andWhere("todo.deletedAt IS NULL")
      .andWhere("todo.trashedAt IS NULL");
  }

  // resolveTagId는 user 스코프 안에서 태그 이름 → 태그 id를 변환한다.
  // 다른 사용자의 같은 이름 태그를 우연히 가져오는 것을 방지한다.
  private async resolveTagId(
    userId: number,
    tagName?: string,
  ): Promise<number | null> {
    if (!tagName) {
      return null;
    }
    const tag = await this.tagsService.findByName(userId, tagName);
    if (!tag) {
      throw new BadRequestException(`Tag not found: ${tagName}`);
    }
    return tag.id;
  }

  private getDateRangeForList(listType: TodoListFilter): {
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

  // getExistingTodo는 userId가 일치하는 todo만 반환한다.
  // 다른 사용자의 todo id를 알아내도 접근 불가 — 항상 NotFoundException.
  private async getExistingTodo(userId: number, id: number): Promise<Todo> {
    const todo = await this.todoRepository.findOne({
      where: { id, userId },
      relations: { tag: true },
    });
    if (!todo) {
      throw new NotFoundException(`Todo not found: ${id}`);
    }
    return todo;
  }

  // getSubtreeIds는 user 스코프 안에서 서브트리 id를 BFS로 모은다.
  // 다른 사용자의 자식 todo가 섞일 가능성을 차단하기 위해 parentId 검색에도 userId를 건다.
  private async getSubtreeIds(
    userId: number,
    rootId: number,
  ): Promise<number[]> {
    const allIds = new Set<number>([rootId]);
    const queue: number[] = [rootId];

    while (queue.length > 0) {
      const batch = queue.splice(0, queue.length);
      const children = await this.todoRepository.find({
        where: { parentId: In(batch), userId },
        select: ["id"],
      });
      for (const child of children) {
        if (!allIds.has(child.id)) {
          allIds.add(child.id);
          queue.push(child.id);
        }
      }
    }
    return Array.from(allIds);
  }

  // Todo 엔티티를 외부 응답 DTO로 명시 변환한다.
  // ...todo로 펼치면 user 관계 같은 인접 필드가 새어나갈 수 있어 화이트리스트 방식으로 고정.
  private toResponse(todo: Todo): TodoResponseDto {
    return {
      id: todo.id,
      userId: todo.userId,
      title: todo.title,
      content: todo.content,
      completedAt: toIso(todo.completedAt),
      deletedAt: toIso(todo.deletedAt),
      trashedAt: toIso(todo.trashedAt),
      parentId: todo.parentId,
      order: todo.order,
      dueDate: todo.dueDate,
      targetDate: todo.targetDate,
      tag: todo.tag?.name ?? null,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }

  async create(
    userId: number,
    createTodoDto: CreateTodoDto,
  ): Promise<TodoResponseDto> {
    let targetDate = getDateOnlyString(getTodayDate());

    if (createTodoDto.listType) {
      const { start } = this.getDateRangeForList(createTodoDto.listType);
      targetDate = start;
    }

    if (createTodoDto.parentId) {
      // 부모도 같은 user 소유인지 확인. 다른 사용자의 todo를 부모로 지정 못 함.
      const parent = await this.getExistingTodo(userId, createTodoDto.parentId);
      if (parent.deletedAt || parent.trashedAt) {
        throw new BadRequestException(
          "Cannot add child to deleted or trashed parent",
        );
      }
      targetDate = parent.targetDate;
    }

    const tagId = await this.resolveTagId(userId, createTodoDto.tag);
    const todo = this.todoRepository.create({
      userId,
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
      where: { id: saved.id, userId },
      relations: { tag: true },
    });
    if (!loaded) {
      throw new NotFoundException("Failed to load created todo");
    }
    return this.toResponse(loaded);
  }

  async findAll(
    userId: number,
    query: TodoQueryDto,
  ): Promise<TodoResponseDto[]> {
    const qb = this.todoRepository
      .createQueryBuilder("todo")
      .leftJoinAndSelect("todo.tag", "tag")
      .where("todo.userId = :userId", { userId })
      .orderBy("todo.order", "ASC")
      .addOrderBy("todo.createdAt", "ASC");

    this.applyActiveScope(qb);

    if (query.list) {
      const { start, end } = this.getDateRangeForList(query.list);
      qb.andWhere("todo.targetDate BETWEEN :start AND :end", { start, end });
    }
    if (query.tag) {
      // tag 이름은 user 스코프에서 unique하므로 (userId, tagName) 조건이면 충분.
      qb.andWhere("tag.name = :tagName", { tagName: query.tag });
    }
    if (query.keyword) {
      qb.andWhere(
        "(LOWER(todo.title) LIKE :keyword OR LOWER(todo.content) LIKE :keyword)",
        { keyword: `%${query.keyword.toLowerCase()}%` },
      );
    }

    const todos = await qb.getMany();
    return todos.map((todo) => this.toResponse(todo));
  }

  async findByList(
    userId: number,
    listType: TodoListFilter,
  ): Promise<TodoResponseDto[]> {
    return this.findAll(userId, { list: listType });
  }

  async findOne(
    userId: number,
    id: number,
  ): Promise<TodoResponseDto> {
    const todo = await this.getExistingTodo(userId, id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new NotFoundException(`Todo is deleted or in trash: ${id}`);
    }
    return this.toResponse(todo);
  }

  async update(
    userId: number,
    id: number,
    updateTodoDto: UpdateTodoDto,
  ): Promise<TodoResponseDto> {
    const todo = await this.getExistingTodo(userId, id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot update deleted or trashed todo");
    }

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

    if (updateTodoDto.tag !== undefined) {
      const nextTagName = updateTodoDto.tag.trim();
      if (nextTagName === "") {
        todo.tagId = null;
        todo.tag = null;
      } else {
        const nextTag = await this.tagsService.findByName(userId, nextTagName);
        if (!nextTag) {
          throw new BadRequestException(`Tag not found: ${nextTagName}`);
        }
        todo.tagId = nextTag.id;
        todo.tag = nextTag;
      }
    }

    const saved = await this.todoRepository.save(todo);
    const loaded = await this.todoRepository.findOne({
      where: { id: saved.id, userId },
      relations: { tag: true },
    });
    if (!loaded) {
      throw new NotFoundException("Failed to load updated todo");
    }
    return this.toResponse(loaded);
  }

  async complete(
    userId: number,
    id: number,
  ): Promise<TodoResponseDto> {
    const todo = await this.getExistingTodo(userId, id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot complete deleted or trashed todo");
    }
    todo.completedAt = new Date();
    const saved = await this.todoRepository.save(todo);
    const loaded = await this.todoRepository.findOne({
      where: { id: saved.id, userId },
      relations: { tag: true },
    });
    if (!loaded) {
      throw new NotFoundException("Failed to load completed todo");
    }
    return this.toResponse(loaded);
  }

  async incomplete(
    userId: number,
    id: number,
  ): Promise<TodoResponseDto> {
    const todo = await this.getExistingTodo(userId, id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException(
        "Cannot mark incomplete for deleted or trashed todo",
      );
    }
    todo.completedAt = null;
    const saved = await this.todoRepository.save(todo);
    const loaded = await this.todoRepository.findOne({
      where: { id: saved.id, userId },
      relations: { tag: true },
    });
    if (!loaded) {
      throw new NotFoundException("Failed to load incomplete todo");
    }
    return this.toResponse(loaded);
  }

  private async moveSubtreeTargetDate(
    userId: number,
    rootId: number,
    targetDate: string,
  ): Promise<void> {
    const ids = await this.getSubtreeIds(userId, rootId);
    // userId 조건을 update에도 함께 걸어 이중 안전장치.
    await this.todoRepository.update({ id: In(ids), userId }, { targetDate });
  }

  async deferToTomorrow(
    userId: number,
    id: number,
  ): Promise<MessageResponseDto> {
    const todo = await this.getExistingTodo(userId, id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot defer deleted or trashed todo");
    }
    const todayString = getDateOnlyString(getTodayDate());
    if (todo.targetDate !== todayString) {
      throw new BadRequestException(
        "defer-to-tomorrow is only allowed for today list",
      );
    }
    await this.moveSubtreeTargetDate(userId, id, getDateAfterDaysString(1));
    return { message: "Todo deferred to tomorrow (including children)" };
  }

  async deferToNextWeek(
    userId: number,
    id: number,
  ): Promise<MessageResponseDto> {
    const todo = await this.getExistingTodo(userId, id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot defer deleted or trashed todo");
    }
    const thisWeek = getThisWeekRange();
    const targetDate = parseDateOnlyString(todo.targetDate);
    if (targetDate < thisWeek.start || targetDate > thisWeek.end) {
      throw new BadRequestException(
        "defer-to-next-week is only allowed for this-week list",
      );
    }
    await this.moveSubtreeTargetDate(
      userId,
      id,
      getDateOnlyString(addDays(targetDate, 7)),
    );
    return { message: "Todo deferred to next week (including children)" };
  }

  async softDelete(
    userId: number,
    id: number,
  ): Promise<MessageResponseDto> {
    const todo = await this.getExistingTodo(userId, id);
    if (todo.trashedAt) {
      throw new BadRequestException("Todo is already in trash");
    }
    const ids = await this.getSubtreeIds(userId, id);
    await this.todoRepository.update(
      { id: In(ids), userId },
      { deletedAt: new Date() },
    );
    return { message: "Todo soft deleted (including children)" };
  }

  async toTrash(userId: number, id: number): Promise<MessageResponseDto> {
    await this.getExistingTodo(userId, id);
    const ids = await this.getSubtreeIds(userId, id);
    const now = new Date();
    await this.todoRepository.update(
      { id: In(ids), userId },
      { deletedAt: now, trashedAt: now },
    );
    return { message: "Todo moved to trash (including children)" };
  }

  async restore(userId: number, id: number): Promise<MessageResponseDto> {
    await this.getExistingTodo(userId, id);
    const ids = await this.getSubtreeIds(userId, id);
    await this.todoRepository.update(
      { id: In(ids), userId },
      { deletedAt: null, trashedAt: null },
    );
    return { message: "Todo restored (including children)" };
  }

  async getTrash(userId: number): Promise<TodoResponseDto[]> {
    const qb = this.todoRepository
      .createQueryBuilder("todo")
      .leftJoinAndSelect("todo.tag", "tag")
      .where("todo.userId = :userId", { userId })
      .andWhere("todo.trashedAt IS NOT NULL")
      .orderBy("todo.trashedAt", "DESC");
    const trashed = await qb.getMany();
    return trashed.map((todo) => this.toResponse(todo));
  }

  async permanentDelete(
    userId: number,
    id: number,
  ): Promise<MessageResponseDto> {
    await this.getExistingTodo(userId, id);
    const ids = await this.getSubtreeIds(userId, id);
    await this.todoRepository.delete({ id: In(ids), userId });
    return { message: "Todo permanently deleted (including children)" };
  }

  async reorder(
    userId: number,
    reorderTodosDto: ReorderTodosDto,
  ): Promise<MessageResponseDto> {
    const ids = reorderTodosDto.items.map((item) => item.id);
    // userId를 함께 걸어 다른 사용자의 todo가 요청에 섞여 있어도 매칭에서 제외된다.
    const todos = await this.todoRepository.find({
      where: { id: In(ids), userId },
      select: ["id", "deletedAt", "trashedAt"],
    });

    if (todos.length !== ids.length) {
      // 본인 소유 아닌 id가 섞여 있어도 이 분기로 떨어진다 → 정보 노출 없음.
      throw new NotFoundException("One or more todos were not found");
    }

    const hasInactive = todos.some((todo) => todo.deletedAt || todo.trashedAt);
    if (hasInactive) {
      throw new BadRequestException("Cannot reorder deleted or trashed todos");
    }

    await this.todoRepository.manager.transaction(async (manager) => {
      for (const item of reorderTodosDto.items) {
        await manager.update(
          Todo,
          { id: item.id, userId },
          { order: item.order },
        );
      }
    });

    return { message: "Todo order updated" };
  }

  // purgeOldTrash는 cron으로 호출되며 시스템 전역에서 동작한다.
  // user-scope 없이 모든 사용자의 오래된 trash를 정리하므로 userId 인자를 받지 않는다.
  async purgeOldTrash(days = 30): Promise<number> {
    const threshold = addDays(new Date(), -days);
    const oldTrash = await this.todoRepository
      .createQueryBuilder("todo")
      .select(["todo.id", "todo.trashedAt"])
      .where("todo.trashedAt IS NOT NULL")
      .getMany();
    const idsToDelete = oldTrash
      .filter((todo) => todo.trashedAt && todo.trashedAt < threshold)
      .map((todo) => todo.id);
    if (idsToDelete.length === 0) {
      return 0;
    }
    await this.todoRepository.delete({ id: In(idsToDelete) });
    return idsToDelete.length;
  }
}
