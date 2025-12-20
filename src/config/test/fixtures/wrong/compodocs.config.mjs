export default {
  workspaces: {
    includes: ["packages/*", "apps/*"],
    excludes: ["packages/legacy"],
    wrong: [],
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
