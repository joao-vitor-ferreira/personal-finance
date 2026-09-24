-- AlterEnum
ALTER TYPE "ImportStatus" ADD VALUE 'PROCESSING';

-- Domain invariants not expressible in Prisma Schema Language.
ALTER TABLE "Account"
  ADD CONSTRAINT "Account_initialBalance_api_safe" CHECK (abs("initialBalance") <= 90000000000000.00),
  ADD CONSTRAINT "Account_currentBalance_api_safe" CHECK (abs("currentBalance") <= 90000000000000.00),
  ADD CONSTRAINT "Account_name_not_blank" CHECK (btrim("name") <> '');

ALTER TABLE "CreditCard"
  ADD CONSTRAINT "CreditCard_limit_api_safe" CHECK ("creditLimit" > 0 AND "creditLimit" <= 90000000000000.00),
  ADD CONSTRAINT "CreditCard_closingDay_valid" CHECK ("closingDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "CreditCard_dueDay_valid" CHECK ("dueDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "CreditCard_lastFourDigits_valid" CHECK ("lastFourDigits" ~ '^[0-9]{4}$');

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_amounts_api_safe" CHECK (
    abs("totalAmount") <= 90000000000000.00
    AND abs("paidAmount") <= 90000000000000.00
  ),
  ADD CONSTRAINT "Invoice_referenceMonth_valid" CHECK ("referenceMonth" BETWEEN 1 AND 12),
  ADD CONSTRAINT "Invoice_paid_consistent" CHECK (
    "status" <> 'PAID' OR ("totalAmount" > 0 AND "paidAmount" = "totalAmount")
  );

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_amount_valid" CHECK ("amount" > 0 AND "amount" <= 9000000000000.00),
  ADD CONSTRAINT "Transaction_description_not_blank" CHECK (btrim("description") <> ''),
  ADD CONSTRAINT "Transaction_target_consistent" CHECK (
    (
      "type" = 'TRANSFER'
      AND "accountId" IS NOT NULL
      AND "creditCardId" IS NULL
      AND "invoiceId" IS NULL
      AND "transferId" IS NOT NULL
    )
    OR
    (
      "type" <> 'TRANSFER'
      AND "transferId" IS NULL
      AND (
        ("accountId" IS NOT NULL AND "creditCardId" IS NULL AND "invoiceId" IS NULL)
        OR
        ("accountId" IS NULL AND "creditCardId" IS NOT NULL AND "invoiceId" IS NOT NULL)
      )
    )
  ),
  ADD CONSTRAINT "Transaction_installment_consistent" CHECK (
    (
      "installmentGroupId" IS NULL
      AND "installmentNumber" IS NULL
      AND "totalInstallments" IS NULL
    )
    OR
    (
      "installmentGroupId" IS NOT NULL
      AND "installmentNumber" BETWEEN 1 AND "totalInstallments"
      AND "totalInstallments" >= 2
    )
  );

ALTER TABLE "InstallmentGroup"
  ADD CONSTRAINT "InstallmentGroup_amount_valid" CHECK ("totalAmount" > 0 AND "totalAmount" <= 9000000000000.00),
  ADD CONSTRAINT "InstallmentGroup_count_valid" CHECK ("totalInstallments" BETWEEN 2 AND 120),
  ADD CONSTRAINT "InstallmentGroup_description_not_blank" CHECK (btrim("description") <> '');

ALTER TABLE "Transfer"
  ADD CONSTRAINT "Transfer_amount_valid" CHECK ("amount" > 0 AND "amount" <= 9000000000000.00),
  ADD CONSTRAINT "Transfer_accounts_different" CHECK ("sourceAccountId" <> "destinationAccountId"),
  ADD CONSTRAINT "Transfer_description_not_blank" CHECK (btrim("description") <> '');

ALTER TABLE "ImportBatch"
  ADD CONSTRAINT "ImportBatch_target_consistent" CHECK (
    ("accountId" IS NOT NULL AND "creditCardId" IS NULL)
    OR ("accountId" IS NULL AND "creditCardId" IS NOT NULL)
  );

ALTER TABLE "ImportItem"
  ADD CONSTRAINT "ImportItem_amount_valid" CHECK (
    "amount" IS NULL OR ("amount" > 0 AND "amount" <= 9000000000000.00)
  );

ALTER TABLE "InvoicePayment"
  ADD CONSTRAINT "InvoicePayment_amount_valid" CHECK ("amount" > 0 AND "amount" <= 90000000000000.00);

ALTER TABLE "CategorizationRule"
  ADD CONSTRAINT "CategorizationRule_name_not_blank" CHECK (btrim("name") <> ''),
  ADD CONSTRAINT "CategorizationRule_value_not_blank" CHECK (btrim("value") <> '');
