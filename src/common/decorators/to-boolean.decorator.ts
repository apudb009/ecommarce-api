import { Transform } from 'class-transformer';

export function ToBoolean() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') return value;

    switch (String(value).toLowerCase()) {
      case 'true':
      case '1':
        return true;

      case 'false':
      case '0':
        return false;

      default:
        return undefined;
    }
  });
}
