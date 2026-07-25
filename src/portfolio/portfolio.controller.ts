import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get()
  @ApiOperation({
    summary: 'Portfolio positions (live Polymarket + local bot tracking)',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: ['bot', 'wallet'],
    description: 'bot = FUNDER_ADDRESS; wallet = pass address',
  })
  @ApiQuery({
    name: 'address',
    required: false,
    description: 'Required when source=wallet; optional override for bot',
  })
  getPortfolio(
    @Query('source') source?: string,
    @Query('address') address?: string,
  ) {
    return this.portfolio.getPortfolio({ source, address });
  }

  @Post('reconcile')
  @ApiOperation({
    summary:
      'Overwrite local bot_positions from live Data API for FUNDER_ADDRESS',
  })
  reconcile() {
    return this.portfolio.reconcileFromLive();
  }
}
