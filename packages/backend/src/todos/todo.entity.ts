import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tag } from '../tags/tag.entity';

// ISO 8601 문자열 ↔ Date 변환. 사전순 = 시간순이라 SQL ORDER BY도 정상.
// SQLite/Postgres 모두 같은 동작을 보장하기 위함.
const isoDateTransformer = {
  to: (value: Date | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  },
  from: (value: string | null): Date | null => {
    return value ? new Date(value) : null;
  },
};

@Entity('todos')
export class Todo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'varchar', nullable: true, transformer: isoDateTransformer })
  completedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true, transformer: isoDateTransformer })
  deletedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true, transformer: isoDateTransformer })
  trashedAt!: Date | null;

  @Column({ nullable: true })
  parentId!: number | null;

  @ManyToOne(() => Todo, (todo) => todo.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent!: Todo | null;

  @OneToMany(() => Todo, (todo) => todo.parent)
  children!: Todo[];

  @Column({ type: 'int', default: 0 })
  order!: number;

  @Column({ type: 'varchar', nullable: true })
  dueDate!: string | null;

  @Column({ type: 'date' })
  targetDate!: string;

  @Column({ nullable: true })
  tagId!: number | null;

  @ManyToOne(() => Tag, (tag) => tag.todos, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tagId' })
  tag!: Tag | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
