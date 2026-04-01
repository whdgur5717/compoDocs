export default {
  workspace: {
    include: ["packages/*", "apps/*"],
    exclude: ["packages/legacy"],
    root: "",
  },
  commands: {
    generate: {
      files: ["**/*.tsx"],
      tag: "generate",
    },
  },
}
