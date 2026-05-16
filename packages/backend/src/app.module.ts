import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { Tag } from "./tags/tag.entity";
import { TagsModule } from "./tags/tag.module";
import { Todo } from "./todos/todo.entity";
import { TodosModule } from "./todos/todo.module";
import { TrashService } from "./trash/trash.service";
import { User } from "./users/user.entity";
import { UsersModule } from "./users/user.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), //isGlobal: true로 설정하여 모든 모듈에서 ConfigService를 사용할 수 있도록 함
    ScheduleModule.forRoot(), // ScheduleModule.forRoot()를 호출하여 스케줄링 기능을 애플리케이션에 등록
    TypeOrmModule.forRootAsync({
      // TypeOrmModule.forRootAsync()를 사용하여 비동기적으로 데이터베이스 연결 설정을 구성
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>("DB_TYPE", "sqlite"); //<string>로 명시적으로 타입을 지정하여 TypeScript가 문자열 리터럴 타입으로 추론하도록 함
        const synchronize =
          configService.get<string>("DB_SYNCHRONIZE", "true") === "true";

        if (dbType === "postgres") {
          // DB_TYPE이 'postgres'인 경우 PostgreSQL 설정을 반환
          return {
            type: "postgres" as const,
            host: configService.get<string>("DB_HOST", "localhost"),
            port: Number(configService.get<string>("DB_PORT", "5432")),
            username: configService.get<string>("DB_USERNAME", "postgres"),
            password: configService.get<string>("DB_PASSWORD", "postgres"),
            database: configService.get<string>("DB_NAME", "todo_db"),
            entities: [Todo, Tag, User],
            synchronize,
          };
        }

        return {
          type: "sqlite" as const, // DB_TYPE이 'postgres'가 아닌 경우 SQLite 설정을 반환
          database: configService.get<string>("SQLITE_DB", "todo.sqlite"),
          entities: [Todo, Tag, User],
          synchronize,
        };
      },
    }),
    TodosModule,
    TagsModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    TrashService,
    // APP_FILTER 토큰으로 등록하면 NestJS가 모든 라우트에 자동 적용한다.
    // (JwtAuthGuard를 APP_GUARD로 등록한 것과 동일한 글로벌 패턴.)
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
