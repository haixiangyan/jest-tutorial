# 模拟时间

有的同学可能会问：`jest` 最强大的不是各种 Mock 么？怎么现在一个都还没见到？所以这一章就给大家讲讲关于时间的 Mock，这会比你想像的要更复杂一点。

## 使用 Fake Timers

我们先看看官网的示例：现在要写一个函数 `src/utils/after1000ms.ts`，它可以在 1000ms 后执行传入的 `callback`：

```ts
type AnyFunction = (...args: any[]) => any;

const after1000ms = (callback: AnyFunction) => {
  console.log("准备计时");
  setTimeout(() => {
    console.log("午时已到");
    callback && callback();
  }, 1000);
};

export default after1000ms;
```

如果不 Mock 时间，那么我们就得写这样的用例，需要等 1000ms 后才能做断言：

```ts
import after1000ms from "utils/after1000ms";

describe("after1000ms", () => {
  it("可以在 1000ms 后自动执行函数", (done) => {
    after1000ms(() => {
      expect("???");
      done();
    });
  });
});
```

是不是发现问题了：在 `callback` 里应该要 `expect` 什么东西呢？而且我们还必须死等 1 秒才能跑这完这个用例。
添加 `tests/utils/after1000ms.test.ts`，我们来看看官方的解决方法：

```ts
import after1000ms from "utils/after1000ms";

describe("after1000ms", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it("可以在 1000ms 后自动执行函数", () => {
    jest.spyOn(global, "setTimeout");

    after1000ms();

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
```

这个用例很直观，在用例执行前先用 `jest.useFakeTimers` 来 Mock 时间，并监听 `setTimeout`，然后在执行 `after1000ms` 后，
最后对 `setTimeout` 的调用做了一些断言。虽然我们跑这个用例是成功的。**不过，我们依然有种惴惴不安的感觉。**

## 快进时间

没关系，我们来继续研究这个例子。上面这么测并不靠谱，因为 `after1000ms` 最重要的部分就是要看 `1000ms` 后是否真的执行了 `callback`，
所以对 `setTimeout` 的断言只是一种间接测试的手段。那该如何测函数是否被调用呢？官方给出下面的解决方案：

```ts
import after1000ms from "utils/after1000ms";

describe("after1000ms", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it("可以在 1000ms 后自动执行函数", () => {
    jest.spyOn(global, "setTimeout");
    const callback = jest.fn();
    
    expect(callback).not.toHaveBeenCalled();

    after1000ms(callback);

    jest.runAllTimers();

    expect(callback).toHaveBeenCalled();
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
```

这次的用例中，我们用 `jest.fn` 生成了一个监听函数（假函数），然后马上断言这个函数是没有被调用过的。
调用了 `after1000ms` 之后用 `jest.runAllTimers` 快进所有时间，最终判断 `callback` 是否只被调用了 1 次。

虽然这个测试用例也成功了，但是这次的不安感更强烈了，**实际上，我们并不清楚这里的 `Fake Timer` 到底 `Fake` 在什么地方，也不知道这段代码在时间上的调用顺序是怎样的。
我们只是很直观地认为 `执行 -> 快进 -> 断言` 是合理的，但这并没有理论依据支撑这样的现实，导致我们不敢用 Fake Timers！**

## Fake Timers 机制的猜测

不过通过上面这个用例，我们多少能猜得出：`jest` **好像** 会用一个数组记录 `callback`，然后在 `jest.runAllTimers` 时把数组里的 `callback` 都执行，
伪代码可能是这样的：

```ts
setTimeout(callback) // Mock 的背后 -> callbackList.push(callback)

jest.runAllTimers() // 实现 -> callbackList.forEach(callback => callback())
```

而 `setTimeout` 本质上不也是用一个 "小本本" 记录这些 `callback`，然后在 `1000ms` 后执行。所以说，`jest.useFakeTimers` 时，
调用 `setTimeout` 会把 `callback` 记录到 `jest ` 自己的 "小本本" 上而不是记录到 `setTimeout` 的 "小本本"，所以 `callback` 执行的时机也从 `1000ms` 后
变成了什么时候 `jest` 会执行自己的 "小本本"。`jest` 提供给我们的就是这个执行 "小本本" 的时机按钮。

好，现在我们来看官网里 `jest.useFakeTimers` 的作用介绍：`Fake Timers` 会把以下 API 全部替换成用模拟时钟的 `jest` 实现：

```ts
type FakeableAPI =
  | 'Date'
  | 'hrtime'
  | 'nextTick'
  | 'performance'
  | 'queueMicrotask'
  | 'requestAnimationFrame'
  | 'cancelAnimationFrame'
  | 'requestIdleCallback'
  | 'cancelIdleCallback'
  | 'setImmediate'
  | 'clearImmediate'
  | 'setInterval'
  | 'clearInterval'
  | 'setTimeout'
  | 'clearTimeout';
```

虽然我们现在搞明白了 `useFakeTimers` 的原理，但是对于 `Fake Timers` 这个概念依然有点模糊。没关系，我们来看下面这个例子，这将解开你对 `Fake Timers` 的所有谜团。

## sleep

