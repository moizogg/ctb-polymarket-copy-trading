import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowedWallet } from './entity/followed-wallet.entity';

@Injectable()
export class FollowedWalletsService {
  constructor(
    @InjectRepository(FollowedWallet)
    private readonly repo: Repository<FollowedWallet>,
  ) {}

  async findAll(): Promise<FollowedWallet[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findActive(): Promise<FollowedWallet[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async add(wallet: string, label?: string): Promise<FollowedWallet> {
    const normalized = wallet.trim().toLowerCase();
    if (!normalized) {
      throw new ConflictException('Wallet address is required');
    }

    const existing = await this.repo.findOne({ where: { wallet: normalized } });
    if (existing) return existing;

    const entity = this.repo.create({
      wallet: normalized,
      label: label?.trim() || null,
      isActive: true,
      lastTradeId: null,
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: {
      label?: string;
      isActive?: boolean;
      lastTradeId?: string | null;
    },
  ): Promise<FollowedWallet> {
    const wallet = await this.repo.findOne({ where: { id } });
    if (!wallet) throw new NotFoundException('Followed wallet not found');

    if (data.label !== undefined) {
      wallet.label = data.label?.trim() || null;
    }
    if (data.isActive !== undefined) wallet.isActive = data.isActive;
    if (data.lastTradeId !== undefined) {
      wallet.lastTradeId =
        data.lastTradeId === null || data.lastTradeId === ''
          ? null
          : data.lastTradeId;
    }
    return this.repo.save(wallet);
  }

  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected) {
      // idempotent delete
    }
    return { ok: true };
  }

  async removeByWallet(wallet: string) {
    const normalized = wallet.trim().toLowerCase();
    await this.repo.delete({ wallet: normalized });
    return { ok: true };
  }
}
