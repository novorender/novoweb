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
};
