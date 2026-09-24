import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { InstallmentsController } from './installments.controller.js';
import { InstallmentsService } from './installments.service.js';

@Module({
  imports: [InvoicesModule],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
  exports: [InstallmentsService],
})
export class InstallmentsModule {}
