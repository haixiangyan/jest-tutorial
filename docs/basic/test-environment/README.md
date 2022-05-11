# 测试环境

刚刚的 `sum` 实在是太简单了，现在我们来搞点难度。很多时候，我们前端开发写的代码往往只在浏览器里运行，比如我之前就封装过一个 `storage` 文件，
通过一个 `type = 'indexedDB' | 'cookoie' | 'localStorage'` 来切换存储的地方，同是还可以生成自定义的 `key`，防止全局污染。
**相信大家也见过不少这种和浏览器强绑定的工具文件，那我们该如何测它们呢？**

## 需求和测试

添加一个 `src/utils/storage.ts` 文件，这里对我刚说的 `storage` 做下简化，只封装一个 `localStorage` 的用法，一共只有 `set` 和 `get` 两个函数：

```ts
// src/utils/storage.ts
const KEY_NAME = "my-app-";

const set = (key: string, value: string) => {
  localStorage.setItem(KEY_NAME + key, value);
};

const get = (key: string) => {
  return localStorage.getItem(KEY_NAME + key);
};

const storage = {
  get,
  set,
};

export default storage;
```

然后在 `tests/utils/storage.test.ts` 添加这个文件的测试用例：

```js
// tests/utils/storage.test.ts
import storage from "utils/storage";

describe("storage", () => {
  it("可以缓存值", () => {
    storage.set("newKey", "hello");
    expect(localStorage.getItem("my-app-newKey")).toEqual("hello");
  });

  it("可以设置值", () => {
    localStorage.setItem("my-app-newKye", "hello");
    expect(storage.get("newKey")).toEqual("hello");
  });
});
```

由于 Node.js 环境并没有 `localStorage`，所以你的测试会报错：

![](./storage-error.png)

## Setup

既然没有 `localStorage`，那我们就可以给它 Mock 一个！首先添加 `tests/jest-setup.ts` 文件，然后放置 `localStorage` 的 Mock：

```ts
// tests/jest-setup.ts
Object.defineProperty(global, 'localStorage', {
  value: {
    store: {} as Record<string, string>,
    setItem(key: string, value: string) {
      this.store[key] = value;
    },
    getItem(key: string, value: string) {
      return this.store[key];
    },
    removeItem(key: string) {
      delete this.store[key];
    },
    clear() {
      this.store = {}
    }
  }
})
```

> 得益于刚刚配置的 TypeScript，这里的 setup 文件也可以写成 `.ts` 了！

然后在 `jest.config.js` 里添加 `setupFilesAfterEnv` 配置：

```js
module.exports = {
  setupFilesAfterEnv: ['./tests/jest-setup.ts'],
};
```

> **注意：一定要使用 `setupFilesAfterEnv` 而不是 `setupFiles`！**

> **得益于我们加上了 TypeScript 转译器，我们可以用 TypeScript 来写 `jest-setup` 文件啦！**

设置了之后，我们的 `jest-setup.ts` 在每个测试文件前都会执行一次，相当于每执行一次测试，都会在全局 Mock 一次 `localStorage`。
现在再来执行一次 `npm run test`，会发现执行成功：

![](./storage-setup-success.png)

## jsdom 测试环境

但是这样有点傻，因为我们不可能把浏览器里所有的 API 都 Mock 一遍，而且很多的实现我们不可能还原得一模一样，比如 `indexedDB`，所以 `jest` 提供了 `testEnvironment` 这个配置项：

```js
module.exports = {
  testEnvironment: "jsdom",
}
```

配置 `jsdom` 后，会自动拥有完整的浏览器标准 API。**这里背后的原理是使用了 [jsdom](https://github.com/jsdom/jsdom) ，
这个库用 JS 实现了一套 Node.js 环境下的 Web 标准 API。** 我们的 `jest` 测试文件也是 Node.js 环境下执行的，所以这里 `jest` 只是用了这个库的实现充当了 Mock 实现。

现在清空 `jest-setup.ts` 里的代码，直接 `npm run test` 也会发现测试成功：

![](./storage-env-success.png)

> **请不要把 `jest-setup.ts` 删掉，后面还大有用处！**

那 `testEnvironment` 除了 `jsdom` 还有没有别的呢？有，不过一般都只是 `jsdom` 的扩展环境，在下一章会讲到，那现在我们就进入下一章的学习吧~

## 总结

这一章里，我们学到了 `setupFilesAfterEnv`，它可以指定一个文件，在每执行一个测试文件前都会跑一遍里面的代码。

在 setup 文件 `jest-setup.ts` 里可以放置全局的 Mock 实现，以及一些初始化操作。

为了更方便我们测试浏览器环境下的代码，可以配置 `testEnvironment: 'jsdom'` 来创建一个 Mock 好了的浏览器环境，
像 `localStorage`, `cookie`, `document` 这些常见 API 就不用我们每个都 Mock 一次啦。
