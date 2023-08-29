import { defineUserConfig, defaultTheme } from "vuepress";
import { searchPlugin } from '@vuepress/plugin-search';

export default defineUserConfig({
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
    searchPlugin({
      maxSuggestions: 10,
    }),
  ],
  markdown: {},
  theme: defaultTheme({
    logo: "/images/logo.png",
    colorMode: "auto",
    repo: "https://github.com/changesuger/jest-tutorial",
    navbar: [
      {
        text: "Issue",
        link: "https://github.com/changesuger/jest-tutorial/issues",
      },
    ],
    sidebar: [
      {
        text: "介绍",
        collapsible: false,
        children: [
          "/",
          "/intro/why-test/",
        ],
      },
      {
        text: "基础实践",
        collapsible: false,
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
        text: "测试思路",
        collapsible: false,
        children: [
          "/thoughts/articles.md",
        ],
      },
      {
        text: "最后",
        collapsible: false,
        children: [
          "/end/github.md",
          "/end/end.md",
        ],
      }
    ],

    lastUpdated: true,
  }),
});