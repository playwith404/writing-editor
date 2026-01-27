import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        oauthProvider: true,
        oauthId: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      } as any,
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        oauthProvider: true,
        oauthId: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      } as any,
    });
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.usersRepo.create(dto);
    return this.usersRepo.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User | null> {
    await this.usersRepo.update({ id }, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.usersRepo.delete({ id });
  }
}
