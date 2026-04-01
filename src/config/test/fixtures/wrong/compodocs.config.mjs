export default {
  workspaces: {
    includes: ["packages/*", "apps/*"],
    excludes: ["packages/legacy"],
    wrong: [],
  },
  commands: {
    generate: {
      files: ["**/*.tsx"],
      tag: "generate",
    },
  },
}
