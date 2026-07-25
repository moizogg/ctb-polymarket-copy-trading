import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum AlertType {
  HIGH_FAIL_RATE = 'HIGH_FAIL_RATE',
  LOW_COPY_RATE = 'LOW_COPY_RATE',
  NO_RECENT_TRADES = 'NO_RECENT_TRADES',
  DEVIATION_FROM_LEADER = 'DEVIATION_FROM_LEADER',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

@Entity('performance_alerts')
@Index(['createdAt'])
export class PerformanceAlert {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: AlertType })
  @Column({ type: 'enum', enum: AlertType })
  type: AlertType;

  @ApiProperty({ enum: AlertSeverity })
  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.WARNING,
  })
  severity: AlertSeverity;

  @ApiProperty()
  @Column({ type: 'varchar', length: 500 })
  message: string;

  @ApiProperty({ required: false })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  @Column({ default: false })
  read: boolean;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
