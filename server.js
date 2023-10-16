const express = require("express");
const expressStaticGzip = require("express-static-gzip");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const fs = require("fs");
const app = express();

const index = path.resolve(__dirname, "dist/index.html");

function sendIndex(req, res) {
    if (
        process.env.BIMCOLLAB_CLIENT_SECRET ||
        process.env.BIMCOLLAB_CLIENT_ID ||
        process.env.BIMTRACK_CLIENT_SECRET ||
        process.env.BIMTRACK_CLIENT_ID ||
        process.env.DITIO_CLIENT_SECRET ||
        process.env.DITIO_CLIENT_ID ||
        process.env.DATA_SERVER_URL ||
        process.env.JIRA_CLIENT_ID ||
        process.env.JIRA_CLIENT_SECRET ||
        process.env.XSITEMANAGE_CLIENT_ID
    ) {
        fs.readFile(index, "utf8", function (err, data) {
            if (err) {
                console.error(err);
                return;
            }

            let indexHtml = data.toString();

            if (process.env.DATA_SERVER_URL) {
                indexHtml = indexHtml.replace(
                    "window.dataServerUrl",
                    `window.dataServerUrl="${process.env.DATA_SERVER_URL}"`
                );
            }

            if (process.env.BIMCOLLAB_CLIENT_SECRET) {
                indexHtml = indexHtml.replace(
                    "window.bimCollabClientSecret",
                    `window.bimCollabClientSecret="${process.env.BIMCOLLAB_CLIENT_SECRET}"`
                );
            }

            if (process.env.BIMCOLLAB_CLIENT_ID) {
                indexHtml = indexHtml.replace(
                    "window.bimCollabClientId",
                    `window.bimCollabClientId="${process.env.BIMCOLLAB_CLIENT_ID}"`
                );
            }

            if (process.env.BIMTRACK_CLIENT_SECRET) {
                indexHtml = indexHtml.replace(
                    "window.bimTrackClientSecret",
                    `window.bimTrackClientSecret="${process.env.BIMTRACK_CLIENT_SECRET}"`
                );
            }

            if (process.env.BIMTRACK_CLIENT_ID) {
                indexHtml = indexHtml.replace(
                    "window.bimTrackClientId",
                    `window.bimTrackClientId="${process.env.BIMTRACK_CLIENT_ID}"`
                );
            }

            if (process.env.DITIO_CLIENT_SECRET) {
                indexHtml = indexHtml.replace(
                    "window.ditioClientSecret",
                    `window.ditioClientSecret="${process.env.DITIO_CLIENT_SECRET}"`
                );
            }

            if (process.env.DITIO_CLIENT_ID) {
                indexHtml = indexHtml.replace(
                    "window.ditioClientId",
                    `window.ditioClientId="${process.env.DITIO_CLIENT_ID}"`
                );
            }

            if (process.env.JIRA_CLIENT_SECRET) {
                indexHtml = indexHtml.replace(
                    "window.jiraClientSecret",
                    `window.jiraClientSecret="${process.env.JIRA_CLIENT_SECRET}"`
                );
            }

            if (process.env.JIRA_CLIENT_ID) {
                indexHtml = indexHtml.replace(
                    "window.jiraClientId",
                    `window.jiraClientId="${process.env.JIRA_CLIENT_ID}"`
                );
            }

            if (process.env.XSITEMANAGE_CLIENT_ID) {
                indexHtml = indexHtml.replace(
                    "window.xsiteManageClientId",
                    `window.xsiteManageClientId="${process.env.XSITEMANAGE_CLIENT_ID}"`
                );
            }

            res.send(indexHtml);
        });
    } else {
        res.sendFile(index);
    }
}

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
    "/xsitemanage",
    createProxyMiddleware({
        target: "https://api.prod.xsitemanage.com",
        pathRewrite: {
            "^/xsitemanage/": "", // remove base path
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

// NOTE(OLA): Omega sends invalid headers which crashes http-proxy-middleware on nodejs version > 18.16.0
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
    next();
});
app.get("/", sendIndex);
app.use("/", express.static("dist"));
app.use(
    "/",
    expressStaticGzip("dist", {
        enableBrotli: true,
        orderPreference: ["br", "gz"],
    })
);
app.get("/*", sendIndex);

if (process.env.PORT) {
    app.listen(process.env.PORT || 80, () => console.log("Server is listening on port 80 or whatever Azure wants"));
} else {
    const https = require("https");
    https.createServer({}, app).listen(443);
    // https
    //     .createServer(
    //         {
    //             cert: fs.readFileSync("./localhost.crt"),
    //             key: fs.readFileSync("./localhost.key"),
    //         },
    //         app
    //     )
    //     .listen(5000);
}
