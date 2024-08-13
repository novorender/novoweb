import express from "express";
import expressStaticGzip from "express-static-gzip";
import { createProxyMiddleware } from "http-proxy-middleware";
import https from "https";
import path from "path";

const app = express();
const __dirname = path.resolve(path.dirname("."));

// New http-proxy-middleware adds may add a slash in the end of the path
// which is recognized as a different path by some servers
// and causes 404 (e.g. /bimtrack/token)
function removeTrailingSlashFromPath(proxyReq) {
    if (proxyReq.path.endsWith("/")) {
        proxyReq.path = proxyReq.path.slice(0, -1);
    }
}

app.use(
    "/bimtrack/token",
    createProxyMiddleware({
        target: "https://auth.bimtrackapp.co/connect/token",
        on: {
            proxyReq: (proxyReq) => removeTrailingSlashFromPath(proxyReq),
        },
        changeOrigin: true,
    })
);

app.use(
    "/bimtrack/bcf/2.1",
    createProxyMiddleware({
        router: (req) => {
            const url = new URL(`https://explorer.novorender.com/${req.url}`);
            const server = url.searchParams.get("server") ?? "";
            return server + "/bcf/2.1";
        },
        on: {
            proxyReq: (proxyReq) => removeTrailingSlashFromPath(proxyReq),
        },
        changeOrigin: true,
    })
);

app.use(
    "/xsitemanage",
    createProxyMiddleware({
        target: "https://api.prod.xsitemanage.com",
        pathRewrite: {
            "^/xsitemanage/": "",
        },
        on: {
            proxyReq: (proxyReq) => removeTrailingSlashFromPath(proxyReq),
        },
        changeOrigin: true,
    })
);

app.use(
    "/ditio",
    createProxyMiddleware({
        target: "https://ditio-api-v3.azurewebsites.net",
        pathRewrite: {
            "^/ditio": "",
        },
        on: {
            proxyReq: (proxyReq) => removeTrailingSlashFromPath(proxyReq),
        },
        changeOrigin: true,
    })
);
app.use(
    "/ditio-machines",
    createProxyMiddleware({
        target: "https://ditio-report-api.azurewebsites.net/api",
        pathRewrite: {
            "^/ditio-machines": "",
        },
        on: {
            proxyReq: (proxyReq) => removeTrailingSlashFromPath(proxyReq),
        },
        changeOrigin: true,
    })
);

app.use("/omega365", async (req, res) => {
    try {
        const url = new URL("https://nyeveier.pims365.no" + req.originalUrl.replace(/^\/omega365/, ""));
        const omegaRes = await fetch(url, {
            headers: {
                authorization: req.headers.authorization,
            },
        });

        if (omegaRes.ok) {
            const cookieHeaders = omegaRes.headers.getSetCookie();
            cookieHeaders.forEach((header) => res.append("set-cookie", header));
            const json = await omegaRes.json();
            res.json(json);
        } else {
            if (omegaRes.status >= 500) {
                res.status(omegaRes.status).send();
            } else {
                res.status(401).send();
            }
        }
    } catch (e) {
        console.warn(e);
        res.status(500).send();
    }
});

app.use("/*", (_req, res, next) => {
    res.header("Cross-Origin-Opener-Policy", "same-origin");
    res.header("Cross-Origin-Embedder-Policy", "require-corp");
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    next();
});

app.use("/", express.static(path.resolve(__dirname, "dist")));
app.use(
    "/",
    expressStaticGzip(path.resolve(__dirname, "dist"), {
        enableBrotli: true,
        orderPreference: ["br", "gz"],
    })
);

app.get("/config.json", (_req, res) => {
    res.json({
        bimCollabClientSecret: process.env.BIMCOLLAB_CLIENT_SECRET ?? "",
        bimCollabClientId: process.env.BIMCOLLAB_CLIENT_ID ?? "",
        bimTrackClientSecret: process.env.BIMTRACK_CLIENT_SECRET ?? "",
        bimTrackClientId: process.env.BIMTRACK_CLIENT_ID ?? "",
        jiraClientId: process.env.JIRA_CLIENT_ID ?? "",
        jiraClientSecret: process.env.JIRA_CLIENT_SECRET ?? "",
        xsiteManageClientId: process.env.XSITEMANAGE_CLIENT_ID ?? "",
        novorenderClientId: process.env.NOVORENDER_CLIENT_ID ?? "",
        novorenderClientSecret: process.env.NOVORENDER_CLIENT_SECRET ?? "",
        dataServerUrl: process.env.DATA_SERVER_URL ?? "",
        dataV2ServerUrl: process.env.DATA_V2_SERVER_URL ?? "",
        authServerUrl: process.env.AUTH_SERVER_URL ?? "",
        assetsUrl: process.env.ASSETS_URL ?? "",
    });
});
app.get("/*", function (_req, res) {
    res.sendFile(path.resolve(__dirname, "dist/index.html"));
});

if (process.env.PORT) {
    app.listen(process.env.PORT || 80, () => console.log("Server is listening on port 80 or whatever Azure wants"));
} else {
    https.createServer({}, app).listen(443);
}
