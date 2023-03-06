import { createContext } from "react";
import { TinyI18N } from "../tiny-i18n";

export const TinyI18NContext = createContext<TinyI18N<any> | null>(null);