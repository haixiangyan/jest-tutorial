# 如何测自定义的 React Hooks

## 前言

哈喽，大家好，我是海怪。

最近把项目里的 `utils` 以及 `components` 里的东西都测完了，算是完成了这次单测引入的第一个里程碑了。之后，我又把目光放到了 `hooks` 的文件夹上面，因为这些自定义 Hooks 一般都当工具包来使用，所以给它们上一上单测还是很有必要的。

正好我在 [Kent C. Dodds](https://kentcdodds.com/ "Kent C. Dodds") 的博客里也发现了这篇 [《How to test custom React hooks》](https://kentcdodds.com/blog/how-to-test-custom-react-hooks "《How to test custom React hooks》")，里面正好提到了如何高效地对自定义 Hooks 进行测试。今天就把这篇文章也分享给大家吧。

> 翻译中会尽量用更地道的语言，这也意味着会给原文加一层 Buf，想看原文的可点击 [这里](https://kentcdodds.com/blog/how-to-test-custom-react-hooks "原文")。

---

## 正片开始

如果你现在正在用 `react@>=16.8`，那你可能已经在项目里写好几个自定义 Hooks 了。或许你会思考：如何才能让别人更安心地使用这些 Hooks 呢？当然这里的 Hooks 不是指那些你为了减少组件体积而抽离出来的业务逻辑 Hooks（这些应该通过组件测试来测的），而是那些你要发布到 NPM 或者 Github 上的，可重复使用的 Hooks。

假如现在我们有一个 `useUndo` 的 Hooks。

*（这里 `useUndo` 的代码逻辑对本文不是很重要，不过如果你想知道它是怎么实现的，可以读一下 Homer Chen 写的源码）*

```js
import * as React from 'react'

const UNDO = 'UNDO'
const REDO = 'REDO'
const SET = 'SET'
const RESET = 'RESET'

function undoReducer(state, action) {
  const {past, present, future} = state
  const {type, newPresent} = action

  switch (action.type) {
    case UNDO: {
      if (past.length === 0) return state

      const previous = past[past.length - 1]
      const newPast = past.slice(0, past.length - 1)

      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      }
    }

    case REDO: {
      if (future.length === 0) return state

      const next = future[0]
      const newFuture = future.slice(1)

      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      }
    }

    case SET: {
      if (newPresent === present) return state

      return {
        past: [...past, present],
        present: newPresent,
        future: [],
      }
    }

    case RESET: {
      return {
        past: [],
        present: newPresent,
        future: [],
      }
    }
    default: {
      throw new Error(`Unhandled action type: ${type}`)
    }
  }
}

function useUndo(initialPresent) {
  const [state, dispatch] = React.useReducer(undoReducer, {
    past: [],
    present: initialPresent,
    future: [],
  })

  const canUndo = state.past.length !== 0
  const canRedo = state.future.length !== 0
  const undo = React.useCallback(() => dispatch({type: UNDO}), [])
  const redo = React.useCallback(() => dispatch({type: REDO}), [])
  const set = React.useCallback(
    newPresent => dispatch({type: SET, newPresent}),
    [],
  )
  const reset = React.useCallback(
    newPresent => dispatch({type: RESET, newPresent}),
    [],
  )

  return {...state, set, reset, undo, redo, canUndo, canRedo}
}

export default useUndo
```

假如现在让我们来对这个 Hook 进行测试，提高代码可维护性。为了能最大化测试效果，**我们应该确保我们的测试趋近于软件的真实使用方式。** 要记住，软件的作用就是专门用来处理那些我们不想，或者不能手动去做的事的。写测试也是同理，所以先来想想我们会如何手动地测它，然后再来写自动化测试去替代手动。

我看到很多人都会犯的一个错就是：总是想 “Hook 嘛，不就是个纯函数么？就因为这样我们才喜欢用 Hook 的嘛。那是不是就可以像直接调普通函数那样，测试函数的返回值呢？” 对但是不完全对，它确实是个函数，但严格来说，它并不是 [纯函数](https://en.wikipedia.org/wiki/Pure_function)，你的 Hooks 应该是 [幂等](https://en.wikipedia.org/wiki/Idempotence) 的。如果是纯函数，那直接调用然后看看返回输出是否正确的就可以了。

然而，如果你直接在测试里调用 Hooks，你就会因为破坏 [React 的规则](https://reactjs.org/docs/hooks-rules.html)，而得到这样的报错：

```md
Error: Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
  1. You might have mismatching versions of React and the renderer (such as React DOM)
  2. You might be breaking the Rules of Hooks
  3. You might have more than one copy of React in the same app
  See https://fb.me/react-invalid-hook-call for tips about how to debug and fix this problem.
```

现在你可能会想：“如果我把 React 内置的 Hooks（`useEffect`，`useState`） 都 Mock 了，那不就可以像普通函数那样去做测试了么？” 求你了，别！因为这样会让你对测试代码失去很多信心的。

不过，别慌。如果你只是想手动测试，可以不用像普通函数那样去调用，你完全可以写一个组件来使用这个 Hook，然后再用它来和组件交互，最终渲染到页面。下面来实现一下吧：

```jsx
import * as React from 'react'
import useUndo from '../use-undo'

function UseUndoExample() {
  const {present, past, future, set, undo, redo, canUndo, canRedo} =
    useUndo('one')
  function handleSubmit(event) {
    event.preventDefault()
    const input = event.target.elements.newValue
    set(input.value)
    input.value = ''
  }

  return (
    <div>
      <div>
        <button onClick={undo} disabled={!canUndo}>
          undo
        </button>
        <button onClick={redo} disabled={!canRedo}>
          redo
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="newValue">New value</label>
        <input type="text" id="newValue" />
        <div>
          <button type="submit">Submit</button>
        </div>
      </form>
      <div>Present: {present}</div>
      <div>Past: {past.join(', ')}</div>
      <div>Future: {future.join(', ')}</div>
    </div>
  )
}

export {UseUndoExample}
```

最终渲染结果：

![](https://files.mdnice.com/user/24913/59c959c2-0b4c-4d95-987d-05dea78abd5c.png)

好，现在就可以通过这个能和 Hook 交互的样例来测试我们的 Hook 了。把上面的手动测试转为自动化，我们可以写一个测试来实现和手动做的一样的事。比如：

```js
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import {UseUndoExample} from '../use-undo.example'

test('allows you to undo and redo', () => {
  render(<UseUndoExample />)
  const present = screen.getByText(/present/i)
  const past = screen.getByText(/past/i)
  const future = screen.getByText(/future/i)
  const input = screen.getByLabelText(/new value/i)
  const submit = screen.getByText(/submit/i)
  const undo = screen.getByText(/undo/i)
  const redo = screen.getByText(/redo/i)

  // assert initial state
  expect(undo).toBeDisabled()
  expect(redo).toBeDisabled()
  expect(past).toHaveTextContent(`Past:`)
  expect(present).toHaveTextContent(`Present: one`)
  expect(future).toHaveTextContent(`Future:`)

  // add second value
  input.value = 'two'
  userEvent.click(submit)

  // assert new state
  expect(undo).not.toBeDisabled()
  expect(redo).toBeDisabled()
  expect(past).toHaveTextContent(`Past: one`)
  expect(present).toHaveTextContent(`Present: two`)
  expect(future).toHaveTextContent(`Future:`)

  // add third value
  input.value = 'three'
  userEvent.click(submit)

  // assert new state
  expect(undo).not.toBeDisabled()
  expect(redo).toBeDisabled()
  expect(past).toHaveTextContent(`Past: one, two`)
  expect(present).toHaveTextContent(`Present: three`)
  expect(future).toHaveTextContent(`Future:`)

  // undo
  userEvent.click(undo)

  // assert "undone" state
  expect(undo).not.toBeDisabled()
  expect(redo).not.toBeDisabled()
  expect(past).toHaveTextContent(`Past: one`)
  expect(present).toHaveTextContent(`Present: two`)
  expect(future).toHaveTextContent(`Future: three`)

  // undo again
  userEvent.click(undo)

  // assert "double-undone" state
  expect(undo).toBeDisabled()
  expect(redo).not.toBeDisabled()
  expect(past).toHaveTextContent(`Past:`)
  expect(present).toHaveTextContent(`Present: one`)
  expect(future).toHaveTextContent(`Future: two, three`)

  // redo
  userEvent.click(redo)

  // assert undo + undo + redo state
  expect(undo).not.toBeDisabled()
  expect(redo).not.toBeDisabled()
  expect(past).toHaveTextContent(`Past: one`)
  expect(present).toHaveTextContent(`Present: two`)
  expect(future).toHaveTextContent(`Future: three`)

  // add fourth value
  input.value = 'four'
  userEvent.click(submit)

  // assert final state (note the lack of "third")
  expect(undo).not.toBeDisabled()
  expect(redo).toBeDisabled()
  expect(past).toHaveTextContent(`Past: one, two`)
  expect(present).toHaveTextContent(`Present: four`)
  expect(future).toHaveTextContent(`Future:`)
})
```

我其实还挺喜欢这种方法的，因为相对来说，它也挺好懂的。大多数情况下，我也推荐这样去测 Hooks。

然而，有时候你得把组件写得非常复杂才能拿来做测试。最终结果就是，测试挂了并不是因为 Hook 有问题，而是因为你的例子太复杂而导致的问题。

还有一个问题会让这个问题变得更复杂。在很多场景中，一个组件是不能完全满足你的测试用例场景的，所以你就得写一大堆 Example Component 来做测试。

虽然写多点 Example Component 也挺好的（比如，[storybook](https://storybook.js.org/) 就是这样的），但是，如果能创建一个没有任何 UI 关联的 Helper 函数，让它的返回值和 Hook 做交互可能会很好。

下面这个例子就是用这个想法来做的测试：

```js
import * as React from 'react'
import {render, act} from '@testing-library/react'
import useUndo from '../use-undo'

function setup(...args) {
  const returnVal = {}
  function TestComponent() {
    Object.assign(returnVal, useUndo(...args))
    return null
  }
  render(<TestComponent />)
  return returnVal
}

test('allows you to undo and redo', () => {
  const undoData = setup('one')

  // assert initial state
  expect(undoData.canUndo).toBe(false)
  expect(undoData.canRedo).toBe(false)
  expect(undoData.past).toEqual([])
  expect(undoData.present).toEqual('one')
  expect(undoData.future).toEqual([])

  // add second value
  act(() => {
    undoData.set('two')
  })

  // assert new state
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(false)
  expect(undoData.past).toEqual(['one'])
  expect(undoData.present).toEqual('two')
  expect(undoData.future).toEqual([])

  // add third value
  act(() => {
    undoData.set('three')
  })

  // assert new state
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(false)
  expect(undoData.past).toEqual(['one', 'two'])
  expect(undoData.present).toEqual('three')
  expect(undoData.future).toEqual([])

  // undo
  act(() => {
    undoData.undo()
  })

  // assert "undone" state
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(true)
  expect(undoData.past).toEqual(['one'])
  expect(undoData.present).toEqual('two')
  expect(undoData.future).toEqual(['three'])

  // undo again
  act(() => {
    undoData.undo()
  })

  // assert "double-undone" state
  expect(undoData.canUndo).toBe(false)
  expect(undoData.canRedo).toBe(true)
  expect(undoData.past).toEqual([])
  expect(undoData.present).toEqual('one')
  expect(undoData.future).toEqual(['two', 'three'])

  // redo
  act(() => {
    undoData.redo()
  })

  // assert undo + undo + redo state
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(true)
  expect(undoData.past).toEqual(['one'])
  expect(undoData.present).toEqual('two')
  expect(undoData.future).toEqual(['three'])

  // add fourth value
  act(() => {
    undoData.set('four')
  })

  // assert final state (note the lack of "third")
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(false)
  expect(undoData.past).toEqual(['one', 'two'])
  expect(undoData.present).toEqual('four')
  expect(undoData.future).toEqual([])
})
```

上面这样可以更直接地和 Hook 进行交互（这就是为什么 `act` 是必需的），可以让我们不用写那么多复杂的 Examaple Component 来覆盖 Use Case 了。

有的时候，你会有更复杂的 Hook，比如等待 Mock 的 HTTP 请求返回的 Hook，或者你要用不同的 `Props` 来使用 Hooks 去 `重新渲染` 组件等等。这里每种情况都会让你的 `setup` 函数和你真实的例子变得非常不可复用，没有规律可循。


这就是为什么会有 [@testing-library/react-hooks](https://github.com/testing-library/react-hooks-testing-library)，如果我们用了它，会变成这样：

```js
import {renderHook, act} from '@testing-library/react-hooks'
import useUndo from '../use-undo'

test('allows you to undo and redo', () => {
  const {result} = renderHook(() => useUndo('one'))

  // assert initial state
  expect(result.current.canUndo).toBe(false)
  expect(result.current.canRedo).toBe(false)
  expect(result.current.past).toEqual([])
  expect(result.current.present).toEqual('one')
  expect(result.current.future).toEqual([])

  // add second value
  act(() => {
    result.current.set('two')
  })

  // assert new state
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(false)
  expect(result.current.past).toEqual(['one'])
  expect(result.current.present).toEqual('two')
  expect(result.current.future).toEqual([])

  // add third value
  act(() => {
    result.current.set('three')
  })

  // assert new state
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(false)
  expect(result.current.past).toEqual(['one', 'two'])
  expect(result.current.present).toEqual('three')
  expect(result.current.future).toEqual([])

  // undo
  act(() => {
    result.current.undo()
  })

  // assert "undone" state
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(true)
  expect(result.current.past).toEqual(['one'])
  expect(result.current.present).toEqual('two')
  expect(result.current.future).toEqual(['three'])

  // undo again
  act(() => {
    result.current.undo()
  })

  // assert "double-undone" state
  expect(result.current.canUndo).toBe(false)
  expect(result.current.canRedo).toBe(true)
  expect(result.current.past).toEqual([])
  expect(result.current.present).toEqual('one')
  expect(result.current.future).toEqual(['two', 'three'])

  // redo
  act(() => {
    result.current.redo()
  })

  // assert undo + undo + redo state
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(true)
  expect(result.current.past).toEqual(['one'])
  expect(result.current.present).toEqual('two')
  expect(result.current.future).toEqual(['three'])

  // add fourth value
  act(() => {
    result.current.set('four')
  })

  // assert final state (note the lack of "third")
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(false)
  expect(result.current.past).toEqual(['one', 'two'])
  expect(result.current.present).toEqual('four')
  expect(result.current.future).toEqual([])
})
```

你会发现它用起来很像我们自己写的 `setup` 函数。实际上，`@testing-library/react-hooks` 底层也是做了一些和我们上面 `setup` 类似的事。`@testing-library/react-hooks` 还提供了如何内容：

* 一套用来 “rerender” 使用 Hook 的组件的工具函数（用来测试依赖项变更的情况）
* 一套用来 “unmount” 使用 Hook 的组件的工具函数（用来测试清除副作用的情况）
* 一些用来等待指定时间的异步工具方法（可以测异步逻辑）

> 注意，你可以把所有的 Hooks 都放在 `renderHook` 的回调里来一次性地调用，然后就能一次测多个 Hooks 了

如果非要用写 “Test Component” 的方法来支持上面的功能，你要写非常多容易出错的模板代码，而且你会花大量时间在编写和测试你的 “Test Component”，而不是你真正想测的东西。

## 总结

还是说明一下，如果我只对特定的 `useUndo` Hook 做测试，我会使用真实环境的用例来测，因为我觉得它能在易懂性和用例覆盖之间可以取得一个很好的平衡。当然，肯定会有更复杂的 Hooks，使用 `@testing-library/react-hooks` 则更有用。

---

**好了，这篇外文就给大家带到这里了。这篇文章也给我们带来了两种测试 Hooks 的思路：使用 Test Componet 以及 `@testing-library/react-hooks`。对我来说，因为项目里的 Hooks 偏工具类，所以我可能会选用第二种方法来做测试。希望也能给小伙伴们带来一些启发和思考。**

**如果你喜欢我的分享，可以来一波一键三连，点赞、在看就是我最大的动力，比心 ❤️**
