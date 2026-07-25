import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('followed_wallets')
export class FollowedWallet {
  @ApiProperty({ description: 'Follower UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Wallet address (0x...)' })
  @Column({ type: 'varchar', length: 64, unique: true })
  wallet: string;

  @ApiProperty({ description: 'Optional label (e.g. @Leader1)', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  label?: string | null;

  @ApiProperty({ description: 'Whether copy trading is active for this follower' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Last processed trade ID (cursor)',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  lastTradeId?: string | null;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
