module.exports = {
  base: "/jest-tutorial/",
  title: "Jest 实践指南",
  description: "从基础实战到测试思维，带你全面了解和掌握前端测试",
  head: [
    [
      "meta",
      {
        name: "keywords",
        content:
          "jest, testing, typescript, eslint, 前端, 测试",
      },
    ],
    ["meta", { name: "author", content: "海怪" }],
  ],
  plugins: [
    "@vuepress/medium-zoom",
    "@vuepress/back-to-top",
    "@vuepress/active-header-links",
  ],
  themeConfig: {
    logo: "/images/logo.png",
    repo: "https://github.com/haixiangyan/jest-tutorial",
    lastUpdated: true,
    nav: [
      {
        text: "Issue",
        link: "https://github.com/haixiangyan/jest-tutorial/issues",
      },
    ],
    sidebar: [
      {
        title: "介绍",
        collapsable: false,
        children: ["/"],
      },
      {
        title: "基础实战",
        collapsable: false,
        children: [
          "/basic/getting-started/",
          "/basic/typescript/",
          "/basic/storage/",
          "/basic/location/",
          "/basic/tdd/",
          "/basic/sleep/",
          "/basic/config-react/",
          "/basic/snapshot/",
          "/basic/component-test/",
          "/basic/how-to-mock/",
          "/basic/redux-test/",
          "/basic/hook-test/",
          "/basic/static-tool/",
          "/basic/automation/",
        ],
      },
      {
        title: "技巧方法",
        collapsable: false,
        children: [],
      },
      {
        title: "测试思想",
        collapsable: false,
        children: [],
      },
    ],
  },
};
