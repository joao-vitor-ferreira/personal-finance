import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { RulesModule } from '../rules/rules.module.js';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';

@Module({
  imports: [RulesModule, InvoicesModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
