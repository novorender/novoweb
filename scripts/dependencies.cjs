const fs = require("fs");

const options = {
    force: true, // overwrite files
    recursive: true,
};

fs.cpSync("node_modules/@novorender/webgl-api", "public/novorender/webgl-api", options);
fs.cpSync("node_modules/@novorender/api/public", "public/novorender/api", options);
