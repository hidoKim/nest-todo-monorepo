import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTagDto, UpdateTagDto } from './tag.dto';
import { Tag } from './tag.entity';
import { TagsService } from './tag.service';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  findAll(): Promise<Tag[]> {
    return this.tagsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagsService.create(createTagDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tag' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<Tag> {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag and clear tag relation from todos' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.tagsService.remove(id);
    return { message: 'Tag deleted' };
  }
}
