# 前端测试一共有哪几种

## 前言

哈喽，大家好，我是海怪。

最近有不少朋友找到我聊了聊测试相关的内容，发现他们对测试的分类有些迷茫。实际上测试一共就 3 种：E2E，集成，单测，其它的功能测试、UI 测试、界面测试只是它们中里面的一种。
[Kent C. Dodds](https://kentcdodds.com/ "Kent C. Doods")
在这篇文章 [《Static vs Unit vs Integration vs E2E Testing for Frontend Apps》](https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests "《Static vs Unit vs Integration vs E2E Testing for Frontend Apps》")
也聊到了这 3 种测试的对比和区别，除此之外，还聊到它们各自的适用场景，应该对还在迷茫中的同学有所帮助。所以今天把这篇文章分享给大家~

> 翻译中会尽量用更地道的语言，这也意味着会给原文加一层 Buf，想看原文的可点击 [这里](https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests "原文")。

---

## 正片开始

[J.B. Rainsberger](https://twitter.com/jbrains) 在我的采访里说了一个我很喜欢的比喻：

> 你可以把油漆扔到墙上，最终你可能会涂到大部分的墙壁，但除非你用刷子来刷墙，否则你永远不会刷到角落。

我喜欢用它来类比测试，因为做测试就跟刷墙一样，在开始之前要选择正确的策略。你会用小刷头来刷墙么？当然不会。那会花很长时间，而且效果也不均匀。
那你会用滚筒来刷所有东西么？比如拿它来刷两百年前你的曾曾祖母从别的地方带来的豪华家具？绝对不会。不同的刷子适用不同的场景，测试也是如此。

这就是为什么我会构建这个 [测试模型](https://twitter.com/kentcdodds/status/960723172591992832 "测试模型")。

![](https://files.mdnice.com/user/24913/2c0fbf21-3d89-4f05-810d-786ce16eb31d.jpg)

在这个模型里，有 4 种测试分类：

* 端对端测试：利用一个很像用户行为的机器人来和 App 交互，并验证功能是否正常。有时也会说 “功能测试” 或 E2E。
* 集成测试：验证多个单元是否能协调共同工作。
* 单元测试：验证单独隔离的部分是否正常工作。
* 静态测试：捕获写代码时的错别字和类型错误

在这个模型里，每个测试分类的大小和你在测试时的关注度呈正相关（通常来说）。下面我来深入地聊聊这几种测试类型的区别、含义、以及如何对它们做优化。

## 测试类型

让我们从上往下看几个这类测试的例子：

### 端对端测试

一般来说，它会跑完整个应用（前端 + 后端），这样的测试会像真实用户那样和应用进行交互。下面的例子是用 [Cypresss](https://cypress.io/) 来实现的：

```js
import {generate} from 'todo-test-utils'

describe('todo app', () => {
  it('should work for a typical user', () => {
    const user = generate.user()
    const todo = generate.todo()
    // 这里我们会走通整个注册流程
    // 我一般只会写一个测试来这么做
    // 剩下的测试则会通过直接发 HTTP 请求来实现注册功能
    // 这样我们就可以跳过这个注册表单的交互过程了
    cy.visitApp()

    cy.findByText(/register/i).click()

    cy.findByLabelText(/username/i).type(user.username)

    cy.findByLabelText(/password/i).type(user.password)

    cy.findByText(/login/i).click()

    cy.findByLabelText(/add todo/i)
      .type(todo.description)
      .type('{enter}')

    cy.findByTestId('todo-0').should('have.value', todo.description)

    cy.findByLabelText('complete').click()

    cy.findByTestId('todo-0').should('have.class', 'complete')
    // 等等...
    // 我的 E2E 测试一般都会写像真实用户那样
    // 有时会写得非常长
  })
})
```

### 集成测试

集成测试背后的思想就是尽可能少的 Mock。我一般只会 Mock 下面两点：

* 网络请求（用 [MSW](https://mswjs.io/ "MSW")）
* 实现动画的组件（因为谁会想在测试里等待呀）

下面的测试用例会渲染整个应用。但这不是集成测试的硬性要求，而且大多数我写的集成测试都不会渲染整个 App。他们一般只会渲染 App 里要用到的 Provider（这就是 `test/app-test-utils` 伪模块中 `render` 要做的事）：

```js
import * as React from 'react'
import {render, screen, waitForElementToBeRemoved} from 'test/app-test-utils'
import userEvent from '@testing-library/user-event'
import {build, fake} from '@jackfranklin/test-data-bot'
import {rest} from 'msw'
import {setupServer} from 'msw/node'
import {handlers} from 'test/server-handlers'
import App from '../app'

const buildLoginForm = build({
  fields: {
    username: fake(f => f.internet.userName()),
    password: fake(f => f.internet.password()),
  },
})

// 集成测试一般只会用 MSW 这个库来 Mock HTTP 请求
const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

test(`logging in displays the user's username`, async () => {
  // 这个自定义的 render 会在 App 加载完成时返回一个 Promise
  // （如果你用服务器渲染，你可能不需要这么做）
  // 这个自定义的 render 还可以让你指定你的初始路由
  await render(<App />, {route: '/login'})
  const {username, password} = buildLoginForm()

  userEvent.type(screen.getByLabelText(/username/i), username)
  userEvent.type(screen.getByLabelText(/password/i), password)
  userEvent.click(screen.getByRole('button', {name: /submit/i}))

  await waitForElementToBeRemoved(() => screen.getByLabelText(/loading/i))

  // 检查用户是否已经登录了
  expect(screen.getByText(username)).toBeInTheDocument()
})
```

对这样的测试，一般我会做一些全局处理，比如 [自动重置所有 Mock](https://jestjs.io/docs/configuration#resetmocks-boolean)。

你可以在 [React Testing Library setup docs](https://testing-library.com/docs/react-testing-library/setup/) 里了解更多关于上面的测试工具函数。

### 单元测试

```js
import '@testing-library/jest-dom/extend-expect'
import * as React from 'react'
// 如果你的集成测试里有像上面一样的测试工具模块
// 那别用 @testing-library/react，直接用你的就好了
import {render, screen} from '@testing-library/react'
import ItemList from '../item-list'

// 有些人可能不会把这样的测试叫做单测，因为我们还是要用 React 渲染成 DOM
// 他们还可能会告诉你要用 shallow render
// 当他们跟你说这个的时候，请把这个链接 https://kcd.im/shallow 甩他们脸上
test('renders "no items" when the item list is empty', () => {
  render(<ItemList items={[]} />)
  expect(screen.getByText(/no items/i)).toBeInTheDocument()
})

test('renders the items in a list', () => {
  render(<ItemList items={['apple', 'orange', 'pear']} />)
  // 注意：为了简化这个例子，这里用了 snapshot，不过仅限于：
  // 1. snapshot 很小
  // 2. 我们用了 toMatchInlineSnaphost
  // 详情：Read more: https://kcd.im/snapshots
  expect(screen.getByText(/apple/i)).toBeInTheDocument()
  expect(screen.getByText(/orange/i)).toBeInTheDocument()
  expect(screen.getByText(/pear/i)).toBeInTheDocument()
  expect(screen.queryByText(/no items/i)).not.toBeInTheDocument()
})
```

相信所有人都知道下面这个肯定是单测：

```js
// 纯函数是单元测试的最佳选择，我还喜欢用 jest-in-case 来做单测
import cases from 'jest-in-case'
import fizzbuzz from '../fizzbuzz'

cases(
  'fizzbuzz',
  ({input, output}) => expect(fizzbuzz(input)).toBe(output),
  [
    [1, '1'],
    [2, '2'],
    [3, 'Fizz'],
    [5, 'Buzz'],
    [9, 'Fizz'],
    [15, 'FizzBuzz'],
    [16, '16'],
  ].map(([input, output]) => ({title: `${input} => ${output}`, input, output})),
)
```

## 静态测试

*（译注：静态测试这里其实更多是指用 TypeScript 以及 ESLint 等静态检查工具来找出代码问题）*

```js
// 你能发现下面的问题么？
// 我相信 ESLint 的 for-direction 规则会比你 code review 时
// 更快发现这个问题 😉
for (var i = 0; i < 10; i--) {
  console.log(i)
}

const two = '2'
// 这个有点挑剔了，不过 TypeScript 会告诉你这么做是不好的
const result = add(1, two)
```

## 测试的初衷

记住我们为什么写测试是很重要的。为什么你要写测试？是因为我让你写？是因为如果不写测试你的 PR 无法通过？还是因为测试可以提升开发体验？

我写测试最大、最重要的原因就是 **CONFIDENCE**（代码信心）。我希望能够信任未来我写的代码不会在上线时弄崩整个应用。所以，无论如何，
我都想确保这些类型的测试都能给我来带来最大的 **CONFIDENCE**，所以在做测试时，要对它们做一些权衡。

## 如何取舍

我在这张图里列了一些比较重要的点：

![](https://files.mdnice.com/user/24913/49161ccc-eefb-413a-90d3-57e5af827dc8.jpg)

上面的箭头代表了你在写自动化测试时要关注的 3 个取舍点：

### 成本：￠ heap ➡ 💰🤑💰

当你往模型的上面走时，测试的成本会变得非常高。这不仅来自来真实在 CI 环境上跑所花的钱，还来自开发自己要编写和维护单个独立测试所花的时间。

越往模型上方走，遇到的报错和失败就越多，测试就越容易崩，从而导致需要更多时间来分析和修复测试。**记住这句话，等会要考。**

### 速度：🏎💨 ➡ 🐢

越往模型上方走，测试则跑得越慢。这是由于越跑高层级的测试，你就要跑更多的代码。
而对单测来说，一般只测没有依赖的小代码片段，或者把依赖给 Mock 掉（会把上千行的代码替换成简单几行）。**记住这句话，等会要考。**

### 信心：简单问题 👌 ➡ 大问题 😖

一般人们在聊测试金字塔模型 🔺 时，都会聊到测试成本和速度的取舍。如果只考虑这两点，那对于这个金字塔模型，我肯定 100% 把精力放单测上，而
不去管其它的测试类型。当然我不能这么做，这是因为还有一个超级重要的因素，可能你经常会听我说到它：

> **当你的测试和你应用的使用方式越相似，它们能给你的信心就越大。**

这是什么意思呢？意思是只有在用户真实使用过后，才能保证你的应用是正常工作的。但我们不可能真的去等一个真实的用户来找 Bug 吧？这会要很长时间，而且他可能会错过一些我们可能应该测试的功能。再加上我们会定期发布软件更新，任何人都无法用上最新的版本。

所以要怎么解决？**我们要做权衡。** 那我们应该怎么做？我们可以写测试来测自己的应用，而当我们的测试不能像真实用户那样测试我们的应用时，我们就要对不同测试做权衡，只有这样才能解决实际问题。这就是这个测试模型中每一层我们要做的事。

**当你往测试模型的上方走时，你也同时在提升我所说的 “信心系数”。** 这是你在那一层里能够给你相对其它层的信心。你可以把模型最上层的测试想象成手动测试，这肯定会给你非常强的信心，相对地，它们成本也很高，速度也很慢。

还记得刚刚就让你记住两件事么：

> * 越往上走，遇到的报错和失败就越多，因此你的测试也越容易崩
> * 单测一般只用来测无依赖的小东西，或者把它的依赖 Mock 掉再测试（把上千行代码替换成几行 Mock 实现）

这两点说的都是：越往下走，你能测到的代码就越少。所以，如果你在做低层级的测试，会需要更多测试用例来覆盖应用程序中相同数量的代码。实际上，当你越往模型下面走，会有很多东西是没办法测试的。

**说一下这些测试的问题，静态分析工具无法给你带来任何对业务逻辑的信心。单测也无法确保你是否正确地使用依赖的（虽然你可以用断言判断它们是怎么被调用的，但是你仍然无法确保它在单测里是否被正确调用了）。UI 集成测试则是无法确保你是否正确把参数传给后端，以及是否正确处理返回错误。E2E 确实很好，但一般来说你只会把它们放在测试环境下跑（类生产环境，但是不是真生产环境）来获取相对较高的代码信心。**

现在让我们从另一个角度出发：在模型的顶端，如果你想用 E2E 来检查输入文本和点击提交后表单的边界用例，你需要启动整个应用来做很多初始准备工作（后端也要），对这样场景来说，用集成测试会更合适。而如果你想用集成测试来测试优惠券的边界情况，你可能要在初始函数里做一些准备工作来渲染出优惠券生成组件，然后才能通过单测更好地覆盖边界用例。而如果你想用单测来验证 `add` 函数没有传 `number` 而传了 `string` 类型的情况，使用像 TypeScript 这样的静态类型检查工具能更好地做验证。

## 总结

模型里每个级别都有自己的优劣。一个 E2E 测试会失败很多次，所以很难追踪哪些代码导致的崩溃，但这也意味着它能给你带来更多的信心。这样的测试在你没有时间写测试时是很有用的。我宁愿面对失败多次的 E2E 测试，获得更多代码信心，也不想因为没写而要处理更多的 Bug。

最后，**我其实不在乎这些测试类型之间的区别。** 如果你说我的单测就是集成测试，或者甚至说是 E2E 测试（可能有人真的这么觉得 🤷‍♂️），那就说吧。而我更关心的是：它们能否给我足够的信心去改以前的代码和实现新业务，所以我会结合不同的测试策略来达到这个目标。

---

**好了，这篇外文就给大家带到这里了。文章主要讲了 4 种测试类型：静态、单测、集成、E2E。其实在写测试的过程当中，是很难区分你到底是在写哪种测试的，也不用一直想着：我在写哪类的测试、项目测试种类的比例怎么分、测试数量多少的问题。就像 Kent 说的那样：我根本不在乎我写的是啥，我只在乎它是否能提高我的代码信心就足够了。**

**如果你喜欢我的分享，可以来一波一键三连，点赞、在看就是我最大的动力，比心 ❤️**

