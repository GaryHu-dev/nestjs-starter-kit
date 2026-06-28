import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Validates that a route parameter is a well-formed UUID v4.
 *
 * Throws BadRequestException when the value does not match the
 * UUID format, which prevents invalid values from reaching the
 * repository layer.
 */
@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  transform(value: string): string {
    if (!ParseUuidPipe.UUID_REGEX.test(value)) {
      throw new BadRequestException(`${value} is not a valid UUID`);
    }
    return value;
  }
}
