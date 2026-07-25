import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Singleton row (id = 1) for global bot control flags.
 */
@Entity('bot_settings')
export class BotSettings {
  @PrimaryColumn({ type: 'int' })
  id: number;

  /** When false, poller still runs but no new copy orders are placed. */
  @Column({ default: true })
  copyTradingEnabled: boolean;

  @Column({ type: 'varchar', length: 512, nullable: true })
  pauseReason?: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
