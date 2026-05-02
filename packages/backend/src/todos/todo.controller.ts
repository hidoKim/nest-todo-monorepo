import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CreateTodoDto,
  ReorderTodosDto,
  TodoQueryDto,
  UpdateTodoDto,
} from "./todo.dto";
import { TodosService } from "./todo.service";

@ApiTags("todos")
@Controller("todos")
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  // GET /todos?list=today&tag=집안일&keyword=장보기
  @Get()
  @ApiOperation({ summary: "Get todos with optional list/tag/keyword filters" })
  findAll(@Query() query: TodoQueryDto) {
    // Query() 데코레이터를 사용하여 URL 쿼리 매개변수를 TodoQueryDto로 자동 변환
    return this.todosService.findAll(query);
  }

  // GET /todos/today
  @Get("today")
  @ApiOperation({ summary: "Get today todos" })
  findToday() {
    return this.todosService.findByList("today");
  }

  // GET /todos/tomorrow
  @Get("tomorrow")
  @ApiOperation({ summary: "Get tomorrow todos" })
  findTomorrow() {
    return this.todosService.findByList("tomorrow");
  }

  // GET /todos/this-week
  @Get("this-week")
  @ApiOperation({ summary: "Get this-week todos" })
  findThisWeek() {
    return this.todosService.findByList("this-week");
  }

  //  GET /todos/next-week
  @Get("next-week")
  @ApiOperation({ summary: "Get next-week todos" })
  findNextWeek() {
    return this.todosService.findByList("next-week");
  }

  //  GET /todos/trash
  @Get("trash")
  @ApiOperation({ summary: "Get trashed todos" })
  findTrash() {
    return this.todosService.getTrash();
  }

  //  GET /todos/:id
  @Get(":id")
  @ApiOperation({ summary: "Get a single todo" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.findOne(id);
  }

  // POST /todos
  @Post()
  @ApiOperation({ summary: "Create a todo" })
  create(@Body() createTodoDto: CreateTodoDto) {
    // Body() 데코레이터를 사용하여 요청 본문을 CreateTodoDto로 자동 변환
    return this.todosService.create(createTodoDto);
  }

  // PATCH /todos/:id
  @Patch(":id")
  @ApiOperation({ summary: "Update a todo" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateTodoDto: UpdateTodoDto,
  ) {
    return this.todosService.update(id, updateTodoDto);
  }

  // POST /todos/:id/complete
  @Post(":id/complete")
  @ApiOperation({ summary: "Mark todo as complete" })
  complete(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.complete(id);
  }

  // POST /todos/:id/incomplete
  @Post(":id/incomplete")
  @ApiOperation({ summary: "Mark todo as incomplete" })
  incomplete(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.incomplete(id);
  }

  //  POST /todos/:id/defer-to-tomorrow
  @Post(":id/defer-to-tomorrow")
  @ApiOperation({ summary: "Defer todo subtree from today to tomorrow" })
  deferToTomorrow(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.deferToTomorrow(id);
  }

  //  POST /todos/:id/defer-to-next-week
  @Post(":id/defer-to-next-week")
  @ApiOperation({ summary: "Defer todo subtree from this-week to next-week" })
  deferToNextWeek(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.deferToNextWeek(id);
  }

  //  DELETE /todos/:id
  @Delete(":id")
  @ApiOperation({ summary: "Soft delete todo subtree" })
  softDelete(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.softDelete(id);
  }

  // POST /todos/:id/restore
  @Post(":id/restore")
  @ApiOperation({ summary: "Restore todo subtree from deleted/trash state" })
  restore(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.restore(id);
  }

  // POST /todos/:id/to-trash
  @Post(":id/to-trash")
  @ApiOperation({ summary: "Move todo subtree to trash" })
  toTrash(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.toTrash(id);
  }

  //  DELETE /todos/:id/permanent
  @Delete(":id/permanent")
  @ApiOperation({ summary: "Permanently delete todo subtree" })
  permanentDelete(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.permanentDelete(id);
  }

  // POST /todos/reorder
  @Post("reorder")
  @ApiOperation({ summary: "Bulk update todo order values" })
  reorder(@Body() reorderTodosDto: ReorderTodosDto) {
    return this.todosService.reorder(reorderTodosDto);
  }
}
