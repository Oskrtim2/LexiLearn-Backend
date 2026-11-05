import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function flattenError(error: ValidationError, parentPath: string): string[] {
  const path = parentPath.length > 0 ? `${parentPath}.${error.property}` : error.property;
  const messages = Object.values(error.constraints ?? {});
  const childMessages = (error.children ?? []).flatMap((child) => flattenError(child, path));

  return [...messages, ...childMessages];
}

export function validationExceptionFactory(
  errors: readonly ValidationError[],
): BadRequestException {
  const messages = errors.flatMap((error) => flattenError(error, ''));

  return new BadRequestException(
    messages.length > 0 ? messages : ['The request payload is invalid'],
  );
}
