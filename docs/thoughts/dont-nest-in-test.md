# 不要嵌套变量

## 前言

哈喽，大家好，我是海怪。

今天我又看了一下 [Kent C. Dodds](https://kentcdodds.com/ "Kent C. Dodds") 的博客，发现了这篇 [《Avoid Nesting when you're Testing》](https://kentcdodds.com/blog/avoid-nesting-when-youre-testing "《Avoid Nesting when you're Testing")，里面谈到对测试中的嵌套变量的一些取舍，非常值得大家借鉴，所以今天就把这篇文章分享给大家~

> 翻译中会尽量用更地道的语言，这也意味着会给原文加一层 Buf，想看原文的可点击 [这里](https://kentcdodds.com/blog/avoid-nesting-when-youre-testing "原文")。

---

## 正片开始

今天想大家分享一个东西，是一条在测试 React 组件时非常通用的一条测试原则。虽然下面举的是一个 React 的例子，但希望它能够更好地传达阐述这个概念。

> 注意：这里的意思并不是说嵌套本身是不好的，而是它在鼓励大家过度使用测试 Hook（例如 `beforeEach`）来复用代码时，会导致测试很难维护。

假如现在有一个 React 组件要测试：

```jsx
/ login.js
import * as React from 'react'

function Login({onSubmit}) {
  const [error, setError] = React.useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const {
      usernameInput: {value: username},
      passwordInput: {value: password},
    } = event.target.elements

    if (!username) {
      setError('username is required')
    } else if (!password) {
      setError('password is required')
    } else {
      setError('')
      onSubmit({username, password})
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="usernameInput">Username</label>
          <input id="usernameInput" />
        </div>
        <div>
          <label htmlFor="passwordInput">Password</label>
          <input id="passwordInput" type="password" />
        </div>
        <button type="submit">Submit</button>
      </form>
      {error ? <div role="alert">{error}</div> : null}
    </div>
  )
}

export default Login
```

效果如下：

![](https://files.mdnice.com/user/24913/cbf0b997-c5ff-4bd2-9afb-9f9e1a943d1e.png)

下面是一个这么多年来经常看到的对上面组件进行测试的例子：

```jsx
// __tests__/login.js
import {render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import Login from '../login'

describe('Login', () => {
  let utils,
    handleSubmit,
    user,
    changeUsernameInput,
    changePasswordInput,
    clickSubmit

  beforeEach(() => {
    handleSubmit = jest.fn()
    user = {username: 'michelle', password: 'smith'}
    utils = render(<Login onSubmit={handleSubmit} />)
    changeUsernameInput = value =>
      userEvent.type(utils.getByLabelText(/username/i), value)
    changePasswordInput = value =>
      userEvent.type(utils.getByLabelText(/password/i), value)
    clickSubmit = () => userEvent.click(utils.getByText(/submit/i))
  })

  describe('when username and password is provided', () => {
    beforeEach(() => {
      changeUsernameInput(user.username)
      changePasswordInput(user.password)
    })

    describe('when the submit button is clicked', () => {
      beforeEach(() => {
        clickSubmit()
      })

      it('should call onSubmit with the username and password', () => {
        expect(handleSubmit).toHaveBeenCalledTimes(1)
        expect(handleSubmit).toHaveBeenCalledWith(user)
      })
    })
  })

  describe('when the password is not provided', () => {
    beforeEach(() => {
      changeUsernameInput(user.username)
    })

    describe('when the submit button is clicked', () => {
      let errorMessage
      beforeEach(() => {
        clickSubmit()
        errorMessage = utils.getByRole('alert')
      })

      it('should show an error message', () => {
        expect(errorMessage).toHaveTextContent(/password is required/i)
      })
    })
  })

  describe('when the username is not provided', () => {
    beforeEach(() => {
      changePasswordInput(user.password)
    })

    describe('when the submit button is clicked', () => {
      let errorMessage
      beforeEach(() => {
        clickSubmit()
        errorMessage = utils.getByRole('alert')
      })

      it('should show an error message', () => {
        expect(errorMessage).toHaveTextContent(/username is required/i)
      })
    })
  })
})
```

这么做确实能给我们 100% 的信心：组件没问题，能够按照设定来工作。但有几点我不是很喜欢。

## 过度抽象

我觉得像 `changeUsernameInput` 和 `clickSubmit` 这样的工具函数还是挺好的，但是上面的测试实在太简单了，稍微复制一下代码就能简化我们的测试代码。这里的函数抽象并没有真正给我们这一小部分测试带来很多好处，反而会为维护人员带来成本，他们还得找到函数定义的地方才能理解整个测试用例。

## 嵌套

上面的测试都是用 [Jest](https://jestjs.io/) 的 API 实现的，但你也能在一些主流的 JavaScript 框架中找到类似的 API。这里的 API 是指用 `describe` 对测试进行分组，用 `beforeEach` 设置初始化操作，用 `it` 做断言。

我特别讨厌嵌套这些 API。之前我就编写和维护过上千个这样的测试，我可以告诉你的是阅读这三个简单的测试是多么的痛苦，当你有上千行测试还要加嵌套时，情况会更糟。

到底是什么把测试搞这么复杂呢？我们来看这个例子：

```js
it('should call onSubmit with the username and password', () => {
  expect(handleSubmit).toHaveBeenCalledTimes(1)
  expect(handleSubmit).toHaveBeenCalledWith(user)
})
```

告诉我这个 `handleSubmit` 是从哪来的，还有它的值是啥？还有，`user` 又是从哪冒出来的？它的值又是什么？当然，你可以找到它声明定义的地方：

```js
describe('Login', () => {
  let utils,
    handleSubmit,
    user,
    changeUsernameInput,
    changePasswordInput,
    clickSubmit
  // ...
})
```

不过，然后你就要搞清楚它们到底是什么时候被重新赋过值：

```js
beforeEach(() => {
  handleSubmit = jest.fn()
  user = {username: 'michelle', password: 'smith'}
  // ...
})
```

再然后，你就要一直确保它们不会在以后的 `beforeEach` 里被赋值成别的乱七八糟的。之所以我非常反对在测试的做嵌套操作的首要原因就是：你得一直跟着代码并追踪这些变量以及它们的值。你越是想着这样琐碎的事情，完成手头重要任务的难度就越高。

你可能会说：变量的重新赋值本来就不推荐（译注：值不可变原则），所以在写的时候是不应该多次重新赋值的。我也同意，但是给测试代码添加更多的 Linter 规则看起来就有点多余了，也不是一个治根的方法。如果有一种方法能共享这些 `setup` 操作，而完全不用担心变量被重新赋值，那不是很好么？

## 代码内联

对于这种简单组件，我觉得最好的解决方法就是尽可能去掉代码抽象。比如：

```js
// __tests__/login.js
import {render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import Login from '../login'

test('calls onSubmit with the username and password when submit is clicked', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText, getByText} = render(<Login onSubmit={handleSubmit} />)
  const user = {username: 'michelle', password: 'smith'}

  userEvent.type(getByLabelText(/username/i), user.username)
  userEvent.type(getByLabelText(/password/i), user.password)
  userEvent.click(getByText(/submit/i))

  expect(handleSubmit).toHaveBeenCalledTimes(1)
  expect(handleSubmit).toHaveBeenCalledWith(user)
})

test('shows an error message when submit is clicked and no username is provided', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText, getByText, getByRole} = render(
    <Login onSubmit={handleSubmit} />,
  )

  userEvent.type(getByLabelText(/password/i), 'anything')
  userEvent.click(getByText(/submit/i))

  const errorMessage = getByRole('alert')
  expect(errorMessage).toHaveTextContent(/username is required/i)
  expect(handleSubmit).not.toHaveBeenCalled()
})

test('shows an error message when submit is clicked and no password is provided', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText, getByText, getByRole} = render(
    <Login onSubmit={handleSubmit} />,
  )

  userEvent.type(getByLabelText(/username/i), 'anything')
  userEvent.click(getByText(/submit/i))

  const errorMessage = getByRole('alert')
  expect(errorMessage).toHaveTextContent(/password is required/i)
  expect(handleSubmit).not.toHaveBeenCalled()
})
```

> 注意：`test` 是 `it` 的别名，我只是在不嵌套在 `describe` 里面时，更喜欢用 `test` 而已。

你会发现上面的代码有点重复（等会说到），但这样的测试用例看起来多清晰呀。除了一些测试工具函数和 `Login` 组件本身之外，整个测试都是独立的。这很大程序提高了用例可读性，再也不用上翻下翻就能很快地理解整个用例了。如果有更多的测试用例，那么效果会更明显。

还要注意的是，我们并没有在 `describe` 里嵌套任何东西，因为这没有必要了。文件里所有东西都很清晰地测试了 `Login` 组件，所以就算是单层的嵌套也是没有意义的。

## AHA (Avoid Hasty Abstraction)

（译注：这里可以理解为避免过度抽象）

[AHA 原则](https://kentcdodds.com/blog/aha-programming) 说的就是你应该：

> **重复比错误的抽象更好，以及应该优先对修改的部分进行优化**

对于上面简单的 `Login` 组件，假设现在我用复制粘贴的方式写测试，如果情况变得更复杂，然后我们要处理掉上面的重复代码要怎么做呢？难道我们又要在 `beforeEach` 做抽象了么？毕竟它就是用来给每个用例执行前做一些操作的。

当然你是可以这么做，但我们又要担心变量的重新赋值问题了，我们应该要避免它。那我们要怎么才能在测试之间共享代码呢？AHA！我们可以用函数：

```js
import {render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import Login from '../login'

// 这里我们有一堆的 setup 函数
// 我只推荐当你的测试里有非常多相同的东西时才这么做
// 我只会在这个例子里这么做，因为这些测试根本不需要做这么多抽象，详见：https://kcd.im/aha-testing
function setup() {
  const handleSubmit = jest.fn()
  const utils = render(<Login onSubmit={handleSubmit} />)
  const user = {username: 'michelle', password: 'smith'}
  const changeUsernameInput = value =>
    userEvent.type(utils.getByLabelText(/username/i), value)
  const changePasswordInput = value =>
    userEvent.type(utils.getByLabelText(/password/i), value)
  const clickSubmit = () => userEvent.click(utils.getByText(/submit/i))
  return {
    ...utils,
    handleSubmit,
    user,
    changeUsernameInput,
    changePasswordInput,
    clickSubmit,
  }
}

function setupSuccessCase() {
  const utils = setup()
  utils.changeUsernameInput(utils.user.username)
  utils.changePasswordInput(utils.user.password)
  utils.clickSubmit()
  return utils
}

function setupWithNoPassword() {
  const utils = setup()
  utils.changeUsernameInput(utils.user.username)
  utils.clickSubmit()
  const errorMessage = utils.getByRole('alert')
  return {...utils, errorMessage}
}

function setupWithNoUsername() {
  const utils = setup()
  utils.changePasswordInput(utils.user.password)
  utils.clickSubmit()
  const errorMessage = utils.getByRole('alert')
  return {...utils, errorMessage}
}

test('calls onSubmit with the username and password', () => {
  const {handleSubmit, user} = setupSuccessCase()
  expect(handleSubmit).toHaveBeenCalledTimes(1)
  expect(handleSubmit).toHaveBeenCalledWith(user)
})

test('shows an error message when submit is clicked and no username is provided', () => {
  const {handleSubmit, errorMessage} = setupWithNoUsername()
  expect(errorMessage).toHaveTextContent(/username is required/i)
  expect(handleSubmit).not.toHaveBeenCalled()
})

test('shows an error message when password is not provided', () => {
  const {handleSubmit, errorMessage} = setupWithNoPassword()
  expect(errorMessage).toHaveTextContent(/password is required/i)
  expect(handleSubmit).not.toHaveBeenCalled()
})
```

现在，我们这些测试就都能用上这些简单的 `setup` 函数了，要注意的是它们可以放在 `beforeEach` 中组件起来使用，这样会看起来更合理一点。不过，现在我们已经可以避免可变变量的情况了，也不用一直在脑子里记录变量的赋值操作了、

## 测试分组

`describe` 函数本身是用来对相关测试用例进行分组的，可以让我们在视觉上很清晰地划分不同测试用例，特别是在一些大测试文件中。但我不是很喜欢太大的测试文件。所以与其用 `describe` 来分组，我会选择用文件来分组。因此，如果对相同的代码 “单元” 有不同测试的逻辑分组，我会将它们分开，将它们放在完全不同的文件中。而如果有些代码真的需要在测试之间共享，那我会写一个 `__tests__/helpers/login.js` 来放这些通用代码。

这样就可以在逻辑上对测试分组，将它们所有独特的 `setup` 函数完全分开，可以减少对部分测试代码区域的心理负担。而且如果你的测试可以并行执行，那我这样的测试也可以是跑很快的。

## cleanup

这篇文章不是说 `beforeEach` 和 `afterEach` 这些 API 不好，更多想说的是要避免测试中的可变变量，而且不要过度抽象测试代码。

对于 `cleanup`，有时候你可能会遇到要改变全局环境的某些东西，然后要做一些收尾工作。如果你把代码都内联到测试用例里，万一测试用例挂了，你的 `cleanup` 操作可能就不会执行了，导致你别的测试用例也会挂掉，最终抛出一堆的错误，很难 debug。

> 注意：这个例子是在 `@testing-library/react@9` 发布前写的，它会自动执行 `cleanup` API。不过这里说的理念是不变的。

比如 React Testing Library 会把你的组件插入到 `document` 里，如果你不在每个测试做 `cleanup`，你的测试就会有问题：

```js
import {render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import Login from '../login'

test('example 1', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText} = render(<Login onSubmit={handleSubmit} />)
  userEvent.type(getByLabelText(/username/i), 'kentcdodds')
  userEvent.type(getByLabelText(/password/i), 'ilovetwix')
  // 更多测试
})

test('example 2', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText} = render(<Login onSubmit={handleSubmit} />
  // 💣 这里会崩因为 `getByLabelText` 是在整个 document 里查询的
  // 因为我们没有在之前测试用例里 cleanup
  // RTL 会报一个错说超过 1 处地方有 label "username"
  userEvent.type(getByLabelText(/username/i), 'kentcdodds')
  // 更多测试
})
```

修复它很简单，你要在每个测试用例执行后调一下 `@testing-library/react` 里的 `cleanup`。

```js
import {cleanup, render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import Login from '../login'

test('example 1', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText} = render(<Login onSubmit={handleSubmit} />)
  userEvent.type(getByLabelText(/username/i), 'kentcdodds')
  userEvent.type(getByLabelText(/password/i), 'ilovetwix')
  // more test here
  cleanup()
})

test('example 2', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText} = render(<Login onSubmit={handleSubmit} />)
  userEvent.type(getByLabelText(/username/i), 'kentcdodds')
  // more test here
  cleanup()
})
```

**（译注：现在 RTL 已经会自动调用了，大家看到这里不用太担心，这里作者只是想说 cleanup 操作不要内联到用例中，因为用例一炸，你的 cleanup 就不会被执行了）**

然而，如果你不用 `afterEach`，那只要测试出错了，你的 `cleanup` 就不会被执行了。比如：

```js
test('example 1', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText} = render(<Login onSubmit={handleSubmit} />)
  userEvent.type(getByLabelText(/username/i), 'kentcdodds')
  // 💣 下面会报这样的错误
  //   "no field with the label matching passssword"
  userEvent.type(getByLabelText(/passssword/i), 'ilovetwix')
  // 更多测试
  cleanup()
})
```

因此，"exmaple 1" 的 `cleanup` 函数不会被执行，而且 "example 2" 也不会被执行，所以你并不仅会看到 example 1 失败了，你会发现所有测试都失败了，而且调试起来更困难。

所以，你最好要用 `afterEach`，它会确保就算测试失败了，也会执行 `cleanup`：

```js
import {cleanup, render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import Login from '../login'

afterEach(() => cleanup())

test('example 1', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText} = render(<Login onSubmit={handleSubmit} />)
  userEvent.type(getByLabelText(/username/i), 'kentcdodds')
  userEvent.type(getByLabelText(/password/i), 'ilovetwix')
  // more test here
})

test('example 2', () => {
  const handleSubmit = jest.fn()
  const {getByLabelText} = render(<Login onSubmit={handleSubmit} />)
  userEvent.type(getByLabelText(/username/i), 'kentcdodds')
  // 更多测试
})
```

> 更好的是，现在 RTL 已经可以自动调用 `cleanup` 了。

除此之外，还有很多 `before*` 的很好用法，不过一般它们都会对应 `after*` 里的一些操作，比如：

```js
let server
beforeAll(async () => {
  server = await startServer()
})
afterAll(() => server.close())
```

没有其他可靠的方法可以做到这一点了。我想到这些 Hooks 的另一种用法就是测试 `console.error` 的调用：

```js
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  console.error.mockClear()
})

afterAll(() => {
  console.error.mockRestore()
})
```

**所以，这些 Hooks 肯定有它的用武之地。我只是不推荐用它们来做代码复用，可以用函数来做到。**

## 总结

我用过不同的框架的方法写过上千个测试，减少变量的重新赋值可以得到更高的测试用例维护性。

![](https://files.mdnice.com/user/24913/94a1d4f5-ca4f-4aab-becb-bff61c7706b7.png)

---

**好了，这篇外文就给大家带到这里了。这篇文章主要说了我们不应该对测试代码进行嵌套，本质说的就是要避免在测试中的变量引用。这里不得不说到测试代码和业务代码的抽象程度是不一样的，对于测试代码来说，测试用例的可读性是非常重要的，所以过度的抽象带来的是高昂的维护成本。因此，在写测试是应该要避免过度抽象，避免变量的重新赋值。**

**如果你喜欢我的分享，可以来一波一键三连，点赞、在看就是我最大的动力，比心 ❤️**
