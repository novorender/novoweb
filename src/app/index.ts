import { createAPI } from "@novorender/data-js-api";

import { dataServerBaseUrl } from "config/app";
import { getAuthHeader } from "utils/auth";

export const isIpad =
    /\biPad/.test(navigator.userAgent) ||
    (/\bMobile\b/.test(navigator.userAgent) && /\bMacintosh\b/.test(navigator.userAgent));
export const isIphone = /\biPhone/.test(navigator.userAgent);
export const dataApi = createAPI({ authHeader: getAuthHeader, serviceUrl: dataServerBaseUrl });

export { App } from "./app";
