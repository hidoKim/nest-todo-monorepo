import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TagsService } from "../tags/tag.service";
import { AuthProvider, User } from "./user.entity";

// OAuth 콜백에서 strategy가 넘겨주는 표준화된 프로필 모양.
// 각 provider별 필드 차이는 strategy 안에서 흡수하고, 여기로는 같은 형태로 들어온다.
export interface OAuthProfileInput {
  provider: Exclude<AuthProvider, "local">; // "google" | "kakao"
  providerId: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    // 신규 가입자에게 기본 태그를 시드하기 위해 TagsService를 주입.
    // UsersModule이 TagsModule을 import해야 한다.
    private readonly tagsService: TagsService,
  ) {}

  // findOrCreateOAuth는 OAuth 콜백에서 받은 프로필로 사용자를 조회하거나 생성한다.
  // (provider, providerId) 복합키로 먼저 찾고, 없으면 새로 만든다.
  // 동일 provider로 다시 로그인하면 기존 row가 재사용되므로 중복 가입이 발생하지 않는다.
  async findOrCreateOAuth(input: OAuthProfileInput): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { provider: input.provider, providerId: input.providerId },
    });

    if (existing) {
      // 프로필 갱신: provider 쪽에서 이름/사진이 바뀌었을 수 있으므로 최신값 반영.
      let dirty = false;
      if (existing.email !== input.email) {
        existing.email = input.email;
        dirty = true;
      }
      if (existing.name !== input.name) {
        existing.name = input.name;
        dirty = true;
      }
      if (existing.picture !== input.picture) {
        existing.picture = input.picture;
        dirty = true;
      }
      if (dirty) {
        return this.userRepository.save(existing);
      }
      return existing;
    }

    const created = this.userRepository.create({
      provider: input.provider,
      providerId: input.providerId,
      email: input.email,
      name: input.name,
      picture: input.picture,
      passwordHash: null,
    });
    const saved = await this.userRepository.save(created);
    // 신규 사용자에게 기본 태그 6개를 자동 생성.
    // 빈 화면 UX 회피 + tag 기반 todo 생성을 즉시 가능하게 함.
    await this.tagsService.seedDefaultsForUser(saved.id);
    return saved;
  }

  // 이메일 로그인용. provider="local" 사용자만 검색.
  async findLocalByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, provider: "local" },
    });
  }

  // JWT payload의 sub로 사용자를 조회. JwtStrategy.validate에서 사용.
  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // 로컬 회원가입용. passwordHash는 bcrypt로 해시된 값을 받아야 한다.
  async createLocal(input: {
    email: string;
    name: string | null;
    passwordHash: string;
  }): Promise<User> {
    const created = this.userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      provider: "local",
      providerId: null,
      picture: null,
    });
    const saved = await this.userRepository.save(created);
    await this.tagsService.seedDefaultsForUser(saved.id);
    return saved;
  }
}
