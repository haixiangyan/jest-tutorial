# 怎么测 render props

## 前言

哈喽，大家好，我是海怪。

最近算是把测试引入到项目里了，不过在测试 React 组件的时候，我发现在测一些 `renderXXX` 的 `props` 时非常难测。比如像下面这样的：

```html
<ErrorBoundary renderContent={() => <span>hello</span>}></ErrorBoundary>
```

难的地方面于你不仅要构造这样的 `renderXXX` 函数，然后传给组件，而且还要做一些 Stub 操作，把参数传给它。而我正好在 [Kent C. Dodds](https://kentcdodds.com/ "Kent C. Dodds") 的博客上看到这篇文章 [《Testing ⚛️ components using render props》](https://kentcdodds.com/blog/testing-components-using-render-props "《Testing ⚛️ components using render props》")，在这篇文章解决了我上面对 “如何测试 render Props” 的问题。所以，今天就把这篇文章也分享给大家，希望能给大家一些参考。

> 翻译中会尽量用更地道的语言，这也意味着会给原文加一层 Buf，想看原文的可点击 [这里](https://kentcdodds.com/blog/testing-components-using-render-props "原文")。

---

## 正片开始

在准备这篇文章前，我写了一个 [Repo](https://github.com/kentcdodds/test-render-prop-example) 放在 Github 上，如果你想了解更多细节打开看看。里面主要有一个 `FruitAutocomplete` 组件，下面是它的代码实现：

```jsx
import * as React from 'react'
import {render} from 'react-dom'
import Downshift from 'downshift'

const items = ['apple', 'pear', 'orange', 'grape', 'banana']

function FruitAutocomplete({onChange}) {
  return (
    <Downshift
      onChange={onChange}
      render={({
        getInputProps,
        getItemProps,
        getLabelProps,
        isOpen,
        inputValue,
        highlightedIndex,
        selectedItem,
      }) => (
        <div>
          <label {...getLabelProps()}>Enter a fruit</label>
          <input {...getInputProps()} />
          {isOpen ? (
            <div data-test="menu">
              {items
                .filter(i => !inputValue || i.includes(inputValue))
                .map((item, index) => (
                  <div
                    {...getItemProps({
                      key: item,
                      'data-test': `item-${item}`,
                      index,
                      item,
                      style: {
                        backgroundColor:
                          highlightedIndex === index ? 'lightgray' : 'white',
                        fontWeight: selectedItem === item ? 'bold' : 'normal',
                      },
                    })}
                  >
                    {item}
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      )}
    />
  )
}

export default FruitAutocomplete
```

## 端对端测试

首先，我想说的是 `render props` 其实是代码的实现细节。所以，如果你直接写 E2E 测试（比如用 [Cypress.io](http://cypress.io/)），那不管你要测 `render props` 还是别的，其实都一样的，没区别。你只需要跟渲染出来的组件进行交互就可以了（输入文本，选择选项等）。看起来好像就是这么回事，但这其实引出了一个非常重要的观点：**当你越往 [“测试金字塔”](https://martinfowler.com/bliki/TestPyramid.html) 的上面走，代码的实现细节就越不重要。而如果往下走，你就越要处理更多代码实现细节。**


![](https://files.mdnice.com/user/24913/325cca35-58b7-4f16-8d4f-f9c6b3376efe.jpg)

## 集成测试

所以说，[我会更推荐用集成测试](https://kentcdodds.com/blog/write-tests)。在集成测试中，你同样不需要对要测的组件改动太多。下面是 Repo 里写的集成测试。你会发现，下面没有一行代码表明 `FruitAutocomplete` 组件是使用 render prop 组件（实现细节）实现的：

```js
import * as React from 'react'
import {mount} from 'enzyme'
import FruitAutocomplete from '../fruit-autocomplete'

// 一些工具函数
// sel 函数的解释可以看另一篇文章：http://kcd.im/sel-util
const sel = id => `[data-test="${id}"]`
const hasMenu = wrapper => wrapper.find(sel('menu')).length === 1

test('menu is closed by default', () => {
  const wrapper = mount(<FruitAutocomplete />)
  expect(hasMenu(wrapper)).toBe(false)
})

test('lists fruit with a keydown of ArrowDown on the input', () => {
  const wrapper = mount(<FruitAutocomplete />)
  const input = wrapper.find('input')
  input.simulate('keydown', {key: 'ArrowDown'})
  expect(hasMenu(wrapper)).toBe(true)
})

test('can search for and select "banana"', () => {
  const onChange = jest.fn()
  const wrapper = mount(<FruitAutocomplete onChange={onChange} />)
  const input = wrapper.find('input')
  input.simulate('change', {target: {value: 'banana'}})
  input.simulate('keydown', {key: 'ArrowDown'})
  input.simulate('keydown', {key: 'Enter'})
  expect(onChange).toHaveBeenCalledTimes(1)
  const downshift = expect.any(Object)
  expect(onChange).toHaveBeenCalledWith('banana', downshift)
  expect(input.instance().value).toBe('banana')
})
```

**所以说，我们要如何测试带有 render props 的组件呢？** 很简单，如果你用了 E2E 或者集成测试，你几乎不需要做额外的操作，只要挂载你的组件然后跟它正常交互就可以了。这里要注意的是 `downshift` 导出的 `<Downshift/>` 组件是已经测好的了，你不用给它已有的交互逻辑写集成测试，只关注你自己的组件就可以了。所以，下面是我的建议：**想要很好地测试有 `render props` 的组件，那么可以给组件做一些高层次的测试。**

## 单元测试

然而，做单元测试就有点棘手了。如果你不想在测试中引入 `<Downshift/>` 第三方组件，那你要就自己构造一个 `render` 函数，然后把它传给 `render` 这个 Props。有下面几种方法可以做到：

第一种最直接的做法就是在别的地方声明函数，然后把导出：

```jsx
function FruitAutocomplete({onChange}) {
  return <Downshift onChange={onChange} render={fruitAutocompleteRender} />
}

// 注意：这不是真的组件，这只是一个有点像函数组件的函数而已
// 它不会转译成 React.createElement，所以只是一个返回 JSX 的纯函数
function fruitAutocompleteRender(arg) {
  return <div>{/* 要渲染的内容 */}</div>
}

export {fruitAutocompleteRender}
export default FruitAutocomplete
```

好了，现在你就可以直接在你的测试中引入它，然后用它来渲染 JSX：

```jsx
import * as React from 'react'
import {render} from 'enzyme'

const downshiftStub = {
  isOpen: false,
  getLabelProps: p => p,
  getInputProps: p => p,
  getItemProps: p => p,
}

const sel = id => `[data-test="${id}"]`
const hasMenu = wrapper => wrapper.find(sel('menu')).length === 1
const hasItem = (wrapper, item) =>
  wrapper.find(sel(`item-${item}`)).length === 1
const renderFruitAutocompleteRenderer = props =>
  render(fruitAutocompleteRender({...downshiftStub, ...props}))

test('shows no menu when isOpen is false', () => {
  const wrapper = renderFruitAutocompleteRenderer({isOpen: false})
  expect(hasMenu(wrapper)).toBe(false)
})

test('shows the menu when isOpen is true', () => {
  const wrapper = renderFruitAutocompleteRenderer({isOpen: true})
  expect(hasMenu(wrapper)).toBe(true)
})

test('when the inputValue is banana, it shows banana', () => {
  const wrapper = renderFruitAutocompleteRenderer({
    isOpen: true,
    inputValue: 'banana',
  })
  expect(hasItem(wrapper, 'banana')).toBe(true)
})
```

这样做确实没问题，不过有几点要注意：
* 这么做要新增代码是不多的，而且看起来是比较简单的
* 但是，我们要构造 `<Downshift/>` 组件传给我们的参数（译注：也即 `render props` 函数的参数）
* 我们要把 `render props` 的函数提取出来声明在一个地方并导出它

上面第二点一直很困扰我。当然，有一种方法可以在不提取和导出它的情况下获取 render Props。下面是最终解法，这看起来就像没有导出 `render props` 的函数一样：

```jsx
import * as React from 'react'
import {mount, render} from 'enzyme'
import Downshift from 'downshift'
import FruitAutocomplete from '../fruit-autocomplete'

const downshiftStub = {
  isOpen: false,
  getLabelProps: p => p,
  getInputProps: p => p,
  getItemProps: p => p,
}

test('when the inputValue is banana, it shows banana', () => {
  const fruitAutocompleteRender = mount(<FruitAutocomplete />)
    .find(Downshift)
    .prop('render')
  const wrapper = render(
    fruitAutocompleteRender({
      ...downshiftStub,
      isOpen: true,
      inputValue: 'banana',
    }),
  )
  expect(hasItem(wrapper, 'banana')).toBe(true)
})
```

不过我不是很喜欢这样的做法，因为我不想说：“嗨，`FruitAutocomplete`，我知道你要用 `Downshift` 然后 `Downshift` 有一个 Props 叫 `render`”。对于我来说，我觉得这样过度测试代码细节了。

而且，这依然要给 `<Downshift/>` 传给 `render props` 的参数做 Stub。

当然我们还有一种方法就是把用 `jest.mock` 把 `downshift` 整个模块给 Mock 了。但不想写这个例子了，因为这也不是什么好方法。

## 总结

所以，面对这种情况，我会建议你直接上集成测试就可以了，不要尝试用单测来测你的 render function。我觉得这么做，你会对你的代码更有信心。

---

**好了，这篇外文就给大家带到这里了。从这篇文章可以看出：单测并不是前端测试中的银弹。当我们抓破头皮去构造单测环境时，很可能你在往错误的方向走——过度关注代码实现。对于一些复杂的单测环境，最好的方式是集成或者 E2E，它能让你站在真实用户角度去使用自己的组件、代码。**

**如果你喜欢我的分享，可以来一波一键三连，点赞、在看就是我最大的动力，比心 ❤️**
