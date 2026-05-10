import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

// AuthProvider는 사용자가 가입한 인증 수단을 구분하는 리터럴 유니온이다.
// "local"은 이메일/비밀번호 가입을, "google"/"kakao"는 OAuth 가입을 의미한다.
export type AuthProvider = "local" | "google" | "kakao";

// (provider, providerId) 조합으로 OAuth 사용자를 유일하게 식별한다.
// 예: 같은 이메일을 쓰는 사람이 Google/Kakao 양쪽으로 가입하면 별개 row가 된다.
@Entity("users")
@Unique("UQ_users_provider_providerId", ["provider", "providerId"])
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  // 이메일은 unique. OAuth provider가 이메일을 안 주면 null 가능.
  @Index({ unique: true, where: "email IS NOT NULL" })
  @Column({ type: "varchar", nullable: true })
  email!: string | null;

  @Column({ type: "varchar", nullable: true })
  name!: string | null;

  @Column({ type: "varchar", nullable: true })
  picture!: string | null;

  // local 가입 사용자만 채워짐. OAuth 사용자는 null.
  // bcrypt 해시로 저장. 평문 저장 절대 금지.
  @Column({ type: "varchar", nullable: true })
  passwordHash!: string | null;

  @Column({ type: "varchar" })
  provider!: AuthProvider;

  // OAuth provider가 발급한 식별자(sub). local 가입은 null.
  @Column({ type: "varchar", nullable: true })
  providerId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
