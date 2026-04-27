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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateTodoDto,
  ReorderTodosDto,
  TodoQueryDto,
  UpdateTodoDto,
} from './todo.dto';
import { TodosService } from './todo.service';

@ApiTags('todos')
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  @ApiOperation({ summary: 'Get todos with optional list/tag/keyword filters' })
  findAll(@Query() query: TodoQueryDto) {
    return this.todosService.findAll(query);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today todos' })
  findToday() {
    return this.todosService.findByList('today');
  }

  @Get('tomorrow')
  @ApiOperation({ summary: 'Get tomorrow todos' })
  findTomorrow() {
    return this.todosService.findByList('tomorrow');
  }

  @Get('this-week')
  @ApiOperation({ summary: 'Get this-week todos' })
  findThisWeek() {
    return this.todosService.findByList('this-week');
  }

  @Get('next-week')
  @ApiOperation({ summary: 'Get next-week todos' })
  findNextWeek() {
    return this.todosService.findByList('next-week');
  }

  @Get('trash')
  @ApiOperation({ summary: 'Get trashed todos' })
  findTrash() {
    return this.todosService.getTrash();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single todo' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a todo' })
  create(@Body() createTodoDto: CreateTodoDto) {
    return this.todosService.create(createTodoDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a todo' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTodoDto: UpdateTodoDto,
  ) {
    return this.todosService.update(id, updateTodoDto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark todo as complete' })
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.complete(id);
  }

  @Post(':id/incomplete')
  @ApiOperation({ summary: 'Mark todo as incomplete' })
  incomplete(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.incomplete(id);
  }

  @Post(':id/defer-to-tomorrow')
  @ApiOperation({ summary: 'Defer todo subtree from today to tomorrow' })
  deferToTomorrow(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.deferToTomorrow(id);
  }

  @Post(':id/defer-to-next-week')
  @ApiOperation({ summary: 'Defer todo subtree from this-week to next-week' })
  deferToNextWeek(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.deferToNextWeek(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete todo subtree' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.softDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore todo subtree from deleted/trash state' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.restore(id);
  }

  @Post(':id/to-trash')
  @ApiOperation({ summary: 'Move todo subtree to trash' })
  toTrash(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.toTrash(id);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete todo subtree' })
  permanentDelete(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.permanentDelete(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Bulk update todo order values' })
  reorder(@Body() reorderTodosDto: ReorderTodosDto) {
    return this.todosService.reorder(reorderTodosDto);
  }
}