学过 Java 的同学都知道 Java 有一个 `sleep` 方法，可以让程序睡上个几秒再继续做别的，但是 JavaScript 并没有这样的函数。
不过我们可以利用 `Promise` 以及 `setTimeout` 来实现类似的效果，添加 `tests/utils/sleep.ts`，在里面写一个 `sleep` 函数：

```ts
const sleep = (ms: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  })
}

export default sleep;

// 简单点可以写成一行
// const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
```

理想中，我们会这么用：

```ts
console.log('开始'); // 准备

await sleep(1000); // 睡 1 秒

console.log('结束'); // 睡醒
```

在写测试时，我们可以写一个内置 `act` 函数来构造这样的使用场景：

```ts
import sleep from "utils/sleep";

describe('sleep', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  })

  it('可以睡眠 1000ms', async () => {
    const callback = jest.fn();

    const act = async () => {
      await sleep(1000)
      callback();
    }

    act()

    expect(callback).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(callback).toHaveBeenCalledTimes(1);
  })
})
```

然而，当我们跑这个用例时会发现最后一行的 `expect(callback).toHaveBeenCalledTimes(1);` 会报错：

![](./sleep-error.png)

啊？不是说好 `jest.runAllTimers` 就把 `setTimeout` 里的 `callback` 都执行了么？怎么在这个例子不行呢？
或许有的同学会头铁地在 `act` 前加个 `await`，变成：

```ts
await act()

expect(callback).not.toHaveBeenCalled();

jest.runAllTimers();

expect(callback).toHaveBeenCalledTimes(1);
```

这次更离谱，直接说我们测试用例超时了：

![](./sleep-timeout-error.png)

## Event Loop

如果你不能马上发现上面报错的原因，那么你其实并不理解 JavaScript 的执行顺序，所以要解释这两个报错，我们还得从 `Event Loop` 说起。

说到面试八股文的送分题 `Event Loop`，大家应该都很熟了。但我看掘金上对它的解释都太学术和复杂了，又同步又异步，又宏任务又微任务，光是概念就要记好多。
所以我这里说一个简单的版本。

### Message Queue

JavaScript 使用一个 `Message Queue` 来执行代码，只有一个 `Message` 执行完了才能执行下一个。这里的 `Message` 就是我们看到的 JavaScript 代码。
而 `setTimeout`, `setImmediate` 则是负责把 `callback` 作为 `Message` 添加到 `Queue` 里，毕竟 `callback` 也是 JavaScript 代码嘛。

举个例子，对下面的代码：

```js
console.log(1)
setTimeout(() => callback(), 0)
console.log(2)
```

它的 `Message Queue` 是这样的：

![](./message-queue.png)

### Job Queue

在 ES6 引入了 `Job Queue`，其中一个 `Job Queue` 就是 `Promise Jobs`，这里的 Job 存放的是 Promise resolve 后的的 Job（任务）。
**在这个队列的所有 Job 会在当前 `Message` 完成后且下一个 `Message` 开始前执行。** `then(callback)` 的作用就是在 Promise resolve 后把 `callback` 作为 Job
推入 `Promise Jobs`。

比如下面的代码：

```js
console.log(1)
hello().then(() => callback())
console.log(2)
```

它的 `Message Queue` 和 `Promise Jobs Queue` 分别是：

![](./job-queue.png)

### async / await

`async / await` 则是使用 `Promise` 的语法糖，`async` 会返回一个 Promise，而 `await` 则会把剩下的代码包裹在 `then` 的回调里，比如：

```ts
await hello()
console.log(1)

// 相当于
hello().then(() => {
  console.log(1)
})
```

### 小结

所以，总的来说：

1. 对于一份要执行的 JavaScript 代码，它本身就是一个 `Message`，会立马推入 `Message Queue` 中来消费。
2. 如果这段代码里有 `setTimeout`，那么会把它回调函数里的 JavaScript 代码片段作为新的 `Message` 再推入 `Message Queue` 中进行等待。
3. 如果这段代码里有 `Promise`，那么会把 `then` 里的代码片段作为 `Job` 推入 `Promise Job Queue` 中等待。
4. 当这段代码（第1步）执行完后，推出这个 `Message`，执行 `Promise Job Queue` 的内容（`then` 的回调），然后再来执行下一个 `Message`（`setTimeout` 的回调）。

所以，你经常会听到别人说先执行完同步代码再执行异步代码，它的原理就是 `Event Loop` 的执行机制。现在，来考考你下面这段代码的执行顺序是怎样的：

```js
test('执行顺序', async () => {
  console.log('1');
  setTimeout(() => { console.log('6'); }, 0);
  const promise = new Promise(resolve => {
    console.log('2');
    resolve();
  }).then(() => {
    console.log('4');
  });
  console.log('3');
  await promise;
  console.log('5');
});
```

正确答案：`1, 2, 3, 4, 5, 6`，解释一下：

