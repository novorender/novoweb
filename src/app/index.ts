import { createAPI } from "@novorender/data-js-api";

import { getAuthHeader } from "utils/auth";

export const isIpad =
    /\biPad/.test(navigator.userAgent) ||
    (/\bMobile\b/.test(navigator.userAgent) && /\bMacintosh\b/.test(navigator.userAgent));
export const isIphone = /\biPhone/.test(navigator.userAgent);
export const dataApi = createAPI({ authHeader: getAuthHeader });

export { App } from "./app";
