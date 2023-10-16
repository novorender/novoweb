import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import envCompatible from "vite-plugin-env-compatible";
import svgr from "vite-plugin-svgr";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { existsSync } from "node:fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    const ownCerts = existsSync("./localhost.crt") && existsSync("./localhost.key");

    return {
        optimizeDeps: {
            exclude: ["@novorender/webgl-api", "@novorender/api"],
        },
        envPrefix: "REACT_APP_",
        plugins: [
            react(),
            envCompatible(),
            svgr({ svgrOptions: { titleProp: true } }),
            ...(ownCerts ? [] : [basicSsl()]),
        ],
        define: { ...env },
        server: {
            port: Number(process.env.PORT) || 3000,
            https: ownCerts
                ? {
                      cert: "./localhost.crt",
                      key: "./localhost.key",
                  }
                : true,
            host: true,
            open: true,
            headers: {
                "Cross-Origin-Opener-Policy": "same-origin",
                "Cross-Origin-Embedder-Policy": "require-corp",
            },
            proxy: {
                "/bimtrack/token": {
                    target: "https://auth.bimtrackapp.co//connect/token",
                    rewrite: (path) => path.replace(/^\/bimtrack\/token/, ""),
                    changeOrigin: true,
                },
                "/bimtrack/bcf/2.1": {
                    // target: "https://bcfrestapi.bimtrackapp.co/bcf/2.1/",
                    target: "https://bcfrestapi-bt02.bimtrackapp.co/bcf/2.1/",
                    rewrite: (path) => path.replace(/^\/bimtrack\/bcf\/2.1/, ""),
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
            },
        },
        preview: {
            port: Number(process.env.PORT) || 3000,
            https: true,
            host: true,
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
            ],
        },
    };
});
