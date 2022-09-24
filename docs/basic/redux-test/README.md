# Redux 测试

上一章讲了很多 Jest 的 Mock 技巧。不过，过多的 Mock 并不是好事。前一章的 `AuthButton` 组件就是一个典型样例。我们要时刻谨记测试的最终目标：
**提升代码信心** 。实现这个目标的关键要素是：**避免测试代码实现细节，要像真实用户那样去使用业务代码** 。

::: tip
当你的用例越接近用户使用的样子，你从测试获得的代码的信心就越高
:::

在 `React` 和 `Vue` 开发中，我们经常会用到状态管理，比如 `redux`, `mobx`, `vuex` 等。而这些库又有可能和别的库一起联动，
比如 `redux-thunk`, `redux-saga`, `dva`, `mobx` 等。当状态管理库加上它的衍生库，再加上复杂的业务逻辑时，整个项目会像滾雪球一样越滚越大，
此时写单测真的难于登天。可以问问自己：如果给你一个项目，你会怎么编写 `redux` 的相关测试代码？

所以这一章就来讲讲 Redux 的测试思路吧。

## 用户模块

现在我们来实现一个用户模块：点击 “获取用户” 按钮，发请求拉取用户信息存到 `redux` 中，并在页面展示用户信息。

### 引入 Redux 

首先，我们来安装一下 `redux` 相关的库：

```shell
npm i @reduxjs/toolkit@1.8.1 react-redux@8.0.1 redux@4.2.0
```

### 添加 store

创建 `src/store` 目录，里面存放一个 `src/store/user/reducer.ts` 作为 `userSlice` 的 `reducer`：

```ts
// src/store/user/reducer.ts
import { createSlice } from "@reduxjs/toolkit";
import { fetchUserThunk } from "./thunks";

const initialState = {
  id: "",
  name: "",
  age: 0,
  status: "",
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateUserName: (state, action) => {
      state.name = action.payload.name;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserThunk.pending, (state) => {
      state.status = "loading";
    });
    builder.addCase(fetchUserThunk.fulfilled, (state, action) => {
      state.status = "complete";
      state.name = action.payload.name;
      state.id = action.payload.id;
    });
    builder.addCase(fetchUserThunk.rejected, (state) => {
      state.status = "error";
    });
  },
});

export const { updateUserName } = userSlice.actions;

export default userSlice.reducer;
```

在 `userSlice` 里定义用户信息：ID、姓名、年龄以及加载状态。其中还有一个 `updateUserName` 的 `action` 和 `fetchUserThunk` 异步 `thunk`。

在 `src/store/user/thunks.ts` 里添加 `fetchUserThunk` 的实现：

```ts
// src/store/user/thunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchUser } from "apis/user";

export const fetchUserThunk = createAsyncThunk(
  "user/fetchUserThunk",
  async () => {
    const response = await fetchUser();
    return response.data;
  }
);
```

这个 `thunk` 用到了 `fetchUser` 的 API 函数，所以要在 `src/apis/user.ts` 里添加这个函数的实现：

```ts
// src/apis/user.ts
// 获取用户列表
export interface FetchUserRes {
  id: string;
  name: string;
}

export const fetchUser = async () => {
  return axios.get<FetchUserRes>("https://mysite.com/api/users");
};
```

由于要在页面中展示用户信息和加载状态，所以在 `src/store/user/selectors.ts` 里定义这两个 `selector`：

```ts
// src/store/user/selectors.ts
import { RootState } from "../index";

export const selectUser = (state: RootState) => {
  const { id, age, name } = state.user;

  return {
    id,
    age,
    name,
  };
};

export const selectUserFetchStatus = (state: RootState) => state.user.status;
```

最后在 `src/store/index.ts` 里把这个 `userSlice` 放到全局状态：

```ts
// src/store/index.ts
import userReducer from "./user/reducer";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

export const reducer = combineReducers({
  user: userReducer,
});

const store = configureStore({
  reducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
```

现在我们已经把项目的 Redux 准备好了，下面来实现页面吧。

### 页面展示

首先，在 `src/components/User/index.tsx` 里添加展示用户信息的组件：

