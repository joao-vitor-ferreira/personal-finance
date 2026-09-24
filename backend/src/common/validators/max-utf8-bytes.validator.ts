import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function MaxUtf8Bytes(
  maximumBytes: number,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'maxUtf8Bytes',
      target: object.constructor,
      propertyName,
      constraints: [maximumBytes],
      options: validationOptions,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          Buffer.byteLength(value, 'utf8') <= maximumBytes,
        defaultMessage: (arguments_: ValidationArguments) =>
          `${arguments_.property} deve possuir no máximo ${String(arguments_.constraints[0])} bytes em UTF-8`,
      },
    });
  };
}
