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

  private async resolveTagId(tagName?: string): Promise<number | null> {
    if (!tagName) {
      return null;
    }

    const tag = await this.tagsService.findByName(tagName);
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

  private async getExistingTodo(id: number): Promise<Todo> {
    const todo = await this.todoRepository.findOne({
      where: { id },
      relations: { tag: true },
    });

    if (!todo) {
      throw new NotFoundException(`Todo not found: ${id}`);
    }

    return todo;
  }

  private async getSubtreeIds(rootId: number): Promise<number[]> {
    const allIds = new Set<number>([rootId]);
    const queue: number[] = [rootId];

    while (queue.length > 0) {
      const batch = queue.splice(0, queue.length);
      const children = await this.todoRepository.find({
        where: { parentId: In(batch) },
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

  private toResponse(todo: Todo): Record<string, unknown> {
    return {
      ...todo,
      tag: todo.tag?.name ?? null,
    };
  }

  async create(createTodoDto: CreateTodoDto): Promise<Record<string, unknown>> {
    let targetDate = getDateOnlyString(getTodayDate());

    if (createTodoDto.listType) {
      const { start } = this.getDateRangeForList(createTodoDto.listType);
      targetDate = start;
    }

    if (createTodoDto.parentId) {
      const parent = await this.getExistingTodo(createTodoDto.parentId);
      if (parent.deletedAt || parent.trashedAt) {
        throw new BadRequestException(
          "Cannot add child to deleted or trashed parent",
        );
      }
      targetDate = parent.targetDate;
    }

    const tagId = await this.resolveTagId(createTodoDto.tag);
    const todo = this.todoRepository.create({
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

    this.applyActiveScope(qb);

    if (query.list) {
      const { start, end } = this.getDateRangeForList(query.list);
      qb.andWhere("todo.targetDate BETWEEN :start AND :end", { start, end });
    }

    if (query.tag) {
      qb.andWhere("tag.name = :tagName", { tagName: query.tag });
    }

    if (query.keyword) {
      qb.andWhere(
        "(LOWER(todo.title) LIKE :keyword OR LOWER(todo.content) LIKE :keyword)",
        {
          keyword: `%${query.keyword.toLowerCase()}%`,
        },
      );
    }

    const todos = await qb.getMany();
    return todos.map((todo) => this.toResponse(todo));
  }

  async findByList(
    listType: TodoListFilter,
  ): Promise<Record<string, unknown>[]> {
    return this.findAll({ list: listType });
  }

  async findOne(id: number): Promise<Record<string, unknown>> {
    const todo = await this.getExistingTodo(id);

    if (todo.deletedAt || todo.trashedAt) {
      throw new NotFoundException(`Todo is deleted or in trash: ${id}`);
    }

    return this.toResponse(todo);
  }

  async update(
    id: number,
    updateTodoDto: UpdateTodoDto,
  ): Promise<Record<string, unknown>> {
    const todo = await this.getExistingTodo(id);

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
        const nextTag = await this.tagsService.findByName(nextTagName);
        if (!nextTag) {
          throw new BadRequestException(`Tag not found: ${nextTagName}`);
        }
        todo.tagId = nextTag.id;
        todo.tag = nextTag;
      }
    }

    const saved = await this.todoRepository.save(todo);
    const loaded = await this.todoRepository.findOne({
      where: { id: saved.id },
      relations: { tag: true },
    });

    if (!loaded) {
      throw new NotFoundException("Failed to load updated todo");
    }

    return this.toResponse(loaded);
  }

  async complete(id: number): Promise<Record<string, unknown>> {
    const todo = await this.getExistingTodo(id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot complete deleted or trashed todo");
    }

    todo.completedAt = new Date();
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

  async incomplete(id: number): Promise<Record<string, unknown>> {
    const todo = await this.getExistingTodo(id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException(
        "Cannot mark incomplete for deleted or trashed todo",
      );
    }

    todo.completedAt = null;
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

  private async moveSubtreeTargetDate(
    rootId: number,
    targetDate: string,
  ): Promise<void> {
    const ids = await this.getSubtreeIds(rootId);
    await this.todoRepository.update({ id: In(ids) }, { targetDate });
  }

  async deferToTomorrow(id: number): Promise<{ message: string }> {
    const todo = await this.getExistingTodo(id);
    if (todo.deletedAt || todo.trashedAt) {
      throw new BadRequestException("Cannot defer deleted or trashed todo");
    }

    const todayString = getDateOnlyString(getTodayDate());
    if (todo.targetDate !== todayString) {
      throw new BadRequestException(
        "defer-to-tomorrow is only allowed for today list",
      );
    }

    await this.moveSubtreeTargetDate(id, getDateAfterDaysString(1));
    return { message: "Todo deferred to tomorrow (including children)" };
  }

  async deferToNextWeek(id: number): Promise<{ message: string }> {
    const todo = await this.getExistingTodo(id);
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
      id,
      getDateOnlyString(addDays(targetDate, 7)),
    );
    return { message: "Todo deferred to next week (including children)" };
  }

  async softDelete(id: number): Promise<{ message: string }> {
    const todo = await this.getExistingTodo(id);
    if (todo.trashedAt) {
      throw new BadRequestException("Todo is already in trash");
    }

    const ids = await this.getSubtreeIds(id);
    await this.todoRepository.update(
      { id: In(ids) },
      {
        deletedAt: new Date(),
      },
    );

    return { message: "Todo soft deleted (including children)" };
  }

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

  async getTrash(): Promise<Record<string, unknown>[]> {
    const qb = this.todoRepository
      .createQueryBuilder("todo")
      .leftJoinAndSelect("todo.tag", "tag")
      .where("todo.trashedAt IS NOT NULL")
      .orderBy("todo.trashedAt", "DESC");

    const trashed = await qb.getMany();
    return trashed.map((todo) => this.toResponse(todo));
  }

  async permanentDelete(id: number): Promise<{ message: string }> {
    await this.getExistingTodo(id);
    const ids = await this.getSubtreeIds(id);

    await this.todoRepository.delete({ id: In(ids) });
    return { message: "Todo permanently deleted (including children)" };
  }

  async reorder(
    reorderTodosDto: ReorderTodosDto,
  ): Promise<{ message: string }> {
    const ids = reorderTodosDto.items.map((item) => item.id);
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
      for (const item of reorderTodosDto.items) {
        await manager.update(Todo, { id: item.id }, { order: item.order });
      }
    });

    return { message: "Todo order updated" };
  }

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
