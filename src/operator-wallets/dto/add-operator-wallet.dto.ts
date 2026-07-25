import { ApiProperty } from '@nestjs/swagger';

export class AddOperatorWalletDto {
  @ApiProperty({ example: '0xabc...' })
  address: string;

  @ApiProperty({ required: false, example: 'Main MetaMask' })
  label?: string;

  @ApiProperty({ required: false, default: false })
  isPrimary?: boolean;
}
