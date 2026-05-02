import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3001")
    // ?? 연산자를 사용하여 CORS_ORIGIN 환경 변수가 설정되지 않은 경우 기본값으로 "http://localhost:3001"을 사용하도록 함
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  // 쉼표(,)를 기분으로 문자열 분할 -> 각 항목의 앞뒤 공백 제거 -> 빈 문자열이 있는 경우 필터링

  app.enableCors({
    origin: corsOrigins, // corsOrigins : CORS_ORIGIN 환경 변수에서 파싱된 허용된 출처 목록
    credentials: true, // 자격 증명(쿠키, 인증 헤더 등)을 포함한 요청 허용
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // whitelist: true로 설정하여 DTO에 정의된 속성만 허용
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 포함된 요청을 거부
      transform: true, // 요청 데이터를 DTO 클래스의 인스턴스로 자동 변환
    }),
  );

  const swaggerConfig = new DocumentBuilder() // Swagger 설정을 위한 DocumentBuilder 인스턴스 생성
    .setTitle("Nest Todo List API")
    .setDescription("Simple and minimal Todo REST API")
    .setVersion("1.0.0")
    .build();
  // API 문서의 제목, 설명, 버전을 설정하고 build() 메서드를 호출하여 최종 Swagger 설정 객체를 생성

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  // SwaggerModule.createDocument() 메서드를 사용하여 NestJS 애플리케이션과 Swagger 설정을 기반으로 Swagger 문서 객체를 생성
  SwaggerModule.setup("api-docs", app, swaggerDocument);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
}

bootstrap();
