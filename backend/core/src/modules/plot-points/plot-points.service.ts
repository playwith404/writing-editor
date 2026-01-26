import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { Plot, PlotPoint } from '../../entities';

@Injectable()
export class PlotPointsService {
  constructor(
    @InjectRepository(PlotPoint)
    private readonly pointsRepo: Repository<PlotPoint>,
    @InjectRepository(Plot)
    private readonly plotsRepo: Repository<Plot>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  private async assertPlotAccess(userId: string, plotId: string): Promise<Plot> {
    const plot = await this.plotsRepo.findOne({ where: { id: plotId } });
    if (!plot) {
      throw new BadRequestException('플롯을 찾을 수 없습니다.');
    }
    await this.projectAccessService.assertProjectAccess(userId, plot.projectId);
    return plot;
  }

  async findAllForUser(userId: string, plotId: string) {
    await this.assertPlotAccess(userId, plotId);
    return this.pointsRepo.find({
      where: { plotId } as any,
      order: { orderIndex: 'ASC' } as any,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const point = await this.pointsRepo.findOne({ where: { id } });
    if (!point) return null;
    await this.assertPlotAccess(userId, point.plotId);
    return point;
  }

  async createForUser(userId: string, dto: Partial<PlotPoint>) {
    if (!dto.plotId) {
      throw new BadRequestException('plotId가 필요합니다.');
    }
    await this.assertPlotAccess(userId, dto.plotId);
    const point = this.pointsRepo.create(dto as any);
    return this.pointsRepo.save(point as any);
  }

  async updateForUser(userId: string, id: string, dto: Partial<PlotPoint>) {
    const point = await this.pointsRepo.findOne({ where: { id } });
    if (!point) return null;
    await this.assertPlotAccess(userId, point.plotId);
    await this.pointsRepo.update({ id } as any, dto as any);
    return this.findOneForUser(userId, id);
  }

  async removeForUser(userId: string, id: string) {
    const point = await this.pointsRepo.findOne({ where: { id } });
    if (!point) return;
    await this.assertPlotAccess(userId, point.plotId);
    await this.pointsRepo.delete({ id } as any);
  }
}

