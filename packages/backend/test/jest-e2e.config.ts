import type { Config } from "jest";

// e2e 전용 jest config.
// 기본 unit test와 분리하는 이유:
//  - e2e는 부팅 시간이 있어 매번 돌리기 무거움 (npm test는 빨라야 함)
//  - DB 의존, 환경변수 오버라이드 등 셋업 비용이 다름
//
// 실행: npm run test:e2e
const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "..",
  // unit은 *.spec.ts, e2e는 *.e2e-spec.ts로 명명 분리
  testRegex: ".*\\.e2e-spec\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  testEnvironment: "node",
  // setup 파일: 환경변수 오버라이드 (모든 e2e 테스트가 부팅 전 실행)
  setupFiles: ["<rootDir>/test/e2e/setup-env.ts"],
  // e2e는 DB I/O 때문에 동시 실행 시 conflict 위험 → 직렬 실행
  maxWorkers: 1,
};

export default config;
