const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
    app.use(
        "/bimtrack/token",
        createProxyMiddleware({
            target: "https://auth.bimtrackapp.co//connect/token",
            pathRewrite: {
                "^/bimtrack/token": "", // remove base path
            },
            changeOrigin: true,
        })
    );

    app.use(
        "/bimtrack/bcf/2.1",
        createProxyMiddleware({
            // target: "https://bcfrestapi.bimtrackapp.co/bcf/2.1/",
            target: "https://bcfrestapi-bt02.bimtrackapp.co/bcf/2.1/",
            pathRewrite: {
                "^/bimtrack/bcf/2.1": "", // remove base path
            },
            changeOrigin: true,
        })
    );

    app.use(
        "/ditio",
        createProxyMiddleware({
            target: "https://ditio-api-v3.azurewebsites.net",
            // target: "https://ditio-api-test.azurewebsites.net",
            pathRewrite: {
                "^/ditio": "", // remove base path
            },
            changeOrigin: true,
        })
    );

    app.use(
        "/leica/login",
        createProxyMiddleware({
            target: "https://conx.leica-geosystems.com/frontend/login",
            pathRewrite: {
                "^/leica/login": "",
            },
            changeOrigin: true,
            onProxyRes: (proxyRes, _req, _res) => {
                const csrftoken = proxyRes.headers["set-cookie"]
                    ?.find((cookie) => cookie.includes("csrftoken"))
                    ?.match(/csrftoken=(?<csrfToken>[\w]+)/)?.groups?.csrfToken;
                proxyRes.headers["x-csrftoken"] = csrftoken;

                const sessionId = proxyRes.headers["set-cookie"]
                    ?.find((cookie) => cookie.includes("sessionid"))
                    ?.match(/sessionid=(?<sessionId>[\w]+)/)?.groups?.sessionId;
                proxyRes.headers["x-sessionid"] = sessionId;

                const success = proxyRes.headers["location"] !== undefined;

                if (success) {
                    proxyRes.headers["x-success"] = true;
                }

                delete proxyRes.headers["set-cookie"];
                delete proxyRes.headers["location"];
            },
            onProxyReq: (proxyReq, _req, _res) => {
                proxyReq.removeHeader("Referer");
                proxyReq.setHeader("Referer", "https://conx.leica-geosystems.com/ext/login");
                proxyReq.removeHeader("Cookie");
                const cookie = proxyReq.getHeader("x-cookie");

                if (cookie) {
                    proxyReq.setHeader("Cookie", cookie);
                }
            },
        })
    );

    app.use(
        "/leica/api",
        createProxyMiddleware({
            target: "https://conx.leica-geosystems.com/api",
            changeOrigin: true,
            pathRewrite: {
                "^/leica/api": "",
            },
            onProxyReq: (proxyReq, _req, _res) => {
                const cookie = proxyReq.getHeader("x-cookie");

                if (cookie) {
                    proxyReq.setHeader("Cookie", cookie);
                }
            },
            onProxyRes: (proxyRes, _req, _res) => {
                delete proxyRes.headers["set-cookie"];
                delete proxyRes.headers["location"];
            },
        })
    );
};
