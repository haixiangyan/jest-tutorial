# 转译器

如今 2022 年，无论我们写业务还是写测试，都会采用比较高级的 JavaScript 语法，或者 TypeScript。

**但是，Jest 本身不做代码转译工作。** 在执行测试时，它会调用已有的 **转译器/编译器** 来做代码转译。在前端，我们最熟悉的两个转译器就是 [Babel](https://babeljs.io/) 以及 [TSC](https://www.typescriptlang.org/) 了。

下面我们就以 `Jest x TypeScript` 为例子来讲如何对测试代码做转译吧。

## TSC 转译

::: warning
本教程使用 `ts-jest` 作为主力转译器，后面 **《Jest 性能部分》** 会尝试使用其它转译器。
:::

首先安装 [typescript](https://www.npmjs.com/package/typescript) ：

```shell
npm i -D typescript@4.6.3
```

安装 `typescript` 的同时也会安装转译器 `tsc`，可以用它来初始化 TypeScript 的配置：

```shell
npx tsc --init
```

会发现在根目录创建了一个 `tsconfig.json` 文件：

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

现在安装 [ts-jest](https://kulshekhar.github.io/ts-jest/) ：

```shell
npm i -D ts-jest@27.1.4
```

::: warning
**注意，这里 `ts-jest` 一定要和 `jest` 的大版本一致！** 比如 27 对 27，或者 26 对 26，否则会有兼容问题！
:::

在 `jest.config.js` 里添加一行配置：

```js
module.exports = {
  preset: 'ts-jest',
  // ...
};
```

把 `sum.js` 改成 `sum.ts`：

```ts
// sum.ts
const sum = (a: number, b: number) => {
  return a + b;
}

export default sum;
```

把 `sum.test.js` 改成 `sum.test.ts`：

```ts
import sum from '../../src/utils/sum';

describe('sum', () => {
  it('可以做加法', () => {
    expect(sum(1, 1)).toEqual(2);
  });
})
```

不过，改完后你会发现有很多的报错：

![](./error.png)

## Jest 的类型声明

上面的报错是因为 TS 找不到 `describe` 和 `it` 的类型定义，这里要安装对应的 Jest 类型声明包：

```shell
npm i -D @types/jest@27.4.1
```

::: tip
同样地，TS 声明类型包的大版本最好和 `jest` 一样。
:::

然后在 `tsconfig.json` 里加上 `jest` 和 `node` 类型声明：

```json
{
  "compilerOptions": {
    "types": ["node", "jest"]
  }
}
```

最后执行 `npm run test`，测试通过。

## 更多转译器

还记得这一章开头说的：**Jest 本身不做转译，而是利用别的转译器的能力来转译。** 因此，我们除了用 `tsc` 来转译，还能用其它转译器。

### Babel 转译器

可能有些同学的项目就是 Webpack + Babel 为主，那么你也可以选择使用 `babel-jest` 来做转译，
具体配置看 [官网的教程](https://jestjs.io/docs/getting-started#using-typescript-via-babel) 。

Babel 做转译的 **缺点是无法让 Jest 在运行时做类型检查**，所以更推荐大家使用 `ts-jest`，利用 `tsc` 来转译 TypeScript。

> Because TypeScript support in Babel is purely transpilation, Jest will not type-check your tests as they are run. —— 官网

### 非官方转译器

当然，我们也能用现在非常火的 [esbuild](https://esbuild.github.io/) 和 [swc](https://swc.rs/docs/getting-started) 来做转译。
由于它们都不是 Jest 官方推荐的转译器，所以使用时要注意兼容性和坑。

顺便说一下，`esbuild` 是 [Golang](https://go.dev/) 写的一个转译器，速度巨快：

![](./esbuild.png)

而 `swc` 则是 [Rust](https://www.rust-lang.org/) 写的一个转译器，速度更快：

![](./swc.png)

不过，速度快只是一方面，Jest 在构建测试环境的时会有很多 Tricky 的操作，**但并不是所有转译器都支持这些骚操作的**。
像 `swc` 这种要用到计算机比较底层的转译工具，在不同平台的的表现可能有所不同，所以，使用这些转译器会存在一定的风险。

目前来说，建议大家把它们当作实验品来试用，就算出问题再回退到 `babel` 和 `tsc` 也很简单。

::: tip
生产环境推荐使用 `ts-jest`，后面会用 `@swc/jest` 作为实验品带大家体验一下。
:::

## 路径简写

你对这个测试满意了么？反正我还不满意，为啥我要写一句 `../../src/utils/sum` 这么长的路径？我写成 `utils/sum` 不是更香？
这也是很多大型项目的必备配置了 —— **路径简写/别名**。

要实现这样的效果，我们可以在 `moduleDirectories` 添加 `"src"`：

```js
// jest.config.js
module.exports = {
  moduleDirectories: ["node_modules", "src"],
  // ...
}
```

这样一来 `jest` 就能看懂 `utils/sum` 对应的是 `../../src/utils/sum`，但是，`tsc` 看不懂呀：

![](./path-error.png)

我们还得在 `tsconfig.json` 里指定 `baseUrl` 和 `paths` 路径：

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "utils/*": ["src/utils/*"]
    }
  }
}
```

解释一下， **所谓的 “路径简写” 本质上只是路径映射。所以 `tsconfig.json` 里的 `paths` 就是把 `utils/xxx` 映射成 `src/utils/xxx`，
而 `jest.config.js` 里的 `moduleDirectories` 则稍微狠一点，直接把 `utils/sum` 当作第三方模块，先在 `node_modules` 里找，找不到再从 `src/xxx` 下去找。
所以这两者是有区别的。**

有的同学可能不会这么写，而是用别名作为路径开头：`import sum from "@/utils/sum"`。这依旧是路径匹配，`tsconfig.json` 的配置相当简单：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

但对 Jest 的配置就不能再用 `moduleDirectories` 了，也得用路径匹配。我们可以使用 `moduleNameMapper`，这也是使用频率非常高的一个配置项：

```js
// jest.config.js
modulex.exports = {
  "moduleNameMapper": {
    "@/(.*)": "<rootDir>/src/$1"
  }
}
```

那有的同学就会问了：难道每次写路径匹配规则都在 `tsconfig.json` 和 `jest.config.js` 写两份么？**很遗憾，确实如此。造成这个问题的主要原因是 `jest` 根本不管 `tsc`。**
不过，好消息是，你可以用 `ts-jest` 里的工具函数 `pathsToModuleNameMapper` 来把 `tsconfig.json` 里的 `paths` 配置复制到 `jest.config.js` 里的 `moduleNameMapper`：

```js
// jest.config.js
const { pathsToModuleNameMapper } = require('ts-jest/utils')
const { compilerOptions } = require('./tsconfig')

module.exports = {
  // [...]
  // { prefix: '<rootDir/>' }
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/",
  }),
}
```

看到这样的配置方法，你是不是觉得 JS 的单一原则太难顶了？这么简单的一个功能都要通过第三方的 `ts-jest` 来提供？然而，坏消息是 `webpack` 的配置也不会读 `tsconfig.json` 里面的 `paths`，
**所以，开发者不仅要在 `tsconfig.json` 里写一份路径映射，还要在 `webpack.config.js` 里再写一份** 。[详见这里](https://stackoverflow.com/questions/40443806/webpack-resolve-alias-does-not-work-with-typescript) 。

::: tip
本次教程将用 `moduleDirectories` 来实现路径别名，如果你想用 `moduleNameMapper`，那么后续的 Webpack 配置可能也要跟着改一下。
:::

## 总结

这一章，我们了解到了 Jest 与转译器的关系，Jest 本身不做任何转译，只是利用了其它转译器的能力来做代码转译。

常见的转译器有 `babel`, `tsc`, `esbuild` 和 `swc`，后面两个速度较快，但存在一定风险。

在一些大型项目中，经常会出现路径别名。由于 Jest 不做转译，所以在做转译时需要在 `tsconfig.json` 里不仅要做别名的路径映射，
还要在 `jest.config.js` 里也要做同样的路径匹配。这可以通过配置 `moduleDirectories` 和 `moduleNameMapper` 来实现。
