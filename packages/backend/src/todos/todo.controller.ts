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
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import {
  CreateTodoDto,
  MessageResponseDto,
  ReorderTodosDto,
  TodoQueryDto,
  TodoResponseDto,
  UpdateTodoDto,
} from "./todo.dto";
import { TodosService } from "./todo.service";

// JwtAuthGuard는 AuthModule에서 글로벌로 등록되므로 컨트롤러 단위 @UseGuards가 필요없다.
// 클래스 단위 @ApiResponse(401)로 모든 핸들러 응답 문서에 401을 일괄 부착한다.
@ApiTags("todos")
@ApiCookieAuth("access_token")
@ApiResponse({ status: 401, description: "Unauthorized — 쿠키 누락 또는 만료" })
@Controller("todos")
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  @ApiOperation({ summary: "Get todos with optional list/tag/keyword filters" })
  @ApiResponse({ status: 200, type: TodoResponseDto, isArray: true })
  findAll(
    @CurrentUser("id") userId: number,
    @Query() query: TodoQueryDto,
  ) {
    return this.todosService.findAll(userId, query);
  }

  @Get("today")
  @ApiOperation({ summary: "Get today todos" })
  @ApiResponse({ status: 200, type: TodoResponseDto, isArray: true })
  findToday(@CurrentUser("id") userId: number) {
    return this.todosService.findByList(userId, "today");
  }

  @Get("tomorrow")
  @ApiOperation({ summary: "Get tomorrow todos" })
  @ApiResponse({ status: 200, type: TodoResponseDto, isArray: true })
  findTomorrow(@CurrentUser("id") userId: number) {
    return this.todosService.findByList(userId, "tomorrow");
  }

  @Get("this-week")
  @ApiOperation({ summary: "Get this-week todos" })
  @ApiResponse({ status: 200, type: TodoResponseDto, isArray: true })
  findThisWeek(@CurrentUser("id") userId: number) {
    return this.todosService.findByList(userId, "this-week");
  }

  @Get("next-week")
  @ApiOperation({ summary: "Get next-week todos" })
  @ApiResponse({ status: 200, type: TodoResponseDto, isArray: true })
  findNextWeek(@CurrentUser("id") userId: number) {
    return this.todosService.findByList(userId, "next-week");
  }

  @Get("trash")
  @ApiOperation({ summary: "Get trashed todos" })
  @ApiResponse({ status: 200, type: TodoResponseDto, isArray: true })
  findTrash(@CurrentUser("id") userId: number) {
    return this.todosService.getTrash(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single todo" })
  @ApiResponse({ status: 200, type: TodoResponseDto })
  @ApiResponse({ status: 404, description: "Todo not found / 다른 사용자 소유" })
  findOne(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.todosService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a todo" })
  @ApiResponse({ status: 201, type: TodoResponseDto })
  @ApiResponse({ status: 400, description: "Invalid body / Tag not found" })
  create(
    @CurrentUser("id") userId: number,
    @Body() createTodoDto: CreateTodoDto,
  ) {
    return this.todosService.create(userId, createTodoDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a todo" })
  @ApiResponse({ status: 200, type: TodoResponseDto })
  @ApiResponse({ status: 404, description: "Todo not found" })
  update(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateTodoDto: UpdateTodoDto,
  ) {
    return this.todosService.update(userId, id, updateTodoDto);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Mark todo as complete" })
  @ApiResponse({ status: 201, type: TodoResponseDto })
  complete(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.todosService.complete(userId, id);
  }

  @Post(":id/incomplete")
  @ApiOperation({ summary: "Mark todo as incomplete" })
  @ApiResponse({ status: 201, type: TodoResponseDto })
  incomplete(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.todosService.incomplete(userId, id);
  }

  @Post(":id/defer-to-tomorrow")
  @ApiOperation({ summary: "Defer todo subtree from today to tomorrow" })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  deferToTomorrow(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.todosService.deferToTomorrow(userId, id);
  }

  @Post(":id/defer-to-next-week")
  @ApiOperation({ summary: "Defer todo subtree from this-week to next-week" })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  deferToNextWeek(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.todosService.deferToNextWeek(userId, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete todo subtree" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  softDelete(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.todosService.softDelete(userId, id);
  }

  @Post(":id/restore")
  @ApiOperation({ summary: "Restore todo subtree from deleted/trash state" })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  restore(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.todosService.restore(userId, id);
  }

  @Post(":id/to-trash")
  @ApiOperation({ summary: "Move todo subtree to trash" })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  toTrash(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.todosService.toTrash(userId, id);
  }

  @Delete(":id/permanent")
  @ApiOperation({ summary: "Permanently delete todo subtree" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  permanentDelete(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.todosService.permanentDelete(userId, id);
  }

  @Post("reorder")
  @ApiOperation({ summary: "Bulk update todo order values" })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  reorder(
    @CurrentUser("id") userId: number,
    @Body() reorderTodosDto: ReorderTodosDto,
  ) {
    return this.todosService.reorder(userId, reorderTodosDto);
  }
}
