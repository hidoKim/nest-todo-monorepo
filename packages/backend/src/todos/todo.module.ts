import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from '../tags/tag.entity';
import { TagsModule } from '../tags/tag.module';
import { TodosController } from './todo.controller';
import { Todo } from './todo.entity';
import { TodosService } from './todo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Todo, Tag]), TagsModule],
  controllers: [TodosController],
  providers: [TodosService],
  exports: [TodosService],
})
export class TodosModule {}
