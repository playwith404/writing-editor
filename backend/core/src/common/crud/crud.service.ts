import { Repository } from 'typeorm';

export class CrudService<T extends { id: string }> {
  constructor(protected readonly repo: Repository<T>) {}

  findAll(): Promise<T[]> {
    return this.repo.find();
  }

  findOne(id: string): Promise<T | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(dto: Partial<T>): Promise<T> {
    const entity = this.repo.create(dto as any);
    return this.repo.save(entity as any) as Promise<T>;
  }

  async update(id: string, dto: Partial<T>): Promise<T | null> {
    await this.repo.update({ id } as any, dto as any);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete({ id } as any);
  }
}
