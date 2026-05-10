import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { User } from "../users/user.entity";
import { AuthService } from "./auth.service";
import { LoginDto, MeResponseDto, RegisterDto } from "./auth.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";

// AuthController는 OAuth 진입/콜백, 이메일 로그인/회원가입, 로그아웃, /me 엔드포인트를 모은다.
// JwtAuthGuard는 AuthModule에서 글로벌로 등록되므로, 인증이 필요 없는 엔드포인트는
// @Public()으로 명시적으로 면제해야 한다. /me만이 보호되는 유일한 엔드포인트.
@ApiTags("auth")
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // Google OAuth
  // ──────────────────────────────────────────────────────────

  // OAuth 진입 단계는 아직 인증되지 않은 사용자가 접근한다.
  // 글로벌 JwtAuthGuard를 면제하지 않으면 401에 막혀 google strategy까지 가지도 못한다.
  @Public()
  @Get("auth/google")
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Start Google OAuth flow" })
  googleAuth(): void {
    // intentionally empty
  }

  @Public()
  @Get("auth/google/callback")
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Google OAuth callback (redirects to frontend)" })
  googleAuthCallback(@Req() req: Request, @Res() res: Response): void {
    this.handleOAuthSuccess(req, res);
  }

  // ──────────────────────────────────────────────────────────
  // Kakao OAuth
  // ──────────────────────────────────────────────────────────

  @Public()
  @Get("auth/kakao")
  @UseGuards(AuthGuard("kakao"))
  @ApiOperation({ summary: "Start Kakao OAuth flow" })
  kakaoAuth(): void {
    // intentionally empty
  }

  @Public()
  @Get("auth/kakao/callback")
  @UseGuards(AuthGuard("kakao"))
  @ApiOperation({ summary: "Kakao OAuth callback (redirects to frontend)" })
  kakaoAuthCallback(@Req() req: Request, @Res() res: Response): void {
    this.handleOAuthSuccess(req, res);
  }

  // OAuth 콜백 공통 처리: JWT 발급 → 쿠키 set → 프론트로 redirect.
  // 토큰을 URL 쿼리에 박지 않는다. (referer/로그/히스토리에 노출되는 위험을 차단)
  private handleOAuthSuccess(req: Request, res: Response): void {
    const user = req.user as User;
    const token = this.authService.signToken(user);
    this.authService.setAuthCookie(res, token);

    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    res.redirect(`${frontendUrl}/auth/callback`);
  }

  // ──────────────────────────────────────────────────────────
  // 이메일 로그인 / 회원가입 / 로그아웃 / 내 정보
  // ──────────────────────────────────────────────────────────

  // POST /api/auth/login
  // 응답 body는 사용자 정보. 토큰은 Set-Cookie로만 내려준다.
  @Public()
  @Post("api/auth/login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Email/password login (sets httpOnly cookie)" })
  @ApiResponse({ status: 200, type: MeResponseDto })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponseDto> {
    const user = await this.authService.validateLocalUser(dto.email, dto.password);
    const token = this.authService.signToken(user);
    this.authService.setAuthCookie(res, token);
    return this.toMe(user);
  }

  @Public()
  @Post("api/auth/register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Email/password register" })
  @ApiResponse({ status: 201, type: MeResponseDto })
  @ApiResponse({ status: 409, description: "Email already in use" })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponseDto> {
    const user = await this.authService.register(dto);
    const token = this.authService.signToken(user);
    this.authService.setAuthCookie(res, token);
    return this.toMe(user);
  }

  // 로그아웃은 미인증 상태에서도 안전하게 호출되어야 한다(쿠키 만료, 다른 탭에서 이미 로그아웃 등).
  // @Public()으로 풀어 부작용 없이 쿠키만 제거하도록 한다.
  @Public()
  @Post("api/auth/logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Clear auth cookie" })
  logout(@Res({ passthrough: true }) res: Response): void {
    this.authService.clearAuthCookie(res);
  }

  // GET /api/auth/me
  // 글로벌 가드가 적용되므로 여기서는 추가 데코레이터 없이 자동 보호된다.
  // 프론트의 ProtectedRoute가 호출. 200이면 로그인 상태, 401이면 미인증.
  @Get("api/auth/me")
  @ApiCookieAuth("access_token")
  @ApiOperation({ summary: "Get current authenticated user" })
  @ApiResponse({ status: 200, type: MeResponseDto })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  me(@CurrentUser() user: User): MeResponseDto {
    return this.toMe(user);
  }

  private toMe(user: User): MeResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      provider: user.provider,
    };
  }
}
