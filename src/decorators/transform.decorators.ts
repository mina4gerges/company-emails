import { Transform } from 'class-transformer';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import _ from 'lodash';

/**
 * @description trim spaces from start and end, replace multiple spaces with one.
 * @example
 * @ApiProperty()
 * @IsString()
 * @Trim()
 * name: string;
 * @returns PropertyDecorator
 * @constructor
 */
export function Trim(trimNewLines: boolean): PropertyDecorator {
  return Transform((params): string[] | string => {
    const value = params.value as string[] | string;

    if (!value) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((v) => {
        const trimmedValue = v.trim();

        if (trimNewLines) {
          return trimmedValue.replaceAll(/\s\s+/g, ' ');
        }

        return trimmedValue;
      });
    }

    const trimmedValue = value.trim();

    if (trimNewLines) {
      return trimmedValue.replaceAll(/\s\s+/g, ' ');
    }

    return trimmedValue;
  });
}

export function ToBoolean(): PropertyDecorator {
  return Transform(
    (params) => {
      switch (params.value) {
        case 'true': {
          return true;
        }

        case 'false': {
          return false;
        }

        default: {
          return params.value;
        }
      }
    },
    { toClassOnly: true },
  );
}

/**
 * @description transforms to array, specially for query params
 * @example
 * @IsNumber()
 * @ToArray()
 * name: number;
 * @constructor
 */
export function ToArray(): PropertyDecorator {
  return Transform(
    (params): unknown[] => {
      const value = params.value;

      if (!value) {
        return value;
      }

      return _.castArray(value);
    },
    { toClassOnly: true },
  );
}

export function ToLowerCase(): PropertyDecorator {
  return Transform(
    (params) => {
      const value = params.value;

      if (!value) {
        return;
      }

      if (!Array.isArray(value)) {
        return value.toLowerCase();
      }

      return value.map((v) => v.toLowerCase());
    },
    {
      toClassOnly: true,
    },
  );
}

export function ToUpperCase(): PropertyDecorator {
  return Transform(
    (params) => {
      const value = params.value;

      if (!value) {
        return;
      }

      if (!Array.isArray(value)) {
        return value.toUpperCase();
      }

      return value.map((v) => v.toUpperCase());
    },
    {
      toClassOnly: true,
    },
  );
}

export function PhoneNumberSerializer(): PropertyDecorator {
  return Transform(
    (params) => parsePhoneNumberWithError(params.value as string).number,
  );
}
