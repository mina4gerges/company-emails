import type { ITranslationDecoratorInterface } from '../interfaces/ITranslationDecoratorInterface.ts';

export const STATIC_TRANSLATION_DECORATOR_KEY = 'custom:static-translate';

// FIXME: This is a temporary solution to get the translation decorator working.
export function StaticTranslate(
  data: ITranslationDecoratorInterface = {},
): PropertyDecorator {
  return (target, key) => {
    Reflect.defineMetadata(STATIC_TRANSLATION_DECORATOR_KEY, data, target, key);
  };
}
