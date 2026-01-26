import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('quota')
  quota(@Req() req: any) {
    return this.aiService.getQuota(req.user?.userId, req.user?.role);
  }

  @Post('complete')
  complete(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'complete', '/ai/complete', dto);
  }

  @Post('search')
  search(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'search', '/ai/search', dto);
  }

  @Post('style/convert')
  styleConvert(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'style_convert', '/ai/style/convert', dto);
  }

  @Post('character/simulate')
  characterSimulate(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'character_simulate', '/ai/character/simulate', dto);
  }

  @Post('predict')
  predict(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'predict', '/ai/predict', dto);
  }

  @Post('translate')
  translate(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'translate', '/ai/translate', dto);
  }

  @Post('research')
  research(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'research', '/ai/research', dto);
  }

  @Post('storyboard')
  storyboard(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'storyboard', '/ai/storyboard', dto);
  }

  @Post('tts')
  tts(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'tts', '/ai/tts', dto);
  }

  @Post('transcribe')
  transcribe(@Req() req: any, @Body() dto: any) {
    return this.aiService.proxy(req.user, 'transcribe', '/ai/transcribe', dto);
  }
}

