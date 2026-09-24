import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function IsNonBlank(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isNonBlank',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && value.trim().length > 0,
        defaultMessage: (arguments_: ValidationArguments) =>
          `${arguments_.property} não pode conter somente espaços`,
      },
    });
  };
}
