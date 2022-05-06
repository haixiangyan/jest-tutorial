## Redux 测试

上一章讲了很多 Jest 的 Mock 技巧，不过，大多数情况下不是 Mock 越多越好的。前一章的 `AuthButton` 组件就是一个典型样例。我们要时刻谨记测试的最终目标：
**提升代码信心。** 实现这个目标的关键要素是：**避免测试代码实现细节，要像真实用户那样去使用业务代码。**

> 当你的用例越接近用户使用的样子，你从测试获得的代码的信心就越高

在 React 或者 Vue 开发中，我们经常会用到状态管理，比如 `redux`, `mobx`, `vuex` 等。这些库又有可能和别的库一起交互，
比如 `redux-thunk`, `redux-saga`, `dva` 等。当状态管理加上它的衍生库，再加上复杂的业务逻辑时，整个项目会像滾雪球一样越滚越大，对单测来说是比较棘手的。
不信可以问问自己：如果给你一个项目，你会怎么测 `redux` 相关的代码？

所以这一章就来讲讲 Redux 的测试思路吧，当然这个思路也能拓展到很多场景，比如 `vuex`, `dva` 等。

## 用户模块

现在我们来实现一个用户模块，点击"获取用户"按钮，然后发请求拉取用户信息存到 `redux` 中，并展示到页面上。

### 引入 Redux 

首先，我们把需要安装的 `redux` 库都装一下：

```shell
npm i @reduxjs/toolkit@1.8.1 react-redux@8.0.1 redux@4.2.0
```

### 添加 store

创建 `src/store` 目录，里面存放一个 `src/store/user/reducer.ts` 作为 `userSlice` 的 `reducer`：

```ts
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

这里我们定义了 `userSlice` 的用户信息有 ID、姓名、年龄以及加载状态。其中还有一个 `updateUserName` 的 `action` 和 `fetchUserThunk` 异步 `thunk`。

在 `src/store/user/thunks.ts` 里写 `fetchUserThunk` 的定义：

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

由于我们要在页面展示用户信息和加载状态，所以在 `src/store/user/selectors.ts` 里定义这两个 `selector`：

```ts
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

最后在 `src/store/index.ts` 里把这个 `userSlice` 集合到全局状态中：

```ts
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

现在我们的全局状态已经准备好了，下面来实现页面吧。

### 配置别名

在引用 `src/store` 的内容前，需要配置一下 `webpack.config.js` 和 `tsconfig.json` 里的别名：

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "store/*": ["src/store/*"]
    }
  }
}
```

```js
// webpack.config.js
module.exports = {
  // ...
  resolve: {
    alias: {
      // ...
      store: path.join(__dirname, "src/store/"),
    }
  },
};
```

### 页面展示

首先，在 `src/components/User/index.tsx` 里添加展示用户信息的组件：

```tsx
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

到此，我们的 App 就实现完了。**如果你不熟悉 `redux` 以及 `@redux/toolkit` 的用法，也可以把它们当成伪代码来看，这里业务代码并不重要。
这里并不只是说说而已，看到最后，你会发现这里的业务是真的不重要。**

## 单元测试

现在我们来给上面的 `redux` 代码写写测试，先来看看如果用单测会是怎样的。

上面 `redux` 的代码一共有两个 `selector`：
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

非常简单，但是这样的纯函数过于简单了，对它们来做测试有点大炮打蚊子。在真实情况下，我们可以暂时不对它们写测试，等函数变足够复杂了再做测试也不迟。

现在我们来挑战一个 `action` 的测试，首先是 `updateUserName`，在 `tests/store/user/reducer.test.ts` 添加这个 `action` 的测试用例：

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

`reducer` 本身也是纯函数，它的作用就是改变数据状态的，所以这里我们在第一个参数传入当前状态，在第二个参数传入 `action`，
最后 `expect` 一下返回的新状态 `currentState` 就测试完成了。

下面来看看 `fetchUserThunk` 要怎么测。这里不仅涉及到 `redux-thunk` 中间件、API 异步函数还有 Http 请求，我们不能直接调用 `reducer` 来获取状态了。
为了更好地测试 `thunk`，很多人发明了相关的库，比如 [redux-mock-store](https://github.com/reduxjs/redux-mock-store) ， [redux-actions-assertions](https://github.com/redux-things/redux-actions-assertions) 等。

我们就以 `redux-mock-store` 为例吧，先安装一下：

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

上面一共做了 3 件事：

* 使用 `msw` Mock Http 的返回
* 使用 `redux-mock-store` 里的 `configureStore` 创建一个假 `store`，并加上 `redux-thunk` 中间件
* 最后我们对这个 `action` 里的 `data.payload` 做了断言

这也太复杂了，不仅要引入一个奇奇怪怪的库，还要做很多骚操作。在业务代码里我们可是用了 `@reduxjs/toolkit`，不需要我们手动引入 `redux-thunk` 中间件，
而这里所有东西全要手动拼装。

这样写测试最严重的问题是：**过度依赖代码实现细节！** 现在围绕 `react` 的状态管理库可不只是 `@reduxjs/toolkit`，还有 `dva`，`redux-saga`，`mobx` 等等。
一旦不用 `redux` 的 `thunk`，改成 `generator` 或者装饰器，那直接玩完了，上面所有测试用例全要改。

**这就是过度测试实现细节的代价！** 我们一说起前端测试，脑海里第一反应就是单测。然而，在业务代码中单测会更适合工具纯函数的测试，对于组件以及更业务的代码，集成测试使用频率更高。
全局状态管理就是一个非常业务的模块，所以这里应该要用集成测试。

## 集成测试 

集成测试的关键点有几个：
* 像真实用户那样去和组件交互
* 只 Mock 关键部分

下面我们就来写一下这个 **获取用户信息功能** 的集成测试吧。

首先，我们对 `React Tesitng Library` 提供的 `render` 函数改造一下：

```tsx
// tests/testUtils/render.ts
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

