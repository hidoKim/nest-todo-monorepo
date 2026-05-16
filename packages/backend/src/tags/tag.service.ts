import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Todo } from "../todos/todo.entity";
import { CreateTagDto, UpdateTagDto } from "./tag.dto";
import { Tag } from "./tag.entity";
import {
  TagDuplicateException,
  TagNameInUseException,
  TagNotFoundException,
} from "./tag.exceptions";

// DEFAULT_TAGS는 신규 사용자에게 기본 제공하는 태그들이다.
// 빈 화면 회피를 위해 가입 시 자동 생성된다.
const DEFAULT_TAGS = ["집안일", "준비물", "학업", "직장", "기념일", "기타"];

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
  ) {}

  // seedDefaultsForUser는 신규 가입한 사용자에게 기본 태그 6개를 만들어준다.
  // OAuth 첫 로그인 / 이메일 회원가입 직후 UsersService에서 호출한다.
  async seedDefaultsForUser(userId: number): Promise<void> {
    const existing = await this.tagRepository.find({
      where: { userId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((tag) => tag.name));
    const missing = DEFAULT_TAGS.filter((name) => !existingNames.has(name));

    if (missing.length === 0) {
      return;
    }
    await this.tagRepository.save(
      missing.map((name) => this.tagRepository.create({ name, userId })),
    );
  }

  // findAll은 해당 user의 태그만 이름 순으로 조회하여 반환한다.
  async findAll(userId: number): Promise<Tag[]> {
    return this.tagRepository.find({
      where: { userId },
      order: { name: "ASC" },
    });
  }

  // findByName은 user 스코프 안에서 이름으로 태그를 조회한다.
  // todo.service.resolveTagId 등 내부 호출에서도 사용된다.
  async findByName(userId: number, name: string): Promise<Tag | null> {
    return this.tagRepository.findOne({ where: { userId, name } });
  }

  async create(userId: number, createTagDto: CreateTagDto): Promise<Tag> {
    const existing = await this.findByName(userId, createTagDto.name);
    if (existing) {
      throw new TagDuplicateException();
    }
    const tag = this.tagRepository.create({
      name: createTagDto.name,
      userId,
    });
    return this.tagRepository.save(tag);
  }

  async update(
    userId: number,
    id: number,
    updateTagDto: UpdateTagDto,
  ): Promise<Tag> {
    // findOne 시점부터 userId를 함께 걸어 다른 사용자의 태그를 못 만지게 한다.
    const tag = await this.tagRepository.findOne({ where: { id, userId } });
    if (!tag) {
      throw new TagNotFoundException(id);
    }

    const duplicate = await this.findByName(userId, updateTagDto.name);
    if (duplicate && duplicate.id !== id) {
      throw new TagNameInUseException();
    }

    tag.name = updateTagDto.name;
    return this.tagRepository.save(tag);
  }

  async remove(userId: number, id: number): Promise<void> {
    const tag = await this.tagRepository.findOne({ where: { id, userId } });
    if (!tag) {
      throw new TagNotFoundException(id);
    }

    // 같은 user의 todo 중 이 태그를 쓰던 것들의 tagId를 null로 정리.
    // userId 조건을 함께 걸어, 혹시라도 다른 user의 row에 영향이 가지 않도록 한다.
    await this.todoRepository.update(
      { tagId: id, userId },
      { tagId: null },
    );
    await this.tagRepository.remove(tag);
  }
}
