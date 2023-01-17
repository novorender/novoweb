import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import envCompatible from "vite-plugin-env-compatible";
import svgr from "vite-plugin-svgr";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());

    return {
        envPrefix: "REACT_APP_",
        plugins: [react(), envCompatible(), svgr(), basicSsl()],
        define: { ...env },
        server: {
            port: Number(process.env.PORT) || 3000,
            https: true,
            host: true,
            open: true,
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
