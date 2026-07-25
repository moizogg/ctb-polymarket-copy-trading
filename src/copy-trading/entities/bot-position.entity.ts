import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('bot_positions')
@Unique(['marketId', 'tokenId'])
export class BotPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  marketId: string;

  @Column({ type: 'varchar', length: 255 })
  tokenId: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0 })
  netSize: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
