import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChartsService } from './charts.service';

@ApiTags('Charts')
@Controller('charts')
export class ChartsController {
  constructor(private readonly charts: ChartsService) {}

  @Get('markets/search')
  @ApiOperation({ summary: 'Search Polymarket markets (or top volume if empty q)' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'limit', required: false })
  search(@Query('q') q?: string, @Query('limit') limit?: string) {
    const n = limit ? Math.min(30, Math.max(1, parseInt(limit, 10) || 15)) : 15;
    return this.charts.searchMarkets(q ?? '', n);
  }

  @Get('price-history')
  @ApiOperation({ summary: 'CLOB price history for a token id' })
  @ApiQuery({ name: 'tokenId', required: true })
  @ApiQuery({
    name: 'interval',
    required: false,
    description: '1h | 6h | 1d | 1w | 1m | max',
  })
  priceHistory(
    @Query('tokenId') tokenId: string,
    @Query('interval') interval?: string,
  ) {
    return this.charts.getPriceHistory(tokenId, interval ?? '1w');
  }

  @Get('equity')
  @ApiOperation({
    summary: 'Bot copy-performance series from COPIED trades in DB',
  })
  equity() {
    return this.charts.getBotEquity();
  }

  @Get('recent-tokens')
  @ApiOperation({ summary: 'Token ids from recent bot trade log' })
  recentTokens(@Query('limit') limit?: string) {
    const n = limit ? Math.min(30, Math.max(1, parseInt(limit, 10) || 12)) : 12;
    return this.charts.getRecentTradeMarkets(n);
  }
}
