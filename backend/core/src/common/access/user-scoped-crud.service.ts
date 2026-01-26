import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CrudService } from '../crud/crud.service';

export class UserScopedCrudService<T extends { id: string; userId?: string }> extends CrudService<T> {
  constructor(repo: Repository<T>) {
    super(repo);
  }

  async findAllForUser(userId: string | undefined): Promise<T[]> {
    if (!userId) return [];
    return this.repo.find({ where: { userId } as any });
  }

  async findOneForUser(userId: string | undefined, id: string): Promise<T | null> {
    if (!userId) return null;
    const record = await this.findOne(id);
    if (!record) return null;
    if (!record.userId || record.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }
    return record;
  }

  async createForUser(userId: string | undefined, dto: Partial<T>): Promise<T> {
    if (!userId) {
      throw new BadRequestException('유저 정보가 필요합니다.');
    }
    return super.create({ ...dto, userId } as any);
  }

  async updateForUser(userId: string | undefined, id: string, dto: Partial<T>): Promise<T | null> {
    await this.findOneForUser(userId, id);
    const next = { ...dto } as any;
    delete next.userId;
    return super.update(id, next);
  }

  async removeForUser(userId: string | undefined, id: string): Promise<void> {
    await this.findOneForUser(userId, id);
    return super.remove(id);
  }
}

