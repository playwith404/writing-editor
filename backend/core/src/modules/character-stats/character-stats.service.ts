import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { Character, CharacterStat } from '../../entities';

@Injectable()
export class CharacterStatsService {
  constructor(
    @InjectRepository(CharacterStat)
    private readonly statsRepo: Repository<CharacterStat>,
    @InjectRepository(Character)
    private readonly charactersRepo: Repository<Character>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  private async assertCharacterAccess(userId: string, characterId: string): Promise<Character> {
    const character = await this.charactersRepo.findOne({ where: { id: characterId } });
    if (!character) {
      throw new BadRequestException('캐릭터를 찾을 수 없습니다.');
    }
    await this.projectAccessService.assertProjectAccess(userId, character.projectId);
    return character;
  }

  async findAllForUser(userId: string, characterId: string) {
    await this.assertCharacterAccess(userId, characterId);
    return this.statsRepo.find({
      where: { characterId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const stat = await this.statsRepo.findOne({ where: { id } });
    if (!stat) return null;
    await this.assertCharacterAccess(userId, stat.characterId);
    return stat;
  }

  async createForUser(userId: string, dto: Partial<CharacterStat>) {
    if (!dto.characterId) {
      throw new BadRequestException('characterId가 필요합니다.');
    }
    await this.assertCharacterAccess(userId, dto.characterId);
    const stat = this.statsRepo.create(dto as any);
    return this.statsRepo.save(stat as any);
  }

  async updateForUser(userId: string, id: string, dto: Partial<CharacterStat>) {
    const stat = await this.statsRepo.findOne({ where: { id } });
    if (!stat) return null;
    await this.assertCharacterAccess(userId, stat.characterId);
    await this.statsRepo.update({ id } as any, dto as any);
    return this.findOneForUser(userId, id);
  }

  async removeForUser(userId: string, id: string) {
    const stat = await this.statsRepo.findOne({ where: { id } });
    if (!stat) return;
    await this.assertCharacterAccess(userId, stat.characterId);
    await this.statsRepo.delete({ id } as any);
  }
}