```tsx
// src/components/User/index.tsx
import React, { FC } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchUserThunk } from "store/user/thunks";
import { selectUser, selectUserFetchStatus } from "store/user/selectors";
import { Button } from "antd";

const User: FC = () => {
  const dispatch = useAppDispatch();

  const user = useAppSelector(selectUser);
  const status = useAppSelector(selectUserFetchStatus);

  const onClick = async () => {
    const res = await dispatch(fetchUserThunk());
    console.log("fetchUserThunk", res);
  };

  return (
    <div>
      <h2>用户信息</h2>

      {status === "loading" && <p>加载中...</p>}

      {user.id ? (
        <div>
          <p>ID：{user.id}</p>
          <p>姓名：{user.name}</p>
          <p>年龄：{user.age}</p>
        </div>
      ) : (
        <p>无用户信息</p>
      )}

      <Button onClick={onClick} type="primary">
        加载用户
      </Button>
    </div>
  );
};

export default User;
```

在 `App.tsx` 里使用它：

```tsx
import User from "components/User";

const App = () => {
  return (
    <div>
      {/*...*/}
      <section>
        <User />
      </section>
    </div>
  )
}
```

最后在 `index.tsx` 入口里使用 `Provider` 来包裹整个 App：

```tsx
import store from "./store";

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.querySelector("#root")
);
```

到此，我们的 App 就实现完了。**如果你不熟悉 `redux` 以及 `@redux/toolkit` 的用法，也可以把它们当成伪代码来看，业务代码不重要。**

## 单元测试

首先，我们尝试给上面的 Redux 代码写一下单测。经过分析，上面 `redux` 的代码一共有两个 `selector`：
* `selectUser`
* `selectUserFetchStatus`

还有两个 `action`：
* `updateUserName`
* `fetchUserThunk` 

我们先写 `selector` 的单测。由于是纯函数，所以这两个单测比较简单，添加 `tests/store/user/selectors.test.ts`：

```ts
// tests/store/user/selectors.test.ts
import { selectUser, selectUserFetchStatus } from "store/user/selectors";

describe("selector", () => {
  describe("selectUser", () => {
    it("可以获取用户信息", () => {
      expect(
        selectUser({
          user: {
            id: "1",
            name: "Jack",
            age: 19,
            status: "complete",
          },
        })
      ).toEqual({
        id: "1",
        name: "Jack",
        age: 19,
      });
    });
  });

  describe("selectUserFetchStatus", () => {
    it("可以获取加载状态", () => {
      expect(
        selectUserFetchStatus({
          user: {
            id: "1",
            name: "Jack",
            age: 19,
            status: "loading",
          },
        })
      ).toEqual("loading");
    });
  });
});
```

这样的纯函数单测过于简单了，给它们上单测有点大炮打蚊子。**在真实业务中，我们可以暂时不对它们写测试，等函数变足够复杂了再做测试也不迟。**

现在我们来挑战一下 `action` 的测试，首先是 `updateUserName`，在 `tests/store/user/reducer.test.ts` 添加这个 `action` 的测试用例：

```ts
// tests/store/user/reducer.test.ts
import reducer, { updateUserName } from "store/user/reducer";

describe("reducer", () => {
  describe("测试 reducer", () => {
    describe("updateUserName", () => {
      it("可以更新用户姓名", () => {
        // 测试 reducer 纯函数
        const currentState = reducer(
          {
            id: "",
            name: "",
            age: 0,
            status: "",
          },
          updateUserName({ name: "hello" })
        );

        expect(currentState.name).toEqual("hello");
      });
    });
  });
});
```

`reducer` 本身也是纯函数，它的作用就是改变数据状态，所以这里我们在第一个参数传入当前状态，在第二个参数传入 `action`，
最后 `expect` 一下返回的新状态 `currentState` 就完成测试了。

下面来看看 `fetchUserThunk` 的测试。它涉及到 `redux-thunk` 中间件、API 异步函数还有 Http 请求，所以我们不能直接调用 `reducer` 来做测试。

