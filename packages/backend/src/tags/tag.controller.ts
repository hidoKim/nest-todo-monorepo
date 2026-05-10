import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateTagDto, TagResponseDto, UpdateTagDto } from "./tag.dto";
import { Tag } from "./tag.entity";
import { MessageResponseDto } from "../todos/todo.dto";
import { TagsService } from "./tag.service";

// JwtAuthGuard는 AuthModule에서 글로벌로 등록되므로 컨트롤러 단위 @UseGuards가 필요없다.
// 클래스 단위 @ApiResponse(401)로 모든 핸들러 응답에 Unauthorized를 일괄 부착한다.
@ApiTags("tags")
@ApiCookieAuth("access_token")
@ApiResponse({ status: 401, description: "Unauthorized — 쿠키 누락 또는 만료" })
@Controller("tags")
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: "Get all tags for the current user" })
  @ApiResponse({ status: 200, type: TagResponseDto, isArray: true })
  findAll(@CurrentUser("id") userId: number): Promise<Tag[]> {
    return this.tagsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a tag" })
  @ApiResponse({ status: 201, type: TagResponseDto })
  @ApiResponse({ status: 400, description: "Tag already exists" })
  create(
    @CurrentUser("id") userId: number,
    @Body() createTagDto: CreateTagDto,
  ): Promise<Tag> {
    return this.tagsService.create(userId, createTagDto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a tag" })
  @ApiResponse({ status: 200, type: TagResponseDto })
  @ApiResponse({ status: 404, description: "Tag not found" })
  update(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<Tag> {
    return this.tagsService.update(userId, id, updateTagDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a tag and clear tag relation from todos" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 404, description: "Tag not found" })
  async remove(
    @CurrentUser("id") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.tagsService.remove(userId, id);
    return { message: "Tag deleted" };
  }
}
