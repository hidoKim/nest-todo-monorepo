import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../src/todos/todo.entity';
import { Tag } from '../src/tags/tag.entity';
import { TagsService } from '../src/tags/tag.service';

describe('TagsService', () => {
  let service: TagsService;
  let tagRepository: jest.Mocked<Repository<Tag>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((payload) => payload),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Todo),
          useValue: {
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(TagsService);
    tagRepository = moduleRef.get(getRepositoryToken(Tag));
  });

  it('throws when creating duplicate tag for the same user', async () => {
    // 같은 userId 스코프에서 같은 이름이 이미 있으면 BadRequestException.
    tagRepository.findOne.mockResolvedValue({
      id: 1,
      userId: 1,
      name: '집안일',
    } as Tag);

    await expect(
      service.create(1, { name: '집안일' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
