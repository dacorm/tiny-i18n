type Translation = string | Record<string, string>;
type Keyset = Record<string, Translation>;

export type LanguageConfig = {
    keyset: Keyset | (() => Promise<Keyset>);
    pluralize: (count: number) => string;
};

interface TinyI18NOptions<
    LanguagesList extends Record<string, LanguageConfig>,
    Lang extends keyof LanguagesList = keyof LanguagesList
> {
    defaultLang: Lang;
    languages: LanguagesList;
}

type KeyType<KeysetsList extends Record<string, LanguageConfig>> =
    keyof KeysetType<KeysetsList>;

type KeysetType<KeysetsList extends Record<string, LanguageConfig>> =
    UnwrapKeysetType<KeysetsList[keyof KeysetsList]["keyset"]>;

type UnwrapKeysetType<
    MaybeUnresolvedKeyset extends Keyset | (() => Promise<Keyset>)
> = MaybeUnresolvedKeyset extends () => Promise<infer ResolvedKeyset>
    ? ResolvedKeyset
    : MaybeUnresolvedKeyset;

type GetRestParams<
    KeysetsList extends Record<string, LanguageConfig>,
    Key extends KeyType<KeysetsList>
> = KeysetType<KeysetsList>[Key] extends object
    ? [options: { count: number; [key: string]: number | string }]
    : [options?: Record<string, string | number>];

export class TinyI18N<KeysetsList extends Record<string, LanguageConfig>> {
    private lang: keyof KeysetsList;
    private subscribers = new Set<(lang: keyof KeysetsList) => void>();
    private keysets: KeysetsList;

    constructor(options: TinyI18NOptions<KeysetsList>) {
        this.keysets = options.languages;
        this.setLang(options.defaultLang);
        this.lang = options.defaultLang;
    }

    getLang() {
        return this.lang;
    }

    get<Key extends KeyType<KeysetsList>>(
        key: Key,
        ...rest: GetRestParams<KeysetsList, Key>
    ): string {
        const { keyset, pluralize } = this.keysets[this.lang]!;

        if (typeof keyset === "function") {
            return String(key);
        }

        const translation: string | Record<string, string> | undefined =
            keyset[key];

        if (typeof translation === "undefined") {
            return String(key);
        }
        const [params = {}] = rest;

        if (typeof translation === "string") {
            return interpolateTranslation(translation, params);
        }

        const pluralKey = pluralize(params.count as number);

        const pluralizedTranslation = translation[pluralKey]!;

        return interpolateTranslation(pluralizedTranslation, params);
    }

    async setLang(newLang: keyof KeysetsList) {
        try {
            if (newLang === this.lang) {
                return;
            }

            const { keyset } = this.keysets[newLang]!;

            if (typeof keyset === "function") {
                const resolvedKeyset = await keyset();

                this.keysets[newLang]!.keyset = resolvedKeyset;
            }

            this.lang = newLang;

            this.subscribers.forEach((cb) => cb(newLang));
        } catch (error) {
            console.error(
                `Error updating language. Can not resolve lazy loaded keyset for "${String(
                    newLang
                )}" language. See the error below to get more details`
            );
            throw error;
        }
    }

    subscribe(
        cb: (fn: keyof KeysetsList) => void,
        options?: { immediate: boolean }
    ) {
        this.subscribers.add(cb);

        if (options?.immediate) {
            cb(this.lang);
        }

        return () => {
            this.subscribers.delete(cb);
        };
    }
}

const mustacheParamRegex = /\{\{\s*([a-zA-Z10-9]+)\s*\}\}/g;

function interpolateTranslation(
    translation: string,
    params: Record<string, string | number>
) {
    return translation.replace(mustacheParamRegex, (original, paramKey) => {
        if (paramKey in params) {
            return String(params[paramKey]);
        }

        return original;
    });
}