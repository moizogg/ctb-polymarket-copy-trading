import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

export enum TradeStatus {
  PENDING = 'PENDING',
  COPIED = 'COPIED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}

@Entity('leader_trades')
@Index(['tradeId'], { unique: true })
export class LeaderTrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  tradeId: string;

  @Column({ type: 'varchar', length: 64 })
  wallet: string;

  @Column({ type: 'varchar', length: 255 })
  marketId: string;

  @Column({ type: 'varchar', length: 255 })
  tokenId: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  slug?: string | null;

  @Column({ type: 'varchar', length: 8 })
  side: 'BUY' | 'SELL';

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  size: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  price: string;

  @Column({
    type: 'enum',
    enum: TradeStatus,
    default: TradeStatus.PENDING,
  })
  status: TradeStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  leaderTradeAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  fetchedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  copiedAt?: Date | null;

  @Column({ type: 'int', nullable: true })
  latencyMs?: number | null;

  @Column({ type: 'int', nullable: true })
  fetchLatencyMs?: number | null;

  @Column({ type: 'int', nullable: true })
  executionLatencyMs?: number | null;

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  executedSize?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
