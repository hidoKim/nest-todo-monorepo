import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TagsModule } from "../tags/tag.module";
import { User } from "./user.entity";
import { UsersService } from "./user.service";

// UsersModule은 사용자 엔티티 CRUD를 캡슐화한다.
// AuthModule이 UsersService를 주입받아 사용하므로 exports에 포함시킨다.
// TagsModule import: 신규 가입자에게 기본 태그를 시드하기 위해 TagsService 의존.
@Module({
  imports: [TypeOrmModule.forFeature([User]), TagsModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
