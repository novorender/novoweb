const express = require("express");
const expressStaticGzip = require("express-static-gzip");
const path = require("path");
const fs = require("fs");
const app = express();

const index = path.resolve(__dirname, "build/index.html");

function sendIndex(req, res) {
    if (process.env.BIMCOLLAB_CLIENT_SECRET || process.env.BIMCOLLAB_CLIENT_ID || process.env.DATA_SERVER_URL) {
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

            res.send(indexHtml);
        });
    } else {
        res.sendFile(index);
    }
}

app.get("/", sendIndex);
app.use("/", express.static("build"));
app.use(
    "/",
    expressStaticGzip("build", {
        customCompressions: [
            {
                encodingName: "gzip",
                fileExtension: "gz",
            },
        ],
        orderPreference: ["gz"],
    })
);
app.get("/*", sendIndex);

if (process.env.PORT) {
    app.listen(process.env.PORT || 80, () => console.log("Server is listening on port 80 or whatever Azure wants"));
} else {
    const https = require("https");
    https.createServer({}, app).listen(443);
}
