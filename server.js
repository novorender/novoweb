const express = require("express");
const expressStaticGzip = require("express-static-gzip");
const path = require("path");
const app = express();

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

const index = path.resolve(__dirname, "build/index.html");

app.get("/*", function (req, res) {
    res.sendFile(index);
});

if (process.env.PORT) {
    app.listen(process.env.PORT || 80, () => console.log("Server is listening on port 80 or whatever Azure wants"));
} else {
    const https = require("https");
    https.createServer({}, app).listen(443);
}
