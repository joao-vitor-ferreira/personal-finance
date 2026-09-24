import {
  CategoryType,
  RuleField,
  RuleOperator,
  TransactionType,
} from '../generated/prisma/client.js';

export interface MatchableRule {
  field: RuleField;
  operator: RuleOperator;
  value: string;
  categoryId: string;
  caseSensitive: boolean;
  category: { type: CategoryType };
}

export function matchRuleCategory(
  rules: readonly MatchableRule[],
  description: string,
  transactionType?: TransactionType,
): string | null {
  for (const rule of rules) {
    if (rule.field !== RuleField.DESCRIPTION) continue;
    if (
      transactionType === TransactionType.INCOME &&
      rule.category.type !== CategoryType.INCOME &&
      rule.category.type !== CategoryType.BOTH
    ) {
      continue;
    }
    if (
      transactionType === TransactionType.EXPENSE &&
      rule.category.type !== CategoryType.EXPENSE &&
      rule.category.type !== CategoryType.BOTH
    ) {
      continue;
    }

    const actual = rule.caseSensitive
      ? description
      : description.toLocaleLowerCase('pt-BR');
    const expected = rule.caseSensitive
      ? rule.value
      : rule.value.toLocaleLowerCase('pt-BR');
    const matches =
      (rule.operator === RuleOperator.CONTAINS && actual.includes(expected)) ||
      (rule.operator === RuleOperator.EQUALS && actual === expected) ||
      (rule.operator === RuleOperator.STARTS_WITH &&
        actual.startsWith(expected)) ||
      (rule.operator === RuleOperator.ENDS_WITH && actual.endsWith(expected));

    if (matches) return rule.categoryId;
  }

  return null;
}