为了更好地测试 `thunk`，开发者们发明了很多 NPM 包，比如 [redux-mock-store](https://github.com/reduxjs/redux-mock-store) ， [redux-actions-assertions](https://github.com/redux-things/redux-actions-assertions) 等。
这里就以 `redux-mock-store` 为例，先安装一下：

```shell
npm i -D redux-mock-store@1.5.4 @types/redux-mock-store@1.0.3
```

然后写如下测试用例：

```ts
// tests/store/user/reducer.test.ts
import reducer, { updateUserName } from "store/user/reducer";
import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import server from "../../mockServer/server";
import { rest } from "msw";
import { fetchUserThunk } from "store/user/thunks";

// 初始化函数
const setupHttp = (name?: string, age?: number) => {
  server.use(
    rest.get("https://mysite.com/api/users", async (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          id: "1",
          name: name || "Jack",
          age: age || 18,
        })
      );
    })
  );
};

// 非常不推荐这样去测 redux 的代码
describe("reducer", () => {
  describe("测试 reducer", () => {
    describe("fetchUserThunk", () => {
      it("可以获取用户", async () => {
        // Mock Http 返回
        setupHttp("Mary", 10);

        // Mock redux 的 store
        const middlewares = [thunk];
        const mockStore = configureStore(middlewares);
        const store = mockStore({
          id: "",
          name: "",
          age: 0,
          status: "",
        });

        // 开始 dispatch
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const data = await store.dispatch(fetchUserThunk());

        expect(data.payload).toEqual({
          id: "1",
          name: "Mary",
          age: 10,
        });

        // 失败，因为 redux-mock-store 只能测 action 部分
        // 详情：https://github.com/reduxjs/redux-mock-store/issues/71
        // expect(store.getState()).toEqual({
        //   id: "1",
        //   name: "Mary",
        //   age: 10,
        //   status: "complete",
        // });
      });
    });
  });
});
```

一共做了 4 件事：

* 使用 `msw` Mock Http 的返回
* 使用 `redux-mock-store` 里的 `configureStore` 创建一个假 `store`
* 在假 `store` 里引入 `redux-thunk` 中间件
* 最后对 `data.payload` 做了断言

这也太复杂了，不仅要引入一个奇奇怪怪的库，还要手动创建一个假 `store`，并接入 `redux-thunk` 中间件。

这样测试的问题是：**过度测试代码实现细节！** 现在围绕 `react` 的状态管理库可不只有 `@reduxjs/toolkit`，还有 `dva`，`redux-saga`，`mobx` 等等。
一旦不用 `redux` 的 `thunk`，改成 `generator` 或者装饰器，那直接玩完了，上面所有测试用例全部报废。

**这就是过度测试实现细节的代价！** 全局状态管理属于一个非常偏业务的功能模块，所以这里使用集成测试更合适。

## 集成测试 

集成测试的关键点有 2 个：
* 像真实用户那样去和组件交互
* Mock Http 请求（外部依赖）

下面我们来实现这个功能的集成测试吧。首先，我们来改造一下 `React Tesitng Library` 提供的 `render` 函数：

```tsx
// tests/testUtils/render.tsx
import React, { FC } from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { reducer, RootState } from "store/index";

interface CustomRenderOptions extends RenderOptions {
  preloadedState?: RootState;
  store?: ReturnType<typeof configureStore>;
}

const render = (ui: React.ReactElement, options: CustomRenderOptions) => {
  // 获取自定义的 options，options 里带有 store 内容
  const {
    preloadedState = {},
    store = configureStore({ reducer, preloadedState }),
    ...renderOptions
  } = options;

  // 使用 Provider 包裹
  const Wrapper: FC = ({ children }) => {
    return <Provider store={store}>{children}</Provider>;
  };

  // 使用 RTL 的 render 函数
  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
};

export default render;
```

自定义 `render` 的作用就是：创建一个使用 `redux` 的环境，用 `<Wrapper />` 包裹传入的业务组件，并且可以让我们决定当前 `redux` 的初始状态。
然后在 `tests/components/User/index.test.tsx` 使用自定义的 `render` 来渲染 `<User />` 组件：

```tsx
// tests/components/User/index.test.tsx
import React from "react";
import server from "../../mockServer/server";
import { rest } from "msw";
import render from "../../testUtils/render";
import { fireEvent, screen } from "@testing-library/react";
import User from "components/User";

// 初始化 Http 请求
const setupHttp = (name?: string, age?: number) => {
  server.use(
    rest.get("https://mysite.com/api/users", async (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          id: "1",
          name: name || "Jack",
          age: age || 18,
        })
      );
    })
  );
};

describe("User", () => {
  it("点击可以正常获取用户列表", async () => {
    setupHttp("Mary", 10);

    render(<User />, {
      preloadedState: {
        user: {
          id: "",
          name: "",
          age: 10,
          status: "",
        },
      },
    });

    // 还没开始请求
    expect(screen.getByText("无用户信息")).toBeInTheDocument();

    // 开始请求
    fireEvent.click(screen.getByText("加载用户"));

    // 请求结束
    expect(await screen.findByText("ID：1")).toBeInTheDocument();
    expect(screen.getByText("姓名：Mary")).toBeInTheDocument();
    expect(screen.getByText("年龄：10")).toBeInTheDocument();

    expect(screen.queryByText("加载中...")).not.toBeInTheDocument();
  });
});
```

虽然这个集成测试做了 4 件事，但看起来清爽多了：

1. Mock Http 返回
2. 渲染 `<User />` 组件
3. 点击按钮拉取用户信息
4. 做断言

而且这些操作没有一项是和状态管理有直接关联的，唯一有关联的就是传入的初始 `state`。也就是说，无论底层的状态管理用了 `redux-saga`，还是 `dva`，
还是 `mobx`，测试用例完全不关注，它只关注组件是否正确渲染最终结果。**这其实也是普通用户的使用行为，他可不关注代码用了什么库，只管页面变化。**

## 隔离 vs 集成

看到这，你会发现其实我们并不是在给 Redux 代码做测试，而是对业务组件做测试！

上面这个例子在 [Redux 官网的 《Writing Tests》 章节](https://redux.js.org/usage/writing-tests) 里有具体的阐述，Dan 在
[《The Evolution of Redux Testing Approaches》](https://blog.isquaredsoftware.com/2021/06/the-evolution-of-redux-testing-approaches/)
里也详细论述了 Redux 测试的演变过程，即从 Isolation-style tests（隔离式测试）转向 Integration-style tests（集成式测试）。

在使用单测这种隔离式测试时，我们需要花很大精力在 Mock 上，而且有时不得不用上一些非常暴力的 Hacky 方法。因此，**我们在做测试时，特别是对业务代码做测试时，
一定要合理使用单测。** 某些情况下，单测甚至无法测到一些边界条件。

集成测试则不仅可以 **相对真实地** 模拟用户和组件的交互，而且跑得比 E2E 测试要快很多，因此一般在业务项目中用集成测试会更多一些。

## `getBy*` vs `queryBy*` vs `findBy*`

上面集成测试中，我们用到了 `React Testing Library` 的查询 API，这里说说 `getBy*`，`queryBy*` 以及 `findBy*` 三者的区别。

| 查询类型            | 不命中       | 1 个命中 | 多个命中 | 重试（Async/Await） |
|-----------------|-----------|-------|------|-----------------|
| 单个元素            |           |       |      |                 |
| `getBy...`      | 抛出错误      | 返回元素  | 抛出错误 | 无               |
| `queryBy...`    | 返回 `null` | 返回元素  | 抛出错误 | 无               |
| `findBy...`     | 抛出错误      | 返回元素  | 抛出错误 | 有               |
| 多个元素            |           |       |      |                 |
| `getAllBy...`   | 抛出错误      | 返回元素  | 抛出错误 | 无               |
| `queryAllBy...` | 返回 `[]`   | 返回元素  | 抛出错误 | 无               |
| `findAllBy...`  | 抛出错误      | 返回元素  | 抛出错误 | 有               |

总的来说就是：

* 当要断言元素是否存在时，使用 `getBy...`，因为找不到时，它会直接抛出错误来让测试失败
* 当要做异步逻辑，然后再获取元素时，使用 `await findBy...`，因为它会不断地寻找元素
* 上面两种情况都不满足时，可以使用 `queryBy...` 这个 API

## 总结

这一章我们学会了如何对 `redux` 的 `action` 和 `selector` 代码进行单测。同时也知道这样做测试的意义并不大，容易写出很多冗余、维护性差的测试用例。

如果要测试 Redux 代码逻辑，最好的方法是对这个功能进行集成测试，不仅能测试真实用户的交互，还能保证 Redux 代码的正确性。

当然，给 Redux 代码做单测的情况不是不存在，当你遇到非常复杂的 `action` 以及 `selector` 时，单测是个不错的选择。
