const fs = require("fs-extra");

fs.removeSync("public/novorender");
fs.mkdirSync("public/novorender");
fs.copySync("node_modules/@novorender/webgl-api", "public/novorender/webgl-api");
fs.copySync("node_modules/@novorender/measure-api/build", "public/novorender/measure-api");
console.log("\nCopied @novorender/measure-api and @novorender/webgl-api files to public/novorender/\n");

const isCi = process.env.CI !== undefined;
if (!isCi) {
    require("husky").install();
}
