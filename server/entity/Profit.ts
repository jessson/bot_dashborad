import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Profit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  
  @Column('varchar')
  chain!: string;

  @Column('float')
  gross!: number;

  @Column('float')
  income!: number;

  @Column('int')
  txCount!: number;

  @CreateDateColumn()
  created_at!: Date;

  constructor(partial: Partial<Profit>) {
    Object.assign(this, partial);
  }
} 