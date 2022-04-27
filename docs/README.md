# 🃏《Jest 前端测试速通指南》

[![Coverage Status](https://coveralls.io/repos/github/haixiangyan/jest-tutorial-example/badge.svg?branch=main)](https://coveralls.io/github/haixiangyan/jest-tutorial?branch=main)

[Jest](https://jestjs.io/) 看似很简单，就像很多博客写的那样：

```js
expect(sum(1, 1)).toEqual(2)
```

然而，在真实业务前，别说如何把测试用例写优雅了，就是单单要写出一个测试用例都是非常困难的。我总结了一下以前我刚开始接触（包括现在）遇到的一些难点：
* **不会配置。** Jest 的上手文档非常简单，连配置都不需要，然而真实情况是只要一个配置没配好，你就别玩测试了。
* **不知道要怎么 Mock。** 这个绝对是重中之重，官方文档虽然有教程，但是真实的业务代码往往都不是那么理想的，需要非常多想都想不到的技巧来实现。
* **不知道要怎么做测试。** 虽然测试代码也是代码，但它和我们经常见到的普通代码有着非常多的不同之处，技巧、套路和思维方式都有所不同，并不是所有测试都 `expect` + `toEqual` 一把梭就收工了。
* **没有测试策略。** 如果说上面是 "技" 的难点，那么这里就是 "术" 难点了，闷着头一通肝测试代码并高效，除了能看到那 X% 令人可笑的覆盖率，你对你的代码毫无自信。

上面这些难点不仅会变成你写测试代码的绊脚石，而且你写出来的的测试也非常脆弱，经不住业务的变动。所以只要业务一改，你不仅要维护业务代码还要维护测试代码，
从而对测试产生强大的厌恶感，进而觉得 "测试就是浪费时间"，最终放弃写测试，直接开摆。

**所以，承认吧：你不是不愿意写测试，也不是测试浪费时间。真相是：你根本就不会写测试！**

# ⚠️ 本小书内容正在编写中...

以下内容为目前的构思，仅作为小书编写的基础材料，并非最终版本。

可先点 Star 订阅关注，大概会在 5 月底（或者更早）结束。公众号关注【写代码的海怪】获得最新资讯。

## 目录

- [x] 开始上手
    * Jest 配置初始化
    * `expect(sum(1, 1).toEqual(2)`
    * 查看测试覆盖率

- [x] Jest x TypeScript
    * 使用 `ts-jest` 进行转译
    * 使用 `paths` 在 `tsconfig.json` 配置缩写，可以业务代码中缩写
    * 使用 `moduleDirectories` 在测试代码中缩写

- [x] 测试 `storage`
    * 使用 `jest-environment-jsdom` 来 Mock 环境
    * 测试 `localStorage` 的使用

- [x] 测试 `getSearchObj`
    * 使用 `window.location`
    * 使用 `jest-environment-jsdom-global` 来 `assign` 改变 location
    * 可以尝试使用 `jest-location-mock` 来实现 Mock

- [x] 使用 TDD 编写 `objToSearchStr`
  * TDD

* 测试 `sleep` 函数
  * 使用 `act` 来编写用例
  * 发现无法输出正确结果
  * 解析 EventLoop
  * 添加一行 `await promise` 来解决

* 引入 React
    * 安装 React，配置 `tsx`
    * 配置 Webpack，写对应的 `webpack.config.js` 配置文件
    * `alias` 要对应 `tsconfig.json` 里的 `paths`

* 测试 `AuthButton` 组件
    * 通过 Mock `axios` 来测试
    * 通过 Mock 接口函数来测试
    * 通过 `msw` Mock HTTP 请求来测试（更优）
    * 使用 `setup` 函数进行代码抽象

* 测试 `Header` 组件
    * 通过 `Object.defineProperty` 来 Mock 不同变量

* Jest 性能优化
    * `runInBand` 以及 `maxWorkers: 1`
    * 使用 `swc/jest` 替代 `ts-jest`

* 测试 `useCounter`
    * 使用真实的 `TestComponent` 来测试
    * 使用虚拟的 `component`，放在 `setup` 函数中测试
    * 使用 `@testing-library/react-hooks` 来测试
    * 解释版本问题

* ESLint
    * `plugin:@typescript-eslint/recommended`
    * `plugin:jest/recommended`
    * `plugin:testing-library/react`
    * 解释 `plugins` 和 `extends` 的区别
