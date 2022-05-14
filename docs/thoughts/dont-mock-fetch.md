# 为什么不要 Mock fetch 函数

## 前言

哈喽，大家好，我是海怪。

不知道大家平时写单测时是怎么处理 **网络请求** 的，可能有的人会说：把整个请求函数 Mock ，直接返回结果就行了呀。Mock 没问题，但你怎么能保证它在真实场景中发请求的样子是你理想中的样子呢？那...难道不 Mock？这也不行呀，单测要的就是速度，发个网络请求怎么也得 300 ms，时间也不允许。

所以，带着上面这个问题我找到了 Kent 的这篇 [《Stop mocking fetch》](https://kentcdodds.com/blog/stop-mocking-fetch)。今天就把这篇文章分享给大家。

---

## 正片开始

先来看下下面这段测试代码有什么问题：

```js
// __tests__/checkout.js
import * as React from 'react'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {client} from '~/utils/api-client'

jest.mock('~/utils/api-client')

test('clicking "confirm" submits payment', async () => {
  const shoppingCart = buildShoppingCart()
  render(<Checkout shoppingCart={shoppingCart} />)

  client.mockResolvedValueOnce(() => ({success: true}))

  userEvent.click(screen.getByRole('button', {name: /confirm/i}))

  expect(client).toHaveBeenCalledWith('checkout', {data: shoppingCart})
  expect(client).toHaveBeenCalledTimes(1)
  expect(await screen.findByText(/success/i)).toBeInTheDocument()
})
```

这其实是个有点 tricky 的问题。如果不告诉你 `Checkout` 的功能和 `/checkout` 这个 API，你是很难回答这个问题的。

好吧，我来公布一下：首先第一个问题就是把 `client` 给 Mock 掉了，问问自己：你怎么知道 `client` 是一定会被正确调用的呢？当然，你可能会说：`client` 可以用别的单测来做保障呀。但你又怎么能保证 `client` 不会把返回值里的 `body` 改成 `data` 呢？哦，你是想说你用了 TypeScript 是吧？彳亍！但是肯定还会有别的业务逻辑的错误可能会溜进来，因为我们把 `client` 给 Mock 了。你可能还会说：我有 E2E 测试！**但是，如果我们真的能在这里调用一下 `client` 不是更能提高我们对 `client` 的信心么？这也好过你一直猜来猜去嘛。**

不过，我们肯定也不是想真的调 API 嘛，所以先来把 `window.fetch` 给 Mock 了：

```js
// __tests__/checkout.js
import * as React from 'react'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

beforeAll(() => jest.spyOn(window, 'fetch'))

// Jest 的 rsetMocks 设置为 true
// 我们就不用担心要 cleanup 了
// 这里假设你用了类似 `whatwg-fetch` 的库来做 fetch 的 Polyfill

test('clicking "confirm" submits payment', async () => {
  const shoppingCart = buildShoppingCart()
  render(<Checkout shoppingCart={shoppingCart} />)

  window.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({success: true}),
  })

  userEvent.click(screen.getByRole('button', {name: /confirm/i}))

  expect(window.fetch).toHaveBeenCalledWith(
    '/checkout',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(shoppingCart),
    }),
  )
  expect(window.fetch).toHaveBeenCalledTimes(1)
  expect(await screen.findByText(/success/i)).toBeInTheDocument()
})
```

上面肯定能给你不少对业务代码的信心，毕竟你真的能测请求是否真的发出去了。但是，这里的缺点在于：它不能测 `headers` 里是否会带有 `Content-Type: application/json`。没有这一步，我们也不能确定服务器是否真的能处理发出去的请求。还有一个问题，你怎么能确定用户鉴权的信息是不是真的也被带上呢？

看到这，肯定有人会说：“在 `client` 的单测里已经验证了呀，你还想我要做啥？我不想再把那里面的测试代码也在这复制一份”。行行行，我知道。但如果真的有一种方法即可以不用复制 `client` 的测试代码，又能提高代码自信呢？继续往下看。

我很讨厌一直无脑地 Mock 东西，因为最终的结果是你会在所有地方把整个后端的逻辑都重新实现一遍。通常发生在多个测试之间，非常烦人。特别是在一些测试中，我们要假定后端要返回的内容的时候，就不得不在所有地方都要 Mock 一次。在这种情况下，就会给你和要做测试的东西设置了很多障碍。

这就不可避免地会发生以下这些情况：

1. 我们把 `client` Mock 了（第一个例子），然后依赖一些 E2E 测试来保障 `client` 正确执行，以此给予我们心灵上一丢丢信心。这就导致一旦遇到后端的东西，我就要在所有地方都要重新实现一遍后端逻辑
2. 我们把 `window.fetch` Mock 了（第二个例子）。这会好点，但这也会遇到第 1 点类似的问题
3. 把所有东西都放在函数中，然后用来做隔离的单测，这样就不用另外做集成测试了

最终，这样的测试并没有给我们太多的心理安慰，反而带来很多重复的工作。

在很长一段时间内对我来说比较好的解决方法是：声明一个函数作为假的 `fetch` 函数，把后端要 Mock 的内容都放里面。我在 Paypal 的时候就试过，发现还挺好用的。这里举个例子：

```js
// 把它放在 Jest 的 setup 文件中，就会在所有测试文件前被引入了
import * as users from './users'

async function mockFetch(url, config) {
  switch (url) {
    case '/login': {
      const user = await users.login(JSON.parse(config.body))
      return {
        ok: true,
        status: 200,
        json: async () => ({user}),
      }
    }
    case '/checkout': {
      const isAuthorized = user.authorize(config.headers.Authorization)
      if (!isAuthorized) {
        return Promise.reject({
          ok: false,
          status: 401,
          json: async () => ({message: 'Not authorized'}),
        })
      }
      const shoppingCart = JSON.parse(config.body)
      // 可以在这里添加购物车的逻辑
      return {
        ok: true,
        status: 200,
        json: async () => ({success: true}),
      }
    }
    default: {
      throw new Error(`Unhandled request: ${url}`)
    }
  }
}

beforeAll(() => jest.spyOn(window, 'fetch'))
beforeEach(() => window.fetch.mockImplementation(mockFetch))
```

然后，我们的测试就可以写成这样了：

```js
```
// __tests__/checkout.js
import * as React from 'react'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('clicking "confirm" submits payment', async () => {
const shoppingCart = buildShoppingCart()
render(<Checkout shoppingCart={shoppingCart} />)

userEvent.click(screen.getByRole('button', {name: /confirm/i}))

expect(await screen.findByText(/success/i)).toBeInTheDocument()
})
```
```

我的这套快乐测试大法不太需要你做任何别的特别的事。这里还可以给它再多加一个失败的 Case，不过我已经很满意了。

这样做的好处是对大量测试用例都不用写特别多的代码就能提高我对业务逻辑的信心了。

## msw

[`msw`](https://github.com/mswjs/msw) 表示 “Mock Service Worker”。现在 Service Worker 还只是浏览器中的功能，不能在 Node 端使用。但是，`msw` 可以支持 Node 端的任何测试场景。

它的工作原理是这要的：创建一个 Mock Server 来拦截所有的请求，然后你可以像在真的 Server 里去处理它们。如果是我来实现的话，这意味着我就可以用 `json` 来初始化数据库，或者用 `faker`（现在别用了） 和 `test-data-bot` 来构造数据。然后就可以做好这些 Server Handler（类似 Express 的 API 用法），用来和 Mock DB 交互。这可以让我更快速、容易地写测试（一旦配置好 Handler 后）。

你可能在之前会用 [`nock`](https://github.com/nock/nock) 之类的库来做这些事。但 `msw` 最爽的地方在于：你可以将这些 “Server Handler” 用在前端本地开发上，用于以下场景：

* API 还没实现完
* API 炸了
* 网速太慢或者没联网

你或许听说过做类似事情的 [Mirage](https://miragejs.com/)。但是它不是用 Service Worker 在客户端实现的，所以你不会在开发者的 Network Tab 里看到 HTTP 请求，但是 `msw` 则可以，[两者对比可以看这里](https://miragejs.com/docs/comparison-with-other-tools/#msw)。

## 示例

有了上面的介绍，现在来看看 `msw` 是如何 Mock Server 的：

```js
// server-handlers.js
// 放在这里，不仅可以给测试用也能给前端本地使用
import {rest} from 'msw' // msw 支持 GraphQL
import * as users from './users'

const handlers = [
  rest.get('/login', async (req, res, ctx) => {
    const user = await users.login(JSON.parse(req.body))
    return res(ctx.json({user}))
  }),
  rest.post('/checkout', async (req, res, ctx) => {
    const user = await users.login(JSON.parse(req.body))
    const isAuthorized = user.authorize(req.headers.Authorization)
    if (!isAuthorized) {
      return res(ctx.status(401), ctx.json({message: 'Not authorized'}))
    }
    const shoppingCart = JSON.parse(req.body)
    // do whatever other things you need to do with this shopping cart
    return res(ctx.json({success: true}))
  }),
]

export {handlers}
```

```js
// test/server.js
import {rest} from 'msw'
import {setupServer} from 'msw/node'
import {handlers} from './server-handlers'

const server = setupServer(...handlers)
export {server, rest}
```

```js
// test/setup-env.js
// 加到 Jest 的 setup 文件上，可以在所有测试前执行
import {server} from './server.js'

beforeAll(() => server.listen())
// 如果你要在特定的用例上使用特定的 Handler，这会在最后把它们重置掉
// （对单测的隔离性很重要）
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

现在我们的测试就可以改成：

```js
// __tests__/checkout.js
import * as React from 'react'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('clicking "confirm" submits payment', async () => {
  const shoppingCart = buildShoppingCart()
  render(<Checkout shoppingCart={shoppingCart} />)

  userEvent.click(screen.getByRole('button', {name: /confirm/i}))

  expect(await screen.findByText(/success/i)).toBeInTheDocument()
})
```

比起 Mock `fetch`，我更喜欢这种方案的理由是：

* 不再担心 `fetch` 函数里的实现细节
* 如果按上面的方法来调用 `fetch` 时出问题，那么真实的 Server Handler 不会被调用，而且我的测试也会正确地失败，可以避免我提交有问题的代码
* 我可以在前端本地开发时重用这些 Server Handler！

## Colocation 和 error/edge case testing

唯一值得担心的是：你可能会把所有 Server Handler 放在一个地方，然后所有依赖它们的测试文件又会被放在不同地方，这可能会让文件不集中。

首先，我想说的是，只有那些对你测试 **很重要**，**很独特** 的东西才应该离测试文件尽可能近。你不需要在所有测试文件中都要重复 setup 一次，只需要 setup 独特的东西就可以了。所以，最简单的方式就是：把典型的部分从测试代码中干掉，然后放在 Jest 的 setup 文件里。不然你会有很多的干扰项，也很难对真正要测的东西进行隔离。

那边界处理和错误处理呢？对于它们，`msw` 不仅允许你在运行时在测试用例中添加额外的 Server Handler，还可以一键重置成你原来的 Handler，以此保留隔离性。比如：

```js
// __tests__/checkout.js
import * as React from 'react'
import {server, rest} from 'test/server'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// 啥也不需要改
test('clicking "confirm" submits payment', async () => {
  const shoppingCart = buildShoppingCart()
  render(<Checkout shoppingCart={shoppingCart} />)

  userEvent.click(screen.getByRole('button', {name: /confirm/i}))

  expect(await screen.findByText(/success/i)).toBeInTheDocument()
})

// 边界情况、错误情况，需要添加自定义的 Handler
// 注意 afterEach(() => server.resetHandlers())
// 可以确保在最近移除新增特殊的 Handler
test('shows server error if the request fails', async () => {
  const testErrorMessage = 'THIS IS A TEST FAILURE'
  server.use(
    rest.post('/checkout', async (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({message: testErrorMessage}))
    }),
  )
  const shoppingCart = buildShoppingCart()
  render(<Checkout shoppingCart={shoppingCart} />)

  userEvent.click(screen.getByRole('button', {name: /confirm/i}))

  expect(await screen.findByRole('alert')).toHaveTextContent(testErrorMessage)
})
```

这么一来，你不仅可以把相关逻辑的代码放在一起，还能有非常合理的抽象逻辑。

## 总结

肯定有更多与 `msw` 有关的事，但先让我们来小结一下吧。

这种测试策略非常爽的一个点就是：因为你完全忽略发代码的实现细节，所以你可以尽情地重构代码，同时你的测试会源源不断地给你信心，让你不用担心会破坏用户体验。这才是测试应该做的事。

---

**好了，这篇外文就给大家带到这里了。总的来说，我还是被这种拦截请求的测试策略给震惊到了。`msw` 不仅可以在测试中拦截请求，实现集成、E2E 测试，还可以在前端开发时来 Mock 数据，确实是一个有趣的实践。**

**最近也给我们项目写不少单测，其实单测和集成测试还是有很多互补的地方的。Jest 不仅仅是为了单测，集成测试也可以的。而且当你发现要测试的东西太复杂，太多干扰项时，使用集成测试会让你真正从用户的角度来写测试。这时，你不会关注那些覆盖率的指标了，而是从一个用户的角度来思考这样的用例能给我带来多少信心。**

**如果你喜欢我的分享，可以来一波一键三连，点赞、在看就是我最大的动力，比心 ❤️**
