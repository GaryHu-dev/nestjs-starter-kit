import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Validates that a string meets the application's password strength policy:
 * at least 8 characters, one uppercase letter, one lowercase letter,
 * one digit, and one special character.
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isStrongPassword',
      target: (object as { constructor: new (...args: unknown[]) => unknown }).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must contain at least 8 characters, one uppercase letter, one lowercase letter, one digit, and one special character`;
        },
      },
    });
  };
}
