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
  markdown: {
    lineNumbers: true,
  },
  themeConfig: {
    logo: "/images/logo.png",
    repo: "https://github.com/haixiangyan/jest-tutorial",
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
        title: "基础实践",
        collapsable: false,
        children: [
          "/basic/getting-started/",
          "/basic/transformer/",
          "/basic/test-environment/",
          "/basic/navigation/",
          "/basic/tdd/",
          "/basic/mock-timer/",
          "/basic/config-react/",
          "/basic/snapshot-test/",
          "/basic/component-test/",
          "/basic/how-to-mock/",
          "/basic/redux-test/",
          "/basic/hook-test/",
          "/basic/static-tool/",
          "/basic/performance/",
          "/basic/automation/",
        ],
      },
      {
        title: "测试思路",
        collapsable: false,
        children: [
          "/thoughts/why-test.md",
          "/thoughts/what-should-we-test.md",
          "/thoughts/test-category.md",
          "/thoughts/testing-implementation-details.md",
          "/thoughts/abstraction.md",
          "/thoughts/bring-test-to-team.md",
          "/thoughts/tdd.md",
          "/thoughts/write-more-integration-test.md",
          "/thoughts/dont-mock-fetch.md",
          "/thoughts/dont-nest-in-test.md",
          "/thoughts/how-to-test-custom-hooks.md",
          "/thoughts/how-to-test-render-props.md",
          "/thoughts/3-common-mistakes.md",
          "/thoughts/15-rtl-mistakes.md",
        ],
      },
      {
        title: "最后",
        collapsable: false,
        children: [
          "/end/github.md",
          "/end/end.md",
        ]
      }
    ],

    // 搜索
    search: true,
    searchMaxSuggestions: 10,
    lastUpdated: "最后更新",
  },

  // PWA 配置
  serviceWorker: true,
};
