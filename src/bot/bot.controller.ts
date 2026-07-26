import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BotService } from './bot.service';

class PauseBotDto {
  reason?: string;
}

class SaveConfigDto {
  funderAddress: string;
  apiCreds?: any;
}

@ApiTags('Bot')
@Controller('bot')
export class BotController {
  constructor(private readonly bot: BotService) {}

  @Get('status')
  @ApiOperation({ summary: 'Bot status (running/paused, execution address)' })
  getStatus() {
    return this.bot.getStatus();
  }

  @Post('config')
  @ApiOperation({ summary: 'Save dynamic execution wallet and credentials from frontend' })
  @ApiBody({ type: SaveConfigDto })
  saveConfig(@Body() body: SaveConfigDto) {
    return this.bot.saveConfig(body);
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause copy trading (kill switch)' })
  @ApiBody({ type: PauseBotDto, required: false })
  pause(@Body() body?: PauseBotDto) {
    return this.bot.pause(body?.reason);
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume copy trading' })
  resume() {
    return this.bot.resume();
  }
}
