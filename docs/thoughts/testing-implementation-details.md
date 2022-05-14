# 为什么不要测代码实现细节

## 前言

哈喽，大家好，我是海怪。

相信不少同学在写单测的时候，最大的困扰不是如何写测试代码，而是：**“应该测什么？”，“要测多深入”，“哪些不该测”**。

最近在给 React 组件写单测的时候，发现了 Kent （React Testing Library 的贡献者之一）的 [《Testing Implementation Details》](https://kentcdodds.com/blog/testing-implementation-details) 这篇文章，里面对 **“为什么不要测代码实现细节？”** 这个问题写得非常好，今天就把这篇文章也分享给大家。

> 翻译中会尽量用更地道的语言，这也意味着会给原文加一层 Buf，想看原文的可点击 [这里](https://kentcdodds.com/blog/testing-implementation-details "原文")。

---

## 开始

我以前用 [enzyme](https://enzymejs.github.io/enzyme/#enzyme) 的时候，都会尽量避免使用某些 API，比如 `shallow rendering`、`instance()`、`state()` 以及 `find('ComponentName')`，而且 Review 别人的 PR 的时候，也会跟他们说尽量别用这些 API。**这样做的原因主要是因为这些 API 会测到很多代码的实现细节 (Implementation Details)。** 然后，很多人又会问：为什么不要测 **代码的实现细节（Implemantation Details）** 呢？很简单：测试本身就很困难了，我们不应该再弄那么多规则来让测试变得更复杂。

## 为什么测试“实现细节”是不好的？

为什么测试实现细节是不好的呢？主要有两个原因：

* **假错误（False Negative）**：重构的时候代码运行成功，但测试用例崩了
* **假正确（False Positive）**：应用代码真的崩了的时候，然而测试用例又通过了

> 注：这里的测试是指：“确定软件是否工作”。如果测试通过，那么就是 Positive，代码能用。如果测试失败，则是 Negative，代码不可用。**而这里的的 False 是指“不正确”，即不正确的测试结果**。

如果上面没看懂，没关系，下面我们一个一个来讲，先来看这个手风琴组件（Accordion):

```js
// Accordion.js
import * as React from 'react'
import AccordionContents from './accordion-contents'

class Accordion extends React.Component {
  state = {openIndex: 0}
  setOpenIndex = openIndex => this.setState({openIndex})
  render() {
    const {openIndex} = this.state
    return (
      <div>
        {this.props.items.map((item, index) => (
          <>
            <button onClick={() => this.setOpenIndex(index)}>
              {item.title}
            </button>
            {index === openIndex ? (
              <AccordionContents>{item.contents}</AccordionContents>
            ) : null}
          </>
        ))}
      </div>
    )
  }
}

export default Accordion
```

看到这肯定有人会说：为什么还在用过时了的 Class Component 写法，而不是用 Function Component 写法呢？别急，继续往下看，你会发现一些很有意思的事（相信用过 Enzymes 的人应该能猜到会是什么）。

下面是一份测试代码，对上面 `Accordion` 组件里 “实现细节” 进行测试：

```js
// __tests__/accordion.enzyme.js
import * as React from 'react'
// 为什么不用 shadow render，请看 https://kcd.im/shallow
import Enzyme, {mount} from 'enzyme'
import EnzymeAdapter from 'enzyme-adapter-react-16'
import Accordion from '../accordion'

// 设置 Enzymes 的 Adpater
Enzyme.configure({adapter: new EnzymeAdapter()})

test('setOpenIndex sets the open index state properly', () => {
  const wrapper = mount(<Accordion items={[]} />)
  expect(wrapper.state('openIndex')).toBe(0)
  wrapper.instance().setOpenIndex(1)
  expect(wrapper.state('openIndex')).toBe(1)
})

test('Accordion renders AccordionContents with the item contents', () => {
  const hats = {title: 'Favorite Hats', contents: 'Fedoras are classy'}
  const footware = {
    title: 'Favorite Footware',
    contents: 'Flipflops are the best',
  }
  const wrapper = mount(<Accordion items={[hats, footware]} />)
  expect(wrapper.find('AccordionContents').props().children).toBe(hats.contents)
})
```

相信有不少同学会用 Enzyme 写过上面类似的代码。好，现在让我们来搞点事情...

## 重构中的 “假错误”

我知道大多数人都不喜欢写测试，特别是写 UI 测试。原因千千万，但其中我听得最多的一个原因就是：**大部分人会花特别多的时间来伺候这些测试代码（指测试实现细节的测试代码）。**

> 每次我改点东西，测试都会崩！—— 心声

一旦测试代码写得不好，会严重拖垮你的开发效率。下面来看看这类的测试代码会产生怎样的问题。

假如说，现在我们要 **将这个组件重构成可以展开多个 Item**，而且这个改动只能改变代码的实现，不影响现有的组件行为。得到重构后代码是这样的：

```js
class Accordion extends React.Component {
  state = {openIndexes: [0]}
  setOpenIndex = openIndex => this.setState({openIndexes: [openIndex]})
  render() {
    const {openIndexes} = this.state
    return (
      <div>
        {this.props.items.map((item, index) => (
          <>
            <button onClick={() => this.setOpenIndex(index)}>
              {item.title}
            </button>
            {openIndexes.includes(index) ? (
              <AccordionContents>{item.contents}</AccordionContents>
            ) : null}
          </>
        ))}
      </div>
    )
  }
}
```

上面将 `openIndex` 改成 `openIndexes`，让 `Accordion` 可以一次展示多个 `AccordionContents`。看起来非常完美，而且在 UI 真实的使用场景中也没任何问题，但当我们回去跑一下测试用例，💥kaboom💥，会发现 `setOpenIndex sets the open index state properly` 这个测试用例直接报错：

```
expect(received).toBe(expected)

Expected value to be (using ===):
  0
Received:
  undefined
```

**由于我们把 `openIndex` 改成 `openIndexes`，所以在测试中 `openIndex` 的值就变成了 `undefined` 了。** 可是，这个报错是真的能说明我们的组件有问题么？No！在真实环境下，组件用得好好的。

**这种情况就是上面所说的 “假错误”。** 它的意思是测试用例虽然失败了，但它是因为测试代码有问题所以崩了，并不是因为业务代码/应用代码导致崩溃了。

好，我们来把它修复一下，把原来的 `toEqual(0)` 改成 `toEqual([0])`，把 `toEqual(1)` 改成 `toEqual([1])`：

```js
test('setOpenIndex sets the open index state properly', () => {
  const wrapper = mount(<Accordion items={[]} />)
  expect(wrapper.state('openIndexes')).toEqual([0])
  wrapper.instance().setOpenIndex(1)
  expect(wrapper.state('openIndexes')).toEqual([1])
})
```

小结一下：**当重构的时候，这些测试“实现细节”的测试用例很可能出现 “假错误”，导致出现很多难维护、烦人的测试代码。**

## “假正确”

好，现在我们来看另一种情况 “假正确”。假如现在你同事看到这段代码

```html
<button onClick={() => this.setOpenIndex(index)}>{item.title}</button>
```

他觉得：每次渲染都要生成一个 `() => this.setOpenIndex(index)` 函数太影响性能了，我们要尽量减少重新生成函数的次数，直接用第一次定义好的函数就好了，然后就改成了这样：

```html
<button onClick={this.setOpenIndex}>{item.title}</button>
```

一跑测试，唉，完美通过了~ ✅✅，没到浏览器去跑跑页面就把代码提交了，等别人一拉代码，页面又不能用了。（如果大家不清楚这里为什么不能用 `onClick={this.setOpenIndex}` 可以搜一下 Class Component `onClick` 的 `bind` 操作）。

那这里的问题是什么呢？我们不是已经有一个测试用例来证明 “只要 `setOpenIndex` 调用了，状态就会改变” 了么？对！有。**但是，这并不能证明 `setOpenIndex` 是真的绑定到了 `<button/>` 的 `onClick` 上！所以我们还要另外再写一个测试用例来测 `setOpenIndex` 真的绑到 `onClick` 了。**。

大家发现问题了么？因为我们只测了业务中非常小的一个实现细节，所以为测这个实现细节，我们不得不补另外很多测试用例，来测其它毫不相关的实现细节，那这样我们永远都不可能补完所有实现细节的测试代码。

**这就是上面说的 “假正确”。** 它是指，在我们跑测试时用例都通过了，但实际上业务代码/应用代码里是有问题的，用例是应该要抛出错误的！那我们应该怎么才能覆盖这些情况呢？好吧，那我们只能又写一个测试来保证 “点击按钮后可以正常更新状态”。然后呢，我们还得添加一个 100% 的覆盖率指标，这样才能完美保证不会有问题。还要写一些 ESLint 的插件来防止其它人来用这些 API。

算了，给这些 “假正确” 和 “假错误” 打补丁，还不如不写测试，把这些测试都干了得了。如果有一个工具可以解决这个问题不是更好吗？是的，有的！

## 不再测试实现细节

当然你也可能用 Enzyme 去重写这些测试用例，然后限制其它人别用上面这些 API，但是我可能会选择 [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)，因为它的 API 本身限制了开发者，如果有人想用它来做 “实现细节” 的测试，这将会非常困难。

下面我们来看看 RTL 是怎么做测试的吧：

```js
// __tests__/accordion.rtl.js
import '@testing-library/jest-dom/extend-expect'
import * as React from 'react'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Accordion from '../accordion'

test('can open accordion items to see the contents', () => {
  const hats = {title: 'Favorite Hats', contents: 'Fedoras are classy'}
  const footware = {
    title: 'Favorite Footware',
    contents: 'Flipflops are the best',
  }
  render(<Accordion items={[hats, footware]} />)

  expect(screen.getByText(hats.contents)).toBeInTheDocument()
  expect(screen.queryByText(footware.contents)).not.toBeInTheDocument()

  userEvent.click(screen.getByText(footware.title))

  expect(screen.getByText(footware.contents)).toBeInTheDocument()
  expect(screen.queryByText(hats.contents)).not.toBeInTheDocument()
})
```

只需一个测试用例就可以验证所有的组件行为。无论有没有调用 `openIndex`、`openIndexes` 还是 `tacosAreTasty`，用例都会通过。这样就可以解决这些 “假错误” 了。如果没有正确绑定 `onClick` 点击事件，也会报错。这样也可以解决 “假正确” 的问题。**好处是，我们不再需要记住那些复杂的实现逻辑，只要关注理想情况下组件的使用行为，就可以测出用户使用的真实场景了。**

## 到底什么才是实现细节（Implementation Details）

简单来说就是：

> 实现细节（Implementaion Details）就是：使用你代码的人不会用到、看到、知道的东西。

那谁才是我们代码的用户呢？第一种就是跟页面交互的真实用户。第二种则是使用这些代码的开发者。**对 React Component 来说，用户则是可以分为 End User 和 Developer，我们只需要关注这两即可** 。

接下来的问题就是：我们代码中的哪部分是这两类用户会看到、用到和知道的呢？对 End User 来说，他们只会和 `render` 函数里的内容有交互。而 Developer 则会和组件传入的 `Props` 有交互。**所以，我们的测试用例只和传入的 `Props` 以及输出内容的 `render` 函数进行交互就够了。**

这也正是 React Testing Library 的测试思路：把 Mock 的 `Props` 传给 `Accordion` 组件，然后通过 RTL 的 API 来验证 `render` 函数输出的内容、测试 `<button/>` 的点击事件。

现在回过头再来看 Enzyme 这个库，开发者一般都是用它来访问 `state` 和 `openIndex` 来做测试。这其实对上面提到的两类用户来说，都是毫无意义的，因为他们根本不需要知道什么函数被调用了、哪个 `index` 被改了、`index` 是存成数组了还是字符串。然而 Enzyme 的测试用例基本都是在测这些别人根本不 care 的内容。

这也是为什么 Enzyme 测试用例为什么这么容易出现 “假错误”，因为 **当用它来写一些 End User 和 Developer 都不 care 的测试用例时，我们实际上是在创造第三个用户视角：Tests 本身！**。而 Tests 这个用户，正好是谁都不会 care 的那个。所以，自动化测试应该只服务于生产环境的用户而不是这个谁都不会 care 的第三者。

> 当你的测试和你软件使用方式越相似，那么它能给你的信心就越大 —— Kent

## React Hooks？

不使用 Enzyme 的另一个原因是 [Enzyme 在 React Hooks 使用上有很多问题](https://github.com/enzymejs/enzyme/issues/2263)。事实证明，当测试代码 “实现细节” 时，“实现细节” 的中的任何修改都会对测试有很大的影响。这是个很大的问题，因为如果你从 Class Component 迁移到 Function Component，你的测试用例是很难保证你会不会搞崩里面哪些东西的。 React Testing Library 则可以很好地避免这些问题。

> Implementation detail free and refactor friendly.


![](https://files.mdnice.com/user/24913/2f0ccf68-41cc-4f4d-8df0-af1d6b9fb73c.gif)

## 总结

我们应该如何避免测试 “实现细节” 呢？首是是要用正确的工具，比如 React Testing Library :)

如果你还是不知道应该测试什么，可以跟着下面这个流程走一波：

* 如果崩了，哪些没有测试过的代码影响最严重？（检查流程）
* 尽量将测试用例缩小到一个单元或几个代码单元（比如：按下结账按钮，会发一个 /checkout 请求）
* 思考一下谁是这部分代码的真实用户？（比如：Developer 拿来渲染结账表单，End User 会用它操作点击按钮）
* 给使用者写一份操作清单，并手动测试确认功能正常（用假数据在购物车中渲染表单，点击结账按钮，确保假 /checkout 请求执行，并获取成功的响应，确保可以展示成功消息）
* 将这份手动操作清单转化成自动化测试

---

**好了，这篇外文就给大家带到这里了，希望对大家在单测中有所帮助。总的来说，在测试组件方面应该更多关注 `Props` 以及 `render` 出来的内容。测试 “实现细节” 有点像我们撒谎，一次撒谎就要撒更多的谎来圆第一个谎，当我们在测试一个细节的时候，我们只能管中窥豹，这无形中会产生一个不存在的用户：Test，这也是为什么很多人觉得代码一改，测试也得改的原因。**

**如果你喜欢我的分享，可以来一波一键三连，点赞、在看就是我最大的动力，比心 ❤️**
