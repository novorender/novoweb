const TypeDoc = require("typedoc");
const app = new TypeDoc.Application();

// If you want TypeDoc to load tsconfig.json / typedoc.json files
app.options.addReader(new TypeDoc.TSConfigReader());
app.options.addReader(new TypeDoc.TypeDocReader());

const res = app.bootstrap({
    entryPoints: ["src/index.tsx"],
    theme: "minimal",
});

//const project = app.convert(app.expandInputFiles(['src']));
const project = app.convert(["src/index.tsx"]);
// console.log(project);

if (project) {
    // Project may not have converted correctly
    const outputDir = "docs";

    // Rendered docs
    app.generateDocs(project, outputDir);
    // // Generate JSON output
    // app.generateJson(project, outputDir + '/documentation.json');
}
