/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module "*.svg" {
    const src: string;
    export default src;
}
