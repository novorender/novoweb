import { existsSync } from "node:fs";

import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig, loadEnv, ServerOptions } from "vite";
import envCompatible from "vite-plugin-env-compatible";
import { VitePWA, VitePWAOptions } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

const pwaOptions: Partial<VitePWAOptions> = {
    mode: "production",
    base: "/",
    registerType: "prompt",
    workbox: {
        cacheId: "novorender-explorer",
        maximumFileSizeToCacheInBytes: 15e6,
        globPatterns: ["**/*"],
        runtimeCaching: [
            {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                    cacheName: "google-fonts-cache",
                    expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                    },
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
            {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                    cacheName: "gstatic-fonts-cache",
                    expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                    },
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
            // Scene config
            {
                urlPattern: /^https:\/\/data(-staging)?\.novorender\.com\/api\/scenes\/[\w]{32}$/i,
                handler: "NetworkFirst",
                options: {
                    cacheableResponse: {
                        statuses: [0, 200],
                        headers: {
                            "x-explorer-cacheable": "true",
                        },
                    },
                },
            },
            // Scene groups/bookmarks etc.
            {
                urlPattern: /^https:\/\/data(-staging)?\.novorender\.com\/api\/scenes\/[\w]{32}\/(?!ditio).+/i,
                handler: "NetworkFirst",
                options: {
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
            // Device tier
            {
                urlPattern: /https:\/\/unpkg.com\/detect-gpu@[\d]+\.[\d]+\.[\d]+\/dist\/benchmarks/,
                handler: "NetworkFirst",
                options: {
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
            // Skybox environments
            {
                urlPattern: /^https:\/\/api.novorender.com\/assets\/env/,
                handler: "NetworkFirst",
                options: {
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
            // Project info
            {
                urlPattern: /^https:\/\/data-v2(-staging)?\.novorender\.com\/projects\/[\w]{32}$/,
                handler: "NetworkFirst",
                options: {
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
            // Deviations
            {
                urlPattern: /^https:\/\/novorenderblobs\.blob\.core\.windows\.net\/[\w]{32}\/deviations\.json/,
                handler: "NetworkFirst",
                options: {
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                    matchOptions: {
                        ignoreSearch: true,
                    },
                    plugins: [
                        {
                            cacheKeyWillBeUsed: async (param) => {
                                const url = new URL(param.request.url);
                                url.search = "";
                                return url.toString();
                            },
                        },
                    ],
                },
            },
            {
                urlPattern: /^https:\/\/data-v2(-staging)?\.novorender\.com\/explorer\/[\w]{32}\/deviations$/,
                handler: "NetworkFirst",
                options: {
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
            // config.json
            {
                urlPattern: (options) => {
                    if (!options.sameOrigin) {
                        return false;
                    }

                    return /^\/config.json$/i.test(options.url.pathname);
                },
                handler: "NetworkFirst",
                options: {
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
        ],
    },
    manifest: false,
};

const ownCerts = existsSync("./localhost.crt") && existsSync("./localhost.key");
const serverOptions: ServerOptions = {
    https: ownCerts
        ? {
              cert: "./localhost.crt",
              key: "./localhost.key",
          }
        : undefined,
    host: true,
    open: true,
    headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Resource-Policy": "cross-origin",
    },
    proxy: {
        "/bimtrack/token": {
            target: "https://auth.bimtrackapp.co/connect/token",
            rewrite: (path) => path.replace(/^\/bimtrack\/token/, ""),
            changeOrigin: true,
        },
        "/bimtrack/bcf/2.1": {
            // target: "https://bcfrestapi.bimtrackapp.co/bcf/2.1/",
            target: "https://bcfrestapi-bt02.bimtrackapp.co/",
            rewrite: (path) => path.replace(/^\/bimtrack/, ""),
            changeOrigin: true,
        },
        "/ditio-machines": {
            target: "https://ditio-report-api.azurewebsites.net/api",
            // target: "https://ditio-api-test.azurewebsites.net",
            rewrite: (path) => path.replace(/^\/ditio-machines/, ""),
            changeOrigin: true,
        },
        "/ditio": {
            target: "https://ditio-api-v3.azurewebsites.net",
            // target: "https://ditio-api-test.azurewebsites.net",
            rewrite: (path) => path.replace(/^\/ditio/, ""),
            changeOrigin: true,
        },
        "/xsitemanage": {
            target: "https://api.prod.xsitemanage.com",
            rewrite: (path) => path.replace(/^\/xsitemanage/, ""),
            changeOrigin: true,
        },
        // NOTE(OLA): Omega365 returns invalid headers and proxy crashes on nodejs version > 18.16.0
        "/omega365": {
            target: "https://nyeveier.pims365.no",
            rewrite: (path) => path.replace(/^\/omega365/, ""),
            changeOrigin: true,
        },
        // use REACT_APP_DATA_V2_SERVER_URL=/data-v2 in .env.local to use local version
        "/data-v2": {
            target: "http://127.0.0.1:5000",
            rewrite: (path) => path.replace(/^\/data-v2/, ""),
            changeOrigin: true,
        },
        // use REACT_APP_DATA_SERVER_URL=/data-v1 in .env.local to use local version
        "/data-v1": {
            target: "https://127.0.0.1:5000/api",
            rewrite: (path) => path.replace(/^\/data-v1/, ""),
            changeOrigin: true,
            secure: false,
        },
    },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());

    return {
        build: {
            sourcemap: true,
            rollupOptions: {
                onLog(level, log, handler) {
                    if (
                        log.cause &&
                        typeof log.cause === "object" &&
                        "message" in log.cause &&
                        log.cause.message === `Can't resolve original location of error.`
                    ) {
                        return;
                    }
                    handler(level, log);
                },
            },
        },
        optimizeDeps: {
            exclude: ["@novorender/webgl-api", "@novorender/api"],
        },
        envPrefix: "REACT_APP_",
        plugins: [
            react(),
            envCompatible(),
            svgr({ svgrOptions: { titleProp: true } }),
            ...(ownCerts ? [] : [basicSsl()]),
            VitePWA(pwaOptions),
        ],
        define: { ...env },
        server: {
            port: Number(process.env.PORT) || 3000,
            ...serverOptions,
        },
        preview: {
            port: Number(process.env.PORT) || 5000,
            ...serverOptions,
        },
        resolve: {
            alias: [
                {
                    find: "features",
                    replacement: resolve(__dirname, "src/features"),
                },
                {
                    find: "app",
                    replacement: resolve(__dirname, "src/app"),
                },
                {
                    find: "slices",
                    replacement: resolve(__dirname, "src/slices"),
                },
                {
                    find: "components",
                    replacement: resolve(__dirname, "src/components"),
                },
                {
                    find: "pages",
                    replacement: resolve(__dirname, "src/pages"),
                },
                {
                    find: "config",
                    replacement: resolve(__dirname, "src/config"),
                },
                {
                    find: "types",
                    replacement: resolve(__dirname, "src/types"),
                },
                {
                    find: "utils",
                    replacement: resolve(__dirname, "src/utils"),
                },
                {
                    find: "contexts",
                    replacement: resolve(__dirname, "src/contexts"),
                },
                {
                    find: "media",
                    replacement: resolve(__dirname, "src/media"),
                },
                {
                    find: "hooks",
                    replacement: resolve(__dirname, "src/hooks"),
                },
                {
                    find: "apis",
                    replacement: resolve(__dirname, "src/apis"),
                },
            ],
        },
    };
});
