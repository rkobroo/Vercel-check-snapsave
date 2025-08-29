import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  declaration: true,
  entries: [
    "./src/index"
  ],
  externals: [
    "cheerio"
  ],
  rollup: {
    inlineDependencies: false,
    emitCJS: false,
    treeshake: true
  }
});
