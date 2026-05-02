import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Todo } from "../todos/todo.entity";
import { CreateTagDto, UpdateTagDto } from "./tag.dto";
import { Tag } from "./tag.entity";

// DEFAULT_TAGS는 기본 태그들의 이름을 담고 있는 배열이다.
const DEFAULT_TAGS = ["집안일", "준비물", "학업", "직장", "기념일", "기타"];

@Injectable()
export class TagsService implements OnModuleInit {
  // OnModuleInit 인터페이스를 구현하여 모듈 초기화 시점에 기본 태그들을 데이터베이스에 자동으로 추가하는 기능을 제공한다.
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
  ) {}

  // onModuleInit 메서드는 모듈이 초기화될 때 실행되며, 데이터베이스에 기본 태그들이 존재하는지 확인하고, 없는 경우 추가한다.
  async onModuleInit(): Promise<void> {
    const existing = await this.tagRepository.find();
    const existingNames = new Set(existing.map((tag) => tag.name));

    const missing = DEFAULT_TAGS.filter((name) => !existingNames.has(name));
    if (missing.length > 0) {
      await this.tagRepository.save(
        missing.map((name) => this.tagRepository.create({ name })),
      );
    }
  }

  // findAll은 데이터베이스에서 모든 태그를 이름 순으로 조회하여 반환하는 메서드다.
  async findAll(): Promise<Tag[]> {
    return this.tagRepository.find({ order: { name: "ASC" } });
  }

  // findByName은 이름으로 태그를 조회하는 메서드다. 일치하는 태그가 없으면 null을 반환한다.
  async findByName(name: string): Promise<Tag | null> {
    return this.tagRepository.findOne({ where: { name } });
  }

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const existing = await this.findByName(createTagDto.name);
    if (existing) {
      throw new BadRequestException("Tag already exists");
    }

    const tag = this.tagRepository.create({ name: createTagDto.name });
    return this.tagRepository.save(tag);
  }

  async update(id: number, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException("Tag not found");
    }

    const duplicate = await this.findByName(updateTagDto.name);
    if (duplicate && duplicate.id !== id) {
      throw new BadRequestException("Tag name already in use");
    }

    tag.name = updateTagDto.name;
    return this.tagRepository.save(tag);
  }

  async remove(id: number): Promise<void> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException("Tag not found");
    }

    // Strategy: keep todos and simply clear their tag relation.
    // Note: only update the FK column (tagId). The `tag` relation is virtual
    // and TypeORM update() doesn't accept relation fields.
    await this.todoRepository.update({ tagId: id }, { tagId: null });
    await this.tagRepository.remove(tag);
  }
}
