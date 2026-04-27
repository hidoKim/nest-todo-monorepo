import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './tags/tag.entity';
import { TagsModule } from './tags/tag.module';
import { Todo } from './todos/todo.entity';
import { TodosModule } from './todos/todo.module';
import { TrashService } from './trash/trash.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE', 'sqlite');
        const synchronize =
          configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true';

        if (dbType === 'postgres') {
          return {
            type: 'postgres' as const,
            host: configService.get<string>('DB_HOST', 'localhost'),
            port: Number(configService.get<string>('DB_PORT', '5432')),
            username: configService.get<string>('DB_USERNAME', 'postgres'),
            password: configService.get<string>('DB_PASSWORD', 'postgres'),
            database: configService.get<string>('DB_NAME', 'todo_db'),
            entities: [Todo, Tag],
            synchronize,
          };
        }

        return {
          type: 'sqlite' as const,
          database: configService.get<string>('SQLITE_DB', 'todo.sqlite'),
          entities: [Todo, Tag],
          synchronize,
        };
      },
    }),
    TodosModule,
    TagsModule,
  ],
  providers: [TrashService],
})
export class AppModule {}
