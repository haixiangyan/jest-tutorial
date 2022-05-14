# 如何抽象测试代码

## 前言

哈喽，大家好，我是海怪。

不知道大家在写前端单测的时候，是否有出现测试代码和测试数据重复冗余的情况？然后不得不写一些函数和类来封装他们的。然而，慢慢地会发现：**过度的封装会致使你的测试用例变得越来越难读。**

那到底在写测试代码时，怎样的封装才是好的封装呢？今天就把 Kent 的这篇 [《AHA Testing》](https://kentcdodds.com/blog/aha-testing) 分享给大家~

---

## 正片开始

[“AHA 编码原则”](https://kentcdodds.com/blog/aha-programming) 指的是 “避免过度的抽象”（Avoid Hasty Abstraction）。我对这如何适用于编写可维护的测试有不一样的感觉。因为我见过太多人写的测试都是在下面这条轴两个极端：要么是 **ANA (Absolutely No Abstraction) 完全没有任何抽象**，要么是 **完全 DRY (Don't Repeat Yourself) 完全不做任何重复【译注：我觉得这里可以理解为过度抽象】**。（ANA 是我现在起的名）

![](https://files.mdnice.com/user/24913/c15c2254-2a7a-4b39-bb81-865e7ca089fb.png)

要写出一份高维护性测试代码的关键就是在上面这条轴上找一个最完美的平衡点。

## ANA Testing

一个我见过最好的 “完全不做抽象” 的例子就是给 [Express 的 Route Handler](https://expressjs.com/en/guide/routing.html) 写测试。为了能让你理解我这里说的 “用 ANA 写测试是不好的”，这里给你一个经典的样例，你来维护好它的代码库和测试用例。可能你现在会觉得这些测试用例也能保障代码质量，也还好。不过这样的用例真的没问题么？先让我们来看看这些测试代码来找出下面 Route Handler 中的不同之处吧。

> 别花太久的时间哦

```js
import * as blogPostController from '../blog-post'

// load the application-wide mock for the database.
// I guess that means this is AANA (Almost Absolutely No Abstraction)
// but I didn't want to write out a whole db mock for this blog post 😅
jest.mock('../../lib/db')

test('lists blog posts for the logged in user', async () => {
  const req = {
    locale: {
      source: 'default',
      language: 'en',
      region: 'GB',
    },
    user: {
      guid: '0336397b-e29d-4b63-b94d-7e68a6fa3747',
      isActive: false,
      picture: 'http://placehold.it/32x32',
      age: 30,
      name: {
        first: 'Francine',
        last: 'Oconnor',
      },
      company: 'ACME',
      email: 'francine.oconnor@ac.me',
      latitude: 51.507351,
      longitude: -0.127758,
      favoriteFruit: 'banana',
    },
    body: {},
    cookies: {},
    query: {},
    params: {
      bucket: 'photography',
    },
    header(name) {
      return {
        Authorization: 'Bearer TEST_TOKEN',
      }[name]
    },
  }
  const res = {
    clearCookie: jest.fn(),
    cookie: jest.fn(),
    end: jest.fn(),
    locals: {
      content: {},
    },
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    set: jest.fn(),
  }
  const next = jest.fn()

  await blogPostController.loadBlogPosts(req, res, next)

  expect(res.json).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledWith({
    posts: expect.arrayContaining([
      expect.objectContaining({
        title: 'Test Post 1',
        subtitle: 'This is the subtitle of Test Post 1',
        body: 'The is the body of Test Post 1',
      }),
    ]),
  })
})

test('returns an empty list when there are no blog posts', async () => {
  const req = {
    locale: {
      source: 'default',
      language: 'en',
      region: 'GB',
    },
    user: {
      guid: '0336397b-e29d-4b63-b94d-7e68a6fa3747',
      isActive: false,
      picture: 'http://placehold.it/32x32',
      age: 30,
      name: {
        first: 'Francine',
        last: 'Oconnor',
      },
      company: 'ACME',
      email: 'francine.oconnor@ac.me',
      latitude: 31.230416,
      longitude: 121.473701,
      favoriteFruit: 'banana',
    },
    body: {},
    cookies: {},
    query: {},
    params: {
      bucket: 'photography',
    },
    header(name) {
      return {
        Authorization: 'Bearer TEST_TOKEN',
      }[name]
    },
  }
  const res = {
    clearCookie: jest.fn(),
    cookie: jest.fn(),
    end: jest.fn(),
    locals: {
      content: {},
    },
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    set: jest.fn(),
  }
  const next = jest.fn()

  await blogPostController.loadBlogPosts(req, res, next)

  expect(res.json).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledWith({
    posts: [],
  })
})
```

找到其中的差别了么？这里的差别是：第一例子能够返回一个 Post，而在第二个用例中不返回这个 Post！那么到底是什么导致两者的差别呢？还有，为什么要在第一个用例里 `blogPostController.loadBlogPosts(req, res, next)` 调用的 `res.json` 里要返回 Post，而第二个用例却没有返回呢？

如果你想不出这些问题的答案。没关系，等会再说。如果你搞懂了，说明你很适合玩《大家一起来找猹》这个流。如果都像上面这样写测试，那么写出来的用例很难让别人阅读和维护。

假如现在有 20 多个这样的测试用例放在一个文件里，你是不是看着很难受？你可能会说：哪有那么夸张？别笑，像这样的我见太多了。我举个例子：

* 一个新人刚到新团队
* 然后被叫去加个测试用例
* 复制一下以前的测试代码，在上面改改，感觉没什么问题就提交了
* Review 的人一看：测试通过了，代码应该没问题就 Approve 了
* PR 合并

所以，为了更好地处理这种情况，你可以思考以下两个问题：

> 你的测试用例是否能够很快让人看懂它们之前的差异以及这些差异的来源。

绝对不要写 “完全没抽象” 的测试代码。

## DRY Testing

我现在没法给一个很好的 `DRY` 测试代码的例子。只需要知道：当想把所有东西都要弄成 `DRY` 的时候，测试就会变得非常难以维护了，比如：

* 一个新人刚到新团队
* 他被叫去加个测试用例
* 复制以前的测试代码，然后在测试工具函数中加了一行 `if` 语句来通过测试
* Review 的人一看：测试通过了，代码应该没问题就 Approve 了
* PR 合并

在 DRY 测试中，我见的很多的另一种情况就是：滥用 `describe` 和 `it` 的嵌套以及 `beforeEach`。你越是想用嵌套来做变量的共享，越是难让人搞懂测试代码的逻辑。关于这个问题，可以看我的 [《Test Isolation with React》])(https://kentcdodds.com/blog/test-isolation-with-react) 这篇文章。

---
**以下为译注内容。** 这里作者没有给一个很好的例子，我这里稍做补充一下。举下面这个例子：

```js
import { getUserById } from 'src/db/user';
import { mockUser, mockAttributes } from 'tests/utils/constants';
import { insertUser } from 'tests/utils/db';

describe('测试 DB', () => {
  it('测试 getUserById', async () => {
    const user = {
      id: '123',
      ...mockUser,
      ...mockAttributes,
    }
    
    await insertUser(user);
    
    const resultUser = await getUserById('123');
    
    expect(resultUser).toEqual(user);
  })
})
```

我们把 `mockUser`, `mockAttributes` 以及 `insertUser` 都放在 `tests/utils` 下了，这样去构造测试用例很容易会出现过度抽象。因为对于第一次看这个用例的人来说，他得先去找 `tests/utils/contants` 下的 user 相关的数据，然后再去 `tests/utils/db` 下找 `insertUser` 的具体实现，再然后才能拼凑出一个完整的 `user` 输入内容。

在最后的 `toEqual` 里也要回过头来看 `user` 的内容是啥，这就导致阅读用例的人会有比较高的心智负担，他大脑得有一个内存时刻存放着这个 `user` 的样子，这样的用例就变得很难让人跟上了，特别是在一些用例非常多的测试文件中，这种心智负担会变得越来越重。

所以，这里更推荐是可以在前面加一个 `setup` 函数用于生成对应的 `user` 内容，然后再在具体的用例中 **用非常明显的方式** 去添加这个用例的 “独特之处”（比如名字变了之类的）

```js
import { getUserById } from 'src/db/user';
import { getMockUser } from 'tests/utils/user';
import { insertUser } from 'tests/utils/db';

const setup = () => {
  return getMockUser();
}

describe('测试 DB', () => {
  it('测试 getUserById', async () => {
    const mockUser = setup();
    
    mockUser.name = 'Jack';

    await insertUser(mockUser);

    const resultUser = await getUserById('123');

    expect(resultUser.name).toEqual('Jack');
  })
})
```

这里依然把 `getMockUser` 和 `insertUser` 放在 `tests/utils` 中了，因为别的地方也有可能会用到，还是得做适量的抽象。不过，我们这里把 `mockUser.name = 'Jack'` 放在第二行，那对于第一次看的人来说就知道：**这个用例的重点要关注 `name` 这个字段。**

而后面的 `toEqual('Jack')` 也很清晰地让阅读用例的人知道：**你现在期望的结果就是 `'Jack'`，而不是 `mockUser.name`，因为如果写变量的话，会很人很不放心：“万一这个变量被改了呢？”**

总的来说，我们不要过度代入开发的视角，而要以 **文档阅读者** 的角度去编写自己的用例，用例可读性应该优先于代码可读性。

**译注结束。**

---

## AHA Testing

上面第一个例子绝对是抽象的灾难（不过这也可以作为 AHA 编程思路的一个参考方向）。现在一起来把上面的测试写得更让人容易理解吧。首先我们来理清楚这两个用例的不同之处。

```js
import * as blogPostController from '../blog-post'

// load the application-wide mock for the database.
jest.mock('../../lib/db')

function setup(overrides = {}) {
  const req = {
    locale: {
      source: 'default',
      language: 'en',
      region: 'GB',
    },
    user: {
      guid: '0336397b-e29d-4b63-b94d-7e68a6fa3747',
      isActive: false,
      picture: 'http://placehold.it/32x32',
      age: 30,
      name: {
        first: 'Francine',
        last: 'Oconnor',
      },
      company: 'ACME',
      email: 'francine.oconnor@ac.me',
      latitude: 51.507351,
      longitude: -0.127758,
      favoriteFruit: 'banana',
    },
    body: {},
    cookies: {},
    query: {},
    params: {
      bucket: 'photography',
    },
    header(name) {
      return {
        Authorization: 'Bearer TEST_TOKEN',
      }[name]
    },
    ...overrides,
  }

  const res = {
    clearCookie: jest.fn(),
    cookie: jest.fn(),
    end: jest.fn(),
    locals: {
      content: {},
    },
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    set: jest.fn(),
  }
  const next = jest.fn()

  return {req, res, next}
}

test('lists blog posts for the logged in user', async () => {
  const {req, res, next} = setup()

  await blogPostController.loadBlogPosts(req, res, next)

  expect(res.json).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledWith({
    posts: expect.arrayContaining([
      expect.objectContaining({
        title: 'Test Post 1',
        subtitle: 'This is the subtitle of Test Post 1',
        body: 'The is the body of Test Post 1',
      }),
    ]),
  })
})

test('returns an empty list when there are no blog posts', async () => {
  const {req, res, next} = setup()
  req.user.latitude = 31.230416
  req.user.longitude = 121.473701

  await blogPostController.loadBlogPosts(req, res, next)

  expect(res.json).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledWith({
    posts: [],
  })
})
```

来说说第一个和第二个用例不同之处在哪？第一个用例的用户在 `London`，第二个则在 `Shanghai`。

只要稍微添加一点点抽象代码，我们就可以很清晰地分清用例之前的输入和输出的不同，这样的测试代码就会更容易让人理解和维护。

## 用 AHA 思想来测 React

当测 React 组件时，我一般都会有一个 `renderFoo` 的函数专门用来充当 `setup` 的作用。比如：

```js
import * as React from 'react'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../login-form'

function renderLoginForm(props) {
  render(<LoginForm {...props} />)
  const usernameInput = screen.getByLabelText(/username/i)
  const passwordInput = screen.getByLabelText(/password/i)
  const submitButton = screen.getByText(/submit/i)
  return {
    usernameInput,
    passwordInput,
    submitButton,
    changeUsername: value => userEvent.type(usernameInput, value),
    changePassword: value => userEvent.type(passwordInput, value),
    submitForm: () => userEvent.click(submitButton),
  }
}

test('submit calls the submit handler', () => {
  const handleSubmit = jest.fn()
  const {changeUsername, changePassword, submitForm} = renderLoginForm({
    onSubmit: handleSubmit,
  })
  const username = 'chucknorris'
  const password = 'ineednopassword'
  changeUsername(username)
  changePassword(password)
  submitForm()
  expect(handleSubmit).toHaveBeenCalledTimes(1)
  expect(handleSubmit).toHaveBeenCalledWith({username, password})
})
```

> 如果像上面只有两、三个测试用例，或者测试代码很短的话，我会觉得这有点过早优化了。但如果你的用例都是各自有一些细微区别（比如错误状态等），那么像这样去做抽象就是很好的。

## Nesting 嵌套

建议看 [《https://kentcdodds.com/blog/avoid-nesting-when-youre-testing》](https://kentcdodds.com/blog/avoid-nesting-in-tests) 这篇文件。

## jest-in-case 和 test.each

如果你只是做纯函数的测试，那么你很幸运，因为它们都是最容易测的。你完全可以通过简单的抽象来简化测试代码，让它们在调用时更明显地展示输入和输出内容。

比如：

```js
import add from '../add'

test('adds one and two to equal three', () => {
  expect(add(1, 2)).toBe(3)
})

test('adds three and four to equal seven', () => {
  expect(add(3, 4)).toBe(7)
})

test('adds one hundred and two to equal one hundred two', () => {
  expect(add(100, 2)).toBe(102)
})
```

我们还可以用 `jest-in-case` 更优雅的写法来实现：

```js
import cases from 'jest-in-case'
import add from '../add'

cases(
  'add',
  ({first, second, result}) => {
    expect(add(first, second)).toBe(result)
  },
  [
    {first: 1, second: 2, result: 3},
    {first: 3, second: 4, result: 7},
    {first: 100, second: 2, result: 102},
  ],
)
```

对这样简单的用例，我可能不会用这样方式写，不过，能直接在数组后面添加输入和输出就能添加更多的测试用例，感觉还是挺爽的。类似这类思路的一个很好的例子就是：[rtl-css-js 的测试用例](https://github.com/kentcdodds/rtl-css-js/blob/b148865ce6a4c994eba292015b8f44b5dae7edaa/src/__tests__/index.js)。其它代码贡献者会发现用这样的结构来添加用例简直不要太爽！

当然这也可以用在一些非纯函数的情况，不过可能要做更多的抽象了。（[这有个例子，虽然不是很好，但是我觉得还凑合](https://github.com/kentcdodds/kcd-scripts/blob/7bc29e41e46e73b4b57c0f975648a90a75c24c80/src/scripts/__tests__/lint.js)）

我个人是很喜欢 `jest-in-case` 的，不过 `jest` 已经内置了 `test.each` 了，应该会对你有所帮助。

## 总结

虽然我们的测试代码可以通过起更好的用例名，写更多的注释来提升观感和可读性，但是，如果有一个简单的 `setup` 抽象函数（也叫做 `Test Object Factory`），就可以不需要它们了。所以，我的观点是：**高质量且有意义的代码抽象能有效地减少编写和维护测试代码的成本。**

---

**好了，这篇外文就给大家带到这里了。总的来说，我是认可作者的观点的，因为我们写单测时难免会遇到要构造一堆 Mock 对象、实例的情况，而且对不同的测试用例 Mock 内容可能仅有细微差别。**

**而如果你把这些搞得太抽象，比如放在 `tests/utils` 来生成对象的话，又会导致太抽象而难以理解，对阅读用例的人来说有着非常高的心智负担。所以最好的方式还是在当前测试文件中，写一个 `setup` 函数来生成基础的 Mock 对象，然后再在对应用例中做细微差别的调整即可，并尽量把差异化展现出来。这不仅能让阅读者跟上用例的节奏，也能对用例的输入和输出也一目了然。**

**如果你喜欢我的分享，可以来一波一键三连，点赞、在看就是我最大的动力，比心 ❤️**
