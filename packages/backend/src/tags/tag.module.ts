import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from '../todos/todo.entity';
import { TagsController } from './tag.controller';
import { Tag } from './tag.entity';
import { TagsService } from './tag.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, Todo])],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
