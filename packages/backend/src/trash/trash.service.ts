import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TodosService } from '../todos/todo.service';

@Injectable()
export class TrashService {
  private readonly logger = new Logger(TrashService.name);

  constructor(private readonly todosService: TodosService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredTrash(): Promise<void> {
    const removedCount = await this.todosService.purgeOldTrash(30);
    if (removedCount > 0) {
      this.logger.log(`Purged ${removedCount} trashed todos older than 30 days`);
    }
  }
}
