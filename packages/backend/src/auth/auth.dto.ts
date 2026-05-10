import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

// LoginDto는 POST /api/auth/login 의 요청 본문을 검증한다.
export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "P@ssw0rd123" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

// RegisterDto는 POST /api/auth/register 의 요청 본문을 검증한다.
// 비밀번호 최소 길이만 강제하고, 복잡도 규칙은 학습 단순화를 위해 생략.
export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "P@ssw0rd123", minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: "홍길동", required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

// MeResponseDto는 GET /api/auth/me 응답 모양.
// 클라이언트가 ProtectedRoute에서 호출해 로그인 여부를 확인한다.
export class MeResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "user@example.com", nullable: true })
  email!: string | null;

  @ApiProperty({ example: "홍길동", nullable: true })
  name!: string | null;

  @ApiProperty({ example: "https://...", nullable: true })
  picture!: string | null;

  @ApiProperty({ enum: ["local", "google", "kakao"] })
  provider!: "local" | "google" | "kakao";
}
