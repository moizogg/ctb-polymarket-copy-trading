import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorWallet } from './entities/operator-wallet.entity';

@Injectable()
export class OperatorWalletsService {
  constructor(
    @InjectRepository(OperatorWallet)
    private readonly repo: Repository<OperatorWallet>,
  ) {}

  async findAll(): Promise<OperatorWallet[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async add(
    address: string,
    label?: string,
    isPrimary?: boolean,
  ): Promise<OperatorWallet> {
    const normalized = address.trim().toLowerCase();
    if (!normalized.startsWith('0x') || normalized.length < 10) {
      throw new ConflictException('Invalid wallet address');
    }

    const existing = await this.repo.findOne({ where: { address: normalized } });
    if (existing) {
      if (label !== undefined) existing.label = label?.trim() || null;
      if (isPrimary === true) {
        await this.clearPrimary();
        existing.isPrimary = true;
      }
      return this.repo.save(existing);
    }

    if (isPrimary) {
      await this.clearPrimary();
    }

    const row = this.repo.create({
      address: normalized,
      label: label?.trim() || null,
      isPrimary: !!isPrimary,
      verified: false,
    });
    return this.repo.save(row);
  }

  async setPrimary(id: string): Promise<OperatorWallet> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Operator wallet not found');
    await this.clearPrimary();
    row.isPrimary = true;
    return this.repo.save(row);
  }

  async remove(id: string): Promise<{ ok: boolean }> {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('Operator wallet not found');
    return { ok: true };
  }

  private async clearPrimary(): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(OperatorWallet)
      .set({ isPrimary: false })
      .where('isPrimary = :p', { p: true })
      .execute();
  }
}
