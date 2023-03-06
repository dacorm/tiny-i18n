import { Fragment } from "react";

import { TinyI18N } from "../tiny-i18n";
import { TinyI18NContext } from "./context";

interface I18NProviderProps {
    tinyI18N: TinyI18N<any>;
    children: React.ReactNode;
}

export const TinyI18NProvider = ({ tinyI18N, children }: I18NProviderProps) => {
    return <TinyI18NContext.Provider value={tinyI18N}>{children}</TinyI18NContext.Provider>;
};

interface TaggedTextProps {
    text: string;
    tags?: Record<string, (str: string) => JSX.Element>;
}

const tagsRegex = /(<\d+>[^<>]*<\/\d+>)/;
const openCloseTagRegex = /<(\d+)>([^<>]*)<\/(\d+)>/;

const interpolateTags = (
    text: string,
    params?: Record<string, (str: string) => JSX.Element>
) => {
    if (!params) {
        return text;
    }

    const tokens = text.split(tagsRegex);

    return tokens.map((token) => {
        const matchResult = openCloseTagRegex.exec(token);

        if (!matchResult) {
            return token;
        }

        const [, openTag, content, closeTag] = matchResult;

        if (!openTag || !closeTag || openTag !== closeTag) {
            return token;
        }

        return (
            <Fragment key={content}>{params[openTag]?.(content ?? "")}</Fragment>
        );
    });
};

export const TaggedText = ({ text, tags }: TaggedTextProps) => {
    return <>{interpolateTags(text, tags)}</>;
};