export const isIpad =
    /\biPad/.test(navigator.userAgent) ||
    (/\bMobile\b/.test(navigator.userAgent) && /\bMacintosh\b/.test(navigator.userAgent));
export const isIphone = /\biPhone/.test(navigator.userAgent);

export { useAppSelector, useAppDispatch } from "./redux-store-interactions";
export { App } from "./app";
export { type RootState } from "./store";
