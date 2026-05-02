import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Tag } from "../tags/tag.entity";

// ISO 8601 문자열 ↔ Date 변환. 사전순 = 시간순이라 SQL ORDER BY도 정상.
// SQLite/Postgres 모두 같은 동작을 보장하기 위함.
const isoDateTransformer = {
  to: (value: Date | null | undefined): string | null => {
    // value가 null 또는 undefined인 경우 null을 반환하여 데이터베이스에 저장한다. 그렇지 않으면 Date 객체를 ISO 문자열로 변환하여 저장한다.
    if (value === null || value === undefined) return null;
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  },
  from: (value: string | null): Date | null => {
    return value ? new Date(value) : null;
  },
};

@Entity("todos")
export class Todo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: "text", nullable: true })
  content!: string | null;

  @Column({ type: "varchar", nullable: true, transformer: isoDateTransformer })
  completedAt!: Date | null;

  @Column({ type: "varchar", nullable: true, transformer: isoDateTransformer })
  deletedAt!: Date | null;

  @Column({ type: "varchar", nullable: true, transformer: isoDateTransformer })
  trashedAt!: Date | null;

  @Column({ nullable: true })
  parentId!: number | null;

  // ManyToOne과 OneToMany를 사용하여 자기 참조 관계를 설정한다.
  // parent는 부모 할 일을 나타내며, children은 자식 할 일들의 배열을 나타낸다.
  // onDelete: "CASCADE" 옵션을 사용하여 부모 할 일이 삭제될 때 자식 할 일들도 함께 삭제되도록 설정한다.
  @ManyToOne(() => Todo, (todo) => todo.children, { onDelete: "CASCADE" })
  @JoinColumn({ name: "parentId" })
  parent!: Todo | null;

  @OneToMany(() => Todo, (todo) => todo.parent)
  children!: Todo[];

  @Column({ type: "int", default: 0 })
  order!: number;

  @Column({ type: "varchar", nullable: true })
  dueDate!: string | null;

  @Column({ type: "date" })
  targetDate!: string;

  @Column({ nullable: true })
  tagId!: number | null;

  @ManyToOne(() => Tag, (tag) => tag.todos, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "tagId" })
  tag!: Tag | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
