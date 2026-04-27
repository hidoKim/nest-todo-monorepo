import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../todos/todo.entity';
import { CreateTagDto, UpdateTagDto } from './tag.dto';
import { Tag } from './tag.entity';

const DEFAULT_TAGS = ['집안일', '준비물', '학업', '직장', '기념일', '기타'];

@Injectable()
export class TagsService implements OnModuleInit {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
  ) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.tagRepository.find();
    const existingNames = new Set(existing.map((tag) => tag.name));

    const missing = DEFAULT_TAGS.filter((name) => !existingNames.has(name));
    if (missing.length > 0) {
      await this.tagRepository.save(missing.map((name) => this.tagRepository.create({ name })));
    }
  }

  async findAll(): Promise<Tag[]> {
    return this.tagRepository.find({ order: { name: 'ASC' } });
  }

  async findByName(name: string): Promise<Tag | null> {
    return this.tagRepository.findOne({ where: { name } });
  }

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const existing = await this.findByName(createTagDto.name);
    if (existing) {
      throw new BadRequestException('Tag already exists');
    }

    const tag = this.tagRepository.create({ name: createTagDto.name });
    return this.tagRepository.save(tag);
  }

  async update(id: number, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const duplicate = await this.findByName(updateTagDto.name);
    if (duplicate && duplicate.id !== id) {
      throw new BadRequestException('Tag name already in use');
    }

    tag.name = updateTagDto.name;
    return this.tagRepository.save(tag);
  }

  async remove(id: number): Promise<void> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Strategy: keep todos and simply clear their tag relation.
    // Note: only update the FK column (tagId). The `tag` relation is virtual
    // and TypeORM update() doesn't accept relation fields.
    await this.todoRepository.update({ tagId: id }, { tagId: null });
    await this.tagRepository.remove(tag);
  }
}
