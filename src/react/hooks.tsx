import {
    useCallback,
    useContext,
    useEffect,
    useReducer,
    useRef,
    useState,
} from "react";
import type { TinyI18N } from "../tiny-i18n";
import { TinyI18NContext } from "./context";

function useTinyI18NContext() {
    const i18n = useContext(TinyI18NContext);

    if (!i18n) {
        throw new Error("can not `useTinyI18NContext` outside of the `TinyI18NProvider`");
    }

    return i18n;
}

interface ReactI18N<I18NType extends TinyI18N<any>> {
    readonly lang: ReturnType<I18NType["getLang"]>;
    get: I18NType["get"];
    setLang: I18NType["setLang"];
    subscribe: I18NType["subscribe"];
}

export function useTinyI18N<I18NType extends TinyI18N<any>>() {
    const i18n = useTinyI18NContext() as I18NType;
    const [{ langState, updateCount }, setLangState] = useState(() => ({
        langState: i18n.getLang(),
        updateCount: 0,
    }));
    const usesLang = useRef(false);

    useEffect(() => {
        i18n.subscribe((lang) => {
            if (!usesLang.current) {
                return;
            }

            setLangState((state) => ({
                langState: lang,
                updateCount: state.updateCount + 1,
            }));
        });
    }, [i18n]);

    const get: typeof i18n.get = useCallback(
        (key, ...rest) => {
            usesLang.current = true;
            return i18n.get(key, ...rest);
        },
        [i18n, updateCount]
    );

    const setLang: typeof i18n.setLang = useCallback(
        (newLang) => i18n.setLang(newLang),
        [i18n]
    );

    const subscribe: typeof i18n.subscribe = useCallback(
        (cb, options) => i18n.subscribe(cb, options),
        [i18n]
    );

    const reactI18N = {
        get lang() {
            usesLang.current = true;
            return langState;
        },
        get,
        setLang,
        subscribe,
    } as ReactI18N<I18NType>;

    return reactI18N;
}

export function useTranslate<I18NType extends TinyI18N<any>>() {
    const i18n = useTinyI18NContext();
    const [updateCount, forceUpdate] = useReducer((v) => v + 1, 0);

    useEffect(() => {
        return i18n.subscribe(() => {
            forceUpdate();
        });
    }, []);

    const translate: I18NType["get"] = useCallback(
        (key, ...rest) => {
            return i18n.get(key, ...rest);
        },
        [updateCount]
    );

    return translate;
}