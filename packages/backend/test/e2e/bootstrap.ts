import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { DataSource } from "typeorm";
import { AppModule } from "../../src/app.module";

/**
 * e2e 테스트용 NestJS 앱 부팅 헬퍼.
 *
 * main.ts와 동일한 미들웨어/파이프 셋업을 적용해야 실제 운영 동작과 같아진다.
 * 다른 점: SwaggerModule, CORS, listen()은 e2e에 불필요해 생략.
 *
 * 사용:
 *   beforeAll(async () => { app = await bootstrapTestApp(); });
 *   afterAll(async () => { await app.close(); });
 */
export const bootstrapTestApp = async (): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
};

/**
 * DB 전체 비우기. beforeEach에서 호출해 test 간 격리 보장.
 *
 * SQLite + synchronize:true 환경 가정.
 * Foreign key 제약 때문에 자식 → 부모 순으로 비워야 함.
 *  - todos (tags/users 참조), tags (users 참조), users
 */
export const clearDatabase = async (app: INestApplication): Promise<void> => {
  const dataSource = app.get(DataSource);
  // SQLite는 TRUNCATE 미지원, DELETE FROM 사용.
  // 순서 중요: FK가 있는 테이블 먼저.
  await dataSource.query("DELETE FROM todos");
  await dataSource.query("DELETE FROM tags");
  await dataSource.query("DELETE FROM users");
  // AUTOINCREMENT 카운터도 리셋해 id가 1부터 다시 시작 — 테스트 가독성 ↑
  await dataSource.query(
    "DELETE FROM sqlite_sequence WHERE name IN ('todos','tags','users')",
  );
};
