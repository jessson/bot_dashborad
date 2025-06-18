import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type UserType = 'normal' | 'admin' | 'guess';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar', { unique: true })
  username!: string;

  @Column('varchar')
  password!: string;

  @Column('varchar', { default: 'normal' })
  type!: UserType;
} 