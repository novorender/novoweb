const express = require("express");
const expressStaticGzip = require("express-static-gzip");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const fs = require("fs");
const app = express();

const index = path.resolve(__dirname, "build/index.html");

function sendIndex(req, res) {
    if (
        process.env.BIMCOLLAB_CLIENT_SECRET ||
        process.env.BIMCOLLAB_CLIENT_ID ||
        process.env.BIMTRACK_CLIENT_SECRET ||
        process.env.BIMTRACK_CLIENT_ID ||
        process.env.DATA_SERVER_URL
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

app.get("/", sendIndex);
app.use("/", express.static("build"));
app.use(
    "/",
    expressStaticGzip("build", {
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
}
