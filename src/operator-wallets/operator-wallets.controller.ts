import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OperatorWalletsService } from './operator-wallets.service';
import { AddOperatorWalletDto } from './dto/add-operator-wallet.dto';

@ApiTags('Operator Wallets')
@Controller('operator/wallets')
export class OperatorWalletsController {
  constructor(private readonly service: OperatorWalletsService) {}

  @Get()
  @ApiOperation({ summary: 'List linked operator (connected) wallets' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Link an operator wallet (from Connect Wallet)' })
  @ApiBody({ type: AddOperatorWalletDto })
  add(@Body() body: AddOperatorWalletDto) {
    return this.service.add(body.address, body.label, body.isPrimary);
  }

  @Patch(':id/primary')
  @ApiOperation({ summary: 'Mark wallet as primary viewing account' })
  setPrimary(@Param('id') id: string) {
    return this.service.setPrimary(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unlink operator wallet' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
