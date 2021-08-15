import i18next from 'i18next';

import { localization } from './localization';
import { Language } from './constants';

// From: https://stackoverflow.com/questions/58277973/how-to-type-check-i18n-dictionaries-with-typescript
type Concat<K extends string, P extends string> = `${K}${'' extends P ? '' : '.'}${P}`;

// get all possible key paths
type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]-?: `${K & string}` | Concat<K & string, DeepKeys<T[K]>>;
    }[keyof T]
  : '';

// or: only get leaf and no intermediate key path
type DeepLeafKeys<T> = T extends object ? { [K in keyof T]-?: Concat<K & string, DeepKeys<T[K]>> }[keyof T] : '';

// T is the dictionary, S ist the next string part of the object property path
// If S does not match dict shape, return its next expected properties
type DeepKeysNext<T, S extends string> = T extends object
  ? S extends `${infer I1}.${infer I2}`
    ? I1 extends keyof T
      ? `${I1}.${DeepKeysNext<T[I1], I2>}`
      : keyof T & string
    : S extends keyof T
    ? `${S}`
    : keyof T & string
  : '';

// returns property value from object O given property path T, otherwise never
type GetDictValue<T extends string, O> = T extends `${infer A}.${infer B}`
  ? A extends keyof O
    ? GetDictValue<B, O[A]>
    : never
  : T extends keyof O
  ? O[T]
  : never;

const genLocalizationResource = () => {
  const langArray = Object.keys(localization).map((lang) => ({ [lang]: { translation: localization[lang] } }));
  return langArray.reduce((acc, cur) => ({ ...acc, ...cur }), {});
};

class Translation {
  private isInitComplete = false;

  constructor() {
    const isDebug = process.env.STAGING === 'dev';

    console.log(`Translation init started. Debug: ${isDebug}`);

    i18next
      .init({
        debug: isDebug,
        resources: genLocalizationResource(),
      })
      .then(() => {
        this.isInitComplete = true;
        console.log('Translation init finished');
      });
  }

  public t<P extends DeepKeys<typeof localization[Language.English]>>(
    lang: Language,
    key: P,
  ): GetDictValue<P, typeof localization[Language.English]> | string {
    if (!this.isInitComplete) {
      return 'Translations still processing. Please try later.';
    }
    console.log(key);
    console.log();

    return i18next.t(key, { lng: lang });
  }

  public getT =
    (lang: Language) =>
    <P extends DeepKeys<typeof localization[Language.English]>>(
      key: P,
    ): GetDictValue<P, typeof localization[Language.English]> | string =>
      this.t(lang, key);
}

const translationGetter = new Translation().getT;
export default translationGetter;
