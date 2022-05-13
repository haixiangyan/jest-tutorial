# 快照测试

上一章我们在项目中引入了 `React`，现在我们开始 React App 的开发和测试吧。

说起组件测试，很多人都会第一时间想到 **快照测试**。可能你也听过这个名字，但是你是否了解其中的细节呢？这一章就来聊聊 **快照测试**。

## Title 组件

我们在 `src/components/Title.tsx` 写一个 `Title` 组件：

```tsx
// src/components/Title.tsx
import React, { CSSProperties, FC } from "react";

interface Props {
  type: "large" | "small";
  title: string;
}

// large 样式
const largeStyle: CSSProperties = {
  fontSize: "2em",
  color: "red",
};

// small 样式
const smallStyle: CSSProperties = {
  fontSize: "0.5em",
  color: "green",
};

// 样式 Mapper
const styleMapper: Record<"small" | "large", CSSProperties> = {
  small: smallStyle,
  large: largeStyle,
};

// 组件
const Title: FC<Props> = (props) => {
  const { title, type } = props;

  return <p style={styleMapper[type]}>{title}</p>;
};

export default Title;
```

然后在 `src/App.tsx` 里使用这个组件：

```tsx
// src/App.tsx
import React from 'react';
import Title from "components/Title";

const App = () => {
  return (
    <div>
      <section>
        <Title type="small" title="小字" />
        <Title type="large" title="大字" />
      </section>
    </div>
  )
}

export default App;
```

在页面上可以看到这样的效果：

![](./title-preview.png)

## 第一个快照

在写测试前，我们要安装一下 React 的测试库。或许你听说过很多测试 React 的测试库，这里我只推荐 [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) ：

```shell
npm i -D @testing-library/react@12.1.4
```

在 `tests/components/Title.test.tsx` 添加一个快照测试：

```tsx
// tests/components/Title.test.tsx
import React from "react";
import { render } from "@testing-library/react";
import Title from "components/Title";

describe("Title", () => {
  it("可以正确渲染大字", () => {
    const { baseElement } = render(<Title type="large" title="大字" />);
    expect(baseElement).toMatchSnapshot();
  });

  it("可以正确渲染小字", () => {
    const { baseElement } = render(<Title type="small" title="小字" />);
    expect(baseElement).toMatchSnapshot();
  });
});
```

执行测试后，会发现在 `tests/components/` 下多了一个 `Title.test.tsx.snap` 文件，打开来看看：

```js
// tests/components/Title.test.tsx.snap
// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`Title 可以正确渲染大字 1`] = `
<body>
  <div>
    <p
      style="font-size: 2em; color: red;"
    >
      大字
    </p>
  </div>
</body>
`;

exports[`Title 可以正确渲染小字 1`] = `
<body>
  <div>
    <p
      style="font-size: 0.5em; color: green;"
    >
      小字
    </p>
  </div>
</body>
`;
```

## 什么是快照测试

在讲 “什么是快照测试” 之前，我们先来说说 “为什么要有快照测试”。

使用 `jest` 和 `React Testing Library` 都能完成基础的交互测试以及功能测试，但是组件毕竟是组件，是有 HTML 结构的。
如果不对比一下 HTML 结构，很难说服自己组件没问题。但是这就引来了一个问题了：**要怎么对比 HTML 结构？**

最简单的方法就是把这个组件的 `HTML` 打印出来，拷贝到一个 `xxx.txt` 文件里，然后在下次跑用例时，把当前组件的 `HTML` 字符串和 `xxx.txt` 
文件里的内容对比一下就知道哪里有被修改过。 **这就是快照测试的基本理念，即：先保存一份副本文件，下次测试时把当前输出和上次副本文件对比就知道此次重构是否破坏了某些东西。**

只不过 `jest` 的快照测试提供了更高级的功能：
1. 自动创建把输出内容写到 `.snap` 快照文件，下次测试时可以自动对比
2. 输出格式化的快照文件，阅读友好，开发者更容易看懂
3. 当在做 `diff` 对比时，`jest` 能高亮差异点，而且对比信息更容易阅读

现在我们来看上面这个例子：