这个自定义 `render` 的作用就是创建一个使用 `redux` 的环境，用 `<Wrapper />` 包裹传入的业务组件，并且可以让我们决定当前 `redux` 的初始状态。

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

是不是看起来清爽了很多？在这个集成测试用例里只做了 4 件事：

1. Mock Http 返回
2. 渲染 `<User />` 组件
3. 点击按钮拉取用户信息
4. 做断言

而且这些操作没有一项是和状态管理有直接关联的，唯一有关联的只是传入的初始 `state`。也就是说不论底层的状态管理用了 `redux-saga`，还是 `dva`，
还是 `mobx`，测试用例完全不关注，它只关注组件是否正确渲染最终结果。**而这也是真实用户的真实使用行为，即不关注代码用了什么库，只关注页面变化。**

## 隔离 vs 集成

看到这，你会发现其实我们并不是在给 Redux 代码做测试，而是对业务组件做测试！

上面这个例子在 [Redux 官网的 "Writing Tests" 章节](https://redux.js.org/usage/writing-tests) 里有具体的阐述，Dan 在
["The Evolution of Redux Testing Approaches" 的博客](https://blog.isquaredsoftware.com/2021/06/the-evolution-of-redux-testing-approaches/)
里也详细论述了 Redux 测试的演变过程，即从 "Isolation"-style tests 转向 "Integration"-style tests。

在使用单测这种隔离式测试时，我们需要花很大精力在 Mock 上，而且有时不得不用上一些非常暴力的 Hacky 方法。因此，我们在做测试时，特别是对业务代码做测试时，
一定要合理使用单测。某些情况下，单测甚至是无法测到一些 Case 的。

集成测试则不仅可以 **相对真实地** 模拟用户和组件的交互，而且跑得比 E2E 测试要快很多，因此一般在业务项目中用集成测试会更多一些。

## get vs query vs find

这里稍微跟大家说说 `React Testing Library` 里的 `getBy*`，`queryBy*` 以及 `findBy*` 的区别。

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

* 当要断言元素是否存在时，使用 `getBy...`，因为它会直接跑出测试来让测试失败
* 当要做异步逻辑，然后再获取元素时，使用 `await findBy...`，因为它会不断寻找元素
* 除非有特殊需求，不是很推荐使用 `queryBy...` 这个 API

## 总结

这一章我们学会了如何对 `redux` 的 `action` 和 `selector` 代码进行单测。同时也知道这样做单测的意义并不大，容易制造出很多冗余、维护性较差的测试用例。
要测试 `redux` 逻辑时，更好的方法是对这个功能组件进行集成测试，不仅能测试真实用户的交互，还能保证 `redux` 逻辑的正确性。

当然，对 `redux` 做单测的情况不是不存在，当你遇到非常复杂的 `action` 以及 `selector` 时，比如有复杂度较高的数据转换逻辑时，对它们做单测也是个不错的选择。
