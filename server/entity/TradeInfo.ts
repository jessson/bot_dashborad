import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class TradeInfo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar')
  chain!: string;

  @Column('varchar')
  builder!: string;

  @Column('varchar')
  hash!: string;

  @Column('simple-json')
  vicHashes!: string[];

  @Column('float')
  gross!: number;

  @Column('float')
  bribe!: number;

  @Column('float')
  income!: number;

  @Column('int')
  txCount!: number;

  @Column('float')
  ratio!: number;

  @Column('varchar')
  extraInfo!: string;

  @Column('simple-json', { nullable: true })
  tags!: string[];

  @CreateDateColumn()
  created_at!: Date;
} 