1. 用例第一次执行时，把 `baseElement` 的结构记录到 `Title.test.tsx.snap`
2. 等下次再执行，Jest 会自动对比当前 `baseElement` DOM 快照以及上一次 `Title.test.tsx.snap` 的内容

快照测试通过说明渲染组件没有变，如果不通过则有两种可能：

1. **代码有 Bug。** 本来好好的，被你这么一改，改出了问题
3. **实现了新功能。** 新功能可能会改变原有的 DOM 结构，所以你要用 `jest --updateSnapshot` 来更新快照

这就是快照测试了......吗？当然不是！哦，我是说做法就是这么简单，但是思路上并不简单。

## 缺陷

快照测试虽然简单，但是它有非常多的问题。我搜罗了网上很多资料，这里稍微总结一下它的缺点以及应对思路。

### 避免大快照

现在 `Title` 比较简单，所以看起来还可以，但真实业务组件中动辄就有十几个标签，还带上很多乱七八糟的属性，生成的快照文件会变得无比巨大。

对于这个问题，**我们能做的就是避免大快照，不要无脑地记录整个组件的快照**，特别是有别的 UI 组件参与其中的时候：

```tsx
const Title: FC<Props> = (props) => {
  const { title, type } = props;

  return (
    <Row style={styleMapper[type]}>
      <Col>
        第一个 Col
      </Col>
      <Col>
        <div>{title}</div>
      </Col>
    </Row>
  )
};
```

