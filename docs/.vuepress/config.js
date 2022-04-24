module.exports = {
  base: "/jest-tutorial/",
  title: "深入浅出 Jest",
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
        children: [],
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
