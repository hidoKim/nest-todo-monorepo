import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Todo } from '../todos/todo.entity';
import { User } from '../users/user.entity';

// (userId, name) 복합 유니크: 사용자별로 같은 이름의 태그를 허용한다.
// 예) 사용자 A의 "집안일"과 사용자 B의 "집안일"은 별개 row.
@Entity('tags')
@Unique('UQ_tags_userId_name', ['userId', 'name'])
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  // 소유자. 사용자가 삭제되면 그 사용자의 태그도 함께 삭제(CASCADE).
  @Column()
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  name!: string;

  @OneToMany(() => Todo, (todo) => todo.tag)
  todos!: Todo[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