::: warning
**注：这里引用了 `antd` 的 `Col` 和 `Row` 组件，跑测试时会报：`[TypeError: window.matchMedia is not a function]`。
这是因为 [jsdom](https://www.npmjs.com/package/jsdom) 没有实现 `window.matchMedia`，所以你要在 `jest-setup.ts` 里添加这个 API 的 Mock：**
:::

```js
// tests/jest-setup.ts
// 详情：https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

上面测试生成的快照会是这样：

```js
exports[`Title 可以正确渲染大字 1`] = `
<body>
  <div>
    <div
      class="ant-row"
      style="font-size: 2em; color: red;"
    >
      <div
        class="ant-col"
      >
        第一个 Col
      </div>
      <div
        class="ant-col"
      >
        <div>
          大字
        </div>
      </div>
    </div>
  </div>
</body>
`;
```

杂揉了 `antd` 的 DOM 结构后，快照变得非常难读。**解决方法是只记录第二个 `Col` 的 DOM 结构就好：**

```tsx
describe("Title", () => {
  it("可以正确渲染大字", () => {
    const { getByText } = render(<Title type="large" title="大字" />);
    const content = getByText('大字');
    expect(content).toMatchSnapshot();
  });

  it("可以正确渲染小字", () => {
    const { getByText } = render(<Title type="small" title="小字" />);
    const content = getByText('小字');
    expect(content).toMatchSnapshot();
  });
});
```

执行 `npx jest --updateSnapshot` 后，会生成如下快照：

```js
exports[`Title 可以正确渲染大字 1`] = `
<div>
  大字
</div>
`;

exports[`Title 可以正确渲染小字 1`] = `
<div>
  小字
</div>
`;
```

看这样的快照就清爽多了。**不过，快照并不是越小越好。因为如果快照太小你可能会想：这样的快照还不如我写  `expect(content.children).toEqual('大字')` 来得简单。**

**所以，对于那种输出很复杂，而且不方便用 `expect` 做断言时，快照测试才算是一个好方法。**
这也是为什么组件 DOM 结构适合做快照，因为 DOM 结构有大量的大于、小于、引号这些字符。如果都用 `expect` 来断言，`expect` 的结果会写得非常痛苦。
不过，需要注意的是：**不要把无关的 DOM 也记录到快照里，这无法让人看懂。**

### 假错误

假如现在把 `title` 的 “大字” 改成 “我是一个大帅哥”：

```tsx
describe("Title", () => {
  it("可以正确渲染大字", () => {
    const { getByText } = render(<Title type="large" title="我是一个大帅哥" />);
    const content = getByText('大字');
    expect(content).toMatchSnapshot();
  });
});
```

马上就得到这样的报错：

![](./diff-error.png)

**这里只是文案改了一下，业务代码并没有任何问题，测试却出错了，这就是测试中的 “假错误”。** 虽然普通的单测、集成测试里也可能出现 “假错误”，
但是快照测试出现 “假错误” 的概率会更高，这也很多人不信任快照测试的主要原因。

在一些大快照，复杂组件的情况下，只要别的开发者改了某个地方，很容易导致一大片快照报错，基于人性的弱点，他们是没耐心看测试失败的原因的，
再加上更新快照的成本很低，只要加个 `--updateSnapshot` 就可以了，所以人们在面对快照测试不通过时，往往选择更新快照而不去思考 DOM 结构是否真的变了。

这些因素造成的最终结果就是：**不再信任快照测试。** 所以，你也会发现市面上很多前端测试的总结以及文章都很少做 **快照测试**。很大原因是快照测试本身比较脆弱，
而且容易造成 “假错误”。

## 快照的扩展

很多人喜欢把快照测试直接等于组件的 UI 测试，或者说快照测试是只用来测组件的。而事实上并不是！
Jest 的快照可不仅仅能记录 DOM 结构，还能记录 **一切能被序列化 的内容，比如纯文本、JSON、XML 等等。**

举个例子：

```ts
// getUserById.ts
const getUserById = async (id: string) => {
  return request.get('user', {
    params: { id }
  })
}

// getUserById.test.ts
describe('getUserById', () => {
  it('可以获取 userId == 1 的用户', async () => {
    const result = await getUserById('1')
    expect(result).toEqual({
      // 非常巨大的一个 JSON 返回...
    })
  })
});
```

这个例子我们测试了 `getUserById` 的结果。在平常业务开发中，HTTP 请求返回的结果都是比较大的，有时候还会带一些冗余的数据，写 `expect` 的结果太麻烦了。
**这里我们可以给当前的 `response` 拍一张快照，下次再用这张快照对比就好了：**

```ts
// getUserById.ts
const getUserById = async (id: string) => {
  return request.get('user', {
    params: { id }
  })
}

// getUserById.test.ts
describe('getUserById', () => {
  it('可以获取 userId == 1 的用户', async () => {
    const result = await getUserById('1')
    expect(result).toMatchSnapshot();
  })
});
```

**快照测试还适用于那些完全没有测试的项目。** 想想看，如果你要把测试引入一个项目，你可能连 `expect` 的结果都不知道是啥样。

你会怎么做？要是我，我就先不写断言，先跑一次测试，把 `result` 打印出来，再把打印内容贴到 `toEqual({...})`，这样的过程不就是上面的快照测试么？
**所以，快照测试非常适合在线上跑了很久的老项目，不仅能验证组件，还能验证函数返回、接口结果等。**

## 总结

这一章我们学会了 **快照测试**。快照测试的思想很简单：

* 先执行一次测试，**把输出结果记录到 `.snap` 文件**，以后每次测试都会把输出结果和 `.snap` 文件做 **对比**
* 快照失败有两种可能：
  * 业务代码变更后导致输出结果和以前记录的 `.snap` 不一致，**说明业务代码有问题**，要排查 Bug
  * 业务代码有更新导致输出结果和以前记录的 `.snap` 不一致，**新增功能改变了原有的 DOM 结构**，要用 `npx jest --updateSnapshot` 更新当前快照

不过现实中这两种失败情况并不好区分，更多的情况是你既在重构又要加新需求，这就是为什么快照测试会出现 **“假错误”**。而如果开发者还滥用快照测试，并生成很多大快照，
那么最终的结果是没有人再相信快照测试。一遇到快照测试不通过，都不愿意探究失败的原因，而是选择更新快照来 “糊弄一下”。

要避免这样的情况，需要做好两点：

* **生成小快照。** 只取重要的部分来生成快照，必须保证快照是能让你看懂的
* **合理使用快照。** 快照测试不是只为组件测试服务，同样组件测试也不一定要包含快照测试。快照能存放一切可序列化的内容。

根据上面两点，还能总结出快照测试的适用场景：

* **组件 DOM 结构的对比**
* **在线上跑了很久的老项目**
* **大块数据结果的对比**

**从这一章可以看出，做测试没有我们想的 —— 干就完了。很多时候需要我们做取舍，找到合适的测试策略。** 这在下一章会有更明显的体验，下在让我们进入下一章的学习吧。
