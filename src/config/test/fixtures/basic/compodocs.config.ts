export default {
  workspace: {
    include: ["packages/*", "apps/*"],
    exclude: ["packages/legacy"],
    root: "",
  },
  commands: {
    generate: {
      files: ["**/*.tsx"],
      outputDir: "__generated__",
      tag: "generate",
    },
    // 나중에 추가
    // build: {
    //   outputDir: "docs"
    // }
  },
}