| 顺序                                                             | Message Queue         | Promise Jobs Queue |
|----------------------------------------------------------------|-----------------------|--------------------|
| 同步代码，打印 `1`                                                    | `[test('执行顺序')]`      | `[]`               |
| `new Promise(fn)` 里的 `fn` 也为同步代码，打印 `2`                        | `[test('执行顺序')]`      | `[]`               |
| `setTimeout` 把 `6` 作为 `Message` 推入 `Message Queue`             | `[test('执行顺序'), '6']` | `[]`               | 
| Promise 中有 `resolve`，且有 `then`，把 `push('4')` 作为 Job 推到 Promise | `[test('执行顺序'), '6']` | `['4']`            |
| 同步代码，打印 `3`                                                    | `[test('执行顺序'), '6']` | `['4']`            |
| 有 `await`，把 `5` 推入 `Promise Job Queue`                         | `[test('执行顺序'), '6']` | `['4', '5']`       |
| 清算 `Promise Job Queue`，打印 `4`, `5`                             | `['6']`               | `[]`               |
| 开始 `Message Queue` 的下一个 `Message`，打印 `6`                       | `[]`                  | `[]`               |

**从这里我们也可以看出，`jest` 的 `Fake Timer` 也是一个 `Queue`，只不过它会在 `setTimeout` 时把 `Message` 记录到它自己的 `Queue` 中。
这样一来，我们就可以在同步执行代码中用 `jest.runAllTimers` 来决定是否要一次清算所有 `Message`（回调）。**

## 为什么报错

现在回过头来看看我们的测试用例。

### 没有调用 `callback` 的问题

对于第一种写法，我们使用了语法糖 `await`，也可以写成这样：

```ts
describe('sleep', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  })

  it('可以睡眠 1000ms', async () => {
    const callback = jest.fn();

    sleep(1000).then(() => {
      callback()
    })

    expect(callback).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(callback).toHaveBeenCalledTimes(1);
  })
})
```

这里用了 `Fake Timer`，所以 `setTimeout` 会替换成了 `jest` 的 `setTimeout`，执行 `sleep(1000)` 之后，
`jest` 自己的 `Queue` 里会推入一个当前 Promise 的 `resolve` 函数。

由于后面还跟了一个 `then`，所以会把 `callback` 放到 `Promise Job Queue` 里，不过这时同步代码（当前 `Message`）还没执行完。

然后走到第一个 `expect` 通过，再走到 `jest.runAllTimers` ，**此时会同步地执行 `jest` 中的 `Queue` 所有东西，也即同步执行了 `resolve`。**

但是此时，当前 `Message` 还没走完，会走到最后一个 `expect`。由于我们的 `callback` 一直在 `Promise Job Queue` 里，
所以当执行最后一个 `expect` 时还不能调用 `callback`，最终测试用例不通过。

### 超时问题

对于第二种写法，我们也可以简化成如下代码：

```ts
describe('sleep', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  })

  it('可以睡眠 1000ms', async () => {
    const callback = jest.fn();

    sleep(1000).then(() => {
      callback()
    }).then(() => {
      expect(callback).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(callback).toHaveBeenCalledTimes(1);
    })
      // 隐藏的 then
      .then(() => { 结束本次测试的Jest代码 })
  })
})
```

`setTimeout` 把 `resolve` 推入 `jest` 自己的 `Queue` 这一步依然不变。

我们看到有两个 `then`，所以只要 `sleep` 中的 `resolve` 调用了，未来 `Promise Job Queue` 会推入两个 Jobs：`callback` 和 `expect...`。
实际上这里还有一个隐藏的 `then`，它的内容就是结束本次测试的代码，所以未来一共有 3 个 `Promise Job`。

然而，执行完成的同步代码后当前的 `Message` 也结束了，准备开始清算 `Promise Job Queue`，但由于在 `sleep` 里的 `resolve` 一直没调用，
所以 `Promise Job Queue` 一直是空的，而最后结束本次测试的代码也一直无法执行，最终测试用例报错了超时错误。

## 解决方法

要解决也很简单，我们只需要在第一种写法里，把最后一个 `expect` 放到 `Promise Job Queue` 最后就可以了：

```ts
import sleep from "utils/sleep";

describe('sleep', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  })

  it('可以睡眠 1000ms', async () => {
    const callback = jest.fn();

    sleep(1000).then(() => {
      callback()
    }).then(() => {
      expect(callback).not.toHaveBeenCalled();

      jest.runAllTimers();
    }).then(() => {
      expect(callback).toHaveBeenCalledTimes(1);
    })
  })
})
```

## 总结

在这一章中，我们学会了用 `jest` 的 `Fake Timer` 来处理 `setTimeout` 的延时操作，
我们不需要真的等 1000ms 过了再做断言，更快结束测试。

通过学习 `Event Loop` 机制，我们了解到 `jest` 的 `Fake Timers` 就是把 `setTimeout` 等延时 API 的回调都收集到自己的 `Queue` 里，
你可以随时随地清算这个 `Queue`，而不需要等 XX 毫秒后再一个个执行。

虽然这一章的业务代码并不多，但是如果不了解 `jest` 的 `Fake Timers` 原理以及 `Event Loop` 运行机制，我们很容易在做时间相关函数的测试时栽跟头。
所以说，背背八股文没什么不好的，工作上不仅仅在造螺丝，还可能会造火箭。
