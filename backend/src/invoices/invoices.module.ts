import { Module } from '@nestjs/common';
import { InvoiceResolverService } from './invoice-resolver.service.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceResolverService],
  exports: [InvoicesService, InvoiceResolverService],
})
export class InvoicesModule {}
