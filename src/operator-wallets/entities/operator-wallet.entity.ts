import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('operator_wallets')
export class OperatorWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  address: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  label?: string | null;

  @Column({ default: false })
  isPrimary: boolean;

  /** True after optional signature verification (Phase 2 can set). */
  @Column({ default: false })
  verified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
