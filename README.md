
# 命名规范

> 本前端仓库落地细则见 [CONVENTIONS.md](./CONVENTIONS.md)（目录分层、React/TS、API、评审清单）。以下为基础命名与 Git 总则。

## 当前约定（摘要）

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 多词**目录** | 小写 + 中划线 | `create-video`、`digital-human` |
| **组件文件** | 大驼峰（PascalCase），与导出名一致 | `DigitalHumanPicker.tsx` |
| **组件名** | 大驼峰（PascalCase） | `DigitalHumanPicker` |
| hooks / utils / api / store | 小驼峰 | `useMobile.ts`、`videoApi.ts` |
| 静态资源文件 | 小写 + 中划线 | `icon-label-red.png` |
| `components/ui` | 保持 shadcn 默认 | `button.tsx` |
| **路由 URL / 路由文件名** | 多词小写 + 中划线 | `sign-in.tsx` → `/sign-in` |

**只有目录与路由用 `-`；组件文件用大驼峰，不用中划线、不用小驼峰。**

## 1. 目录命名

多个单词使用**小写 + 中划线**；单词语直接小写。

| 类型 | 示例 |
| --- | --- |
| 业务目录 | `create-video`、`digital-human` |
| 样式文件夹 | `css` / `scss` |
| 脚本文件夹 | `js` |

## 2. 图片命名

- 图片使用 `img` 前缀
- 图标使用 `icon` 前缀

格式：

```text
img_功能/类型_编号
icon_功能/类型_编号
```

## 3. 文件命名

- **多词组件文件（`.tsx`）**：**大驼峰（PascalCase）**，与组件导出名一致
- **非组件源码**（hooks / utils / api / store 等）：小驼峰
- **仅目录**多词使用中划线；组件/业务源码文件名不要用中划线

```text
DigitalHumanPicker.tsx
VideoStudioToolbar.tsx
videoApi.ts
useMobile.ts
```

有复数含义时，采用复数命名，例如：

```text
pages, components, filters, mixins, images
```

静态资源（`images`、`styles`、`icons` 等）为**小写 + 中划线**：

```text
assets
|-- icons
|   |-- icon-label-red.png
|-- images
|   |-- img_background-color.png
|   |-- img_company-logo.png
|-- styles
```

### 组件命名

- **文件名**：大驼峰，如 `DigitalHumanPicker.tsx`
- **组件导出名 / 引入名**：**大驼峰（PascalCase）**

```text
components
|-- common
|   |-- HoverVideoThumb.tsx      → export const HoverVideoThumb = () =>{}
|-- business
|   |-- AssetLibraryPicker.tsx   → export const AssetLibraryPicker = () =>{}
```

```ts
import { DigitalHumanPicker } from './DigitalHumanPicker'
import { VideoStudioToolbar } from './VideoStudioToolbar'
```

```text
✅ pages/workbench/create-video/components/DigitalHumanPicker.tsx
❌ createVideo/digiHumaPick.tsx
❌ create-video/digital-human-picker.tsx
```

## 4. 方法命名

方法命名不同于文件命名，尽量使用完整英文，语义表达清楚。

按照小驼峰命名，可使用常见动词约定：

| 前缀 | 含义 | 返回值 |
| --- | --- | --- |
| `can` | 判断是否可执行某个动作 | `boolean`（`true`：可执行；`false`：不可执行） |
| `has` | 判断是否含有某个值 | `boolean`（`true`：含有；`false`：不含有） |
| `is` | 判断是否为某个值 | `boolean`（`true`：是；`false`：否） |
| `get` | 获取某个值 | 非布尔值 |
| `set` | 设置某个值 | 无返回值、返回是否设置成功，或返回链式对象 |
| `load` | 加载某些数据 | 无返回值，或返回是否加载完成 |

语义化英文命名；仅组件内部使用的方法前加 `_`（下划线）区分：

```js
export default {
  methods: {
    publicFunction() {}, // 公共方法，可供外部使用
    _privateFunction() {}, // 私有方法，仅供组件内使用（注意避免与系统名冲突）
  },
}
```

### 引入组件

首字母大写的驼峰命名。推荐使用 ES6 方式引入：

```js
import Article from 'xxx'
import ArticleDetail from 'xxx'
```

### 变量

使用驼峰式命名，优先使用 `let`、`const`，避免使用 `var`：

```js
let userName = 'luffy'
const userInfo = {
  name: 'luffy',
}
```

### 常量

字母全部大写，以下划线 `_` 划分：

```js
const Api = {
  ITEMS_OFONE_TYPE: '***', // 获取事项分类
  SOLUTION_LIST: '***', // 获取事项列表
}
```

## 5. 样式命名

`class` 以小写字母开头，由小写字母、中划线和数字组成，不建议使用驼峰命名。

常用命名：

| 用途 | 示例 |
| --- | --- |
| 包裹层 | `.xx-wrap` |
| 列表 | `.xx-list` |
| 列表项 | `.xx-list-item` |
| 左边内容 | `.xx-left` |
| 中间内容 | `.xx-middle` |
| 右边内容 | `.xx-right` |
| 某个页面 | `.xx-page` |

## 6. 常用动词简写

| 简写 | 含义 |
| --- | --- |
| `get` / `set` | 取值 / 赋值 |
| `add` / `remove` | 增加 / 移除 |
| `show` / `hide` | 显示 / 隐藏 |
| `view` | 查看 |
| `browse` | 浏览 |
| `edit` | 修改 |
| `save` | 保存 |
| `delete` | 删除 |
| `find` | 查询 |
| `undo` | 撤销 |
| `redo` | 重做 |
| `clean` | 清除 |
| `index` | 索引 |
| `observe` | 观察 |
| `send` / `receive` | 发送 / 接收 |
| `refresh` / `synchronize` | 刷新 / 同步 |

## 7. Git 规范

为确保多人协作开发有序进行，保证代码版本的可追溯性和发布流程的稳定性，所有项目开发必须遵循以下 Git 分支管理与提交规范。

### 7.1 分支管理体系

项目采用主干开发（Trunk-Based）与特性分支相结合的分支管理策略，各分支职责明确如下：

| 分支类型 | 分支名称 | 用途说明 | 生命周期 |
| --- | --- | --- | --- |
| 主干分支 | `master` / `main` | 生产环境代码，与线上正式版本完全一致。禁止直接在主干上提交代码。 | 永久存在 |
| 开发分支 | `dev` | 开发主线，始终与 `master` 保持同步，是所有功能分支的基线和集成交汇点。 | 永久存在 |
| 功能分支 | `feature/xxx` | 用于开发具体功能或需求，从 `dev` 分支拉出，完成后合并回 `dev`。每个功能对应一个独立分支。 | 临时（需求开发期间） |
| 测试分支 | `test/xxx` | 对应某个 `feature` 分支的测试版本，用于提测和缺陷验证。通常由 `feature` 分支拉出，测试通过后合并回 `dev`。 | 临时（测试期间） |
| 预发布分支 | `release` | 准备上线前的最终验证分支，从 `dev` 拉出。只允许修复阻断性 Bug，完成后合并至 `master` 并打 Tag，同时同步回 `dev`。 | 临时（发布前） |
| 修复分支 | `bugfix/xxx` | 用于紧急修复线上 `master` 的缺陷，从 `master` 拉出，修复并验证后合并回 `master` 和 `dev`。 | 临时（修复期间） |

### 7.2 分支命名规范

| 分支类型 | 命名格式 | 示例 |
| --- | --- | --- |
| 功能分支 | `feature/版本号-功能简称` | `feature/v1.2.0-user-auth` |
| 测试分支 | `test/对应功能分支名` | `test/v1.2.0-user-auth` |
| 修复分支 | `bugfix/问题单号或简述` | `bugfix/issue-123-login-error` |
| 预发布分支 | `release` 或 `release/版本号` | `release/v1.2.0` |

### 7.3 提交信息规范（Commit Message）

所有提交信息必须遵循以下格式，以便于生成清晰的变更日志和版本回溯：

```text
<类型>(<可选范围>): <主题描述>

[可选正文说明]
[可选脚注：关闭的 Issue 或 TAPD 单号]
```

#### 提交类型说明

| 类型 | 说明 |
| --- | --- |
| `feat` | 新增功能或特性 |
| `fix` | 修复 Bug |
| `docs` | 仅文档相关变更（README、注释等） |
| `style` | 代码格式调整，不影响业务逻辑（空格、缩进、分号等） |
| `refactor` | 代码重构，既不修复 Bug 也不新增功能 |
| `perf` | 性能优化相关更改 |
| `test` | 新增或修正测试用例 |
| `build` | 构建系统或外部依赖变更（如 Maven/Gradle 插件、依赖版本） |
| `ci` | CI/CD 配置文件或脚本更改 |
| `chore` | 其他不涉及源码或测试文件的修改（如配置、工具链） |
| `revert` | 回退之前的提交 |

#### 提交示例

```bash
# 功能提交
git commit -m "feat(user): 新增手机号登录功能，支持验证码校验"

# 修复提交（带 TAPD 单号）
git commit -m "fix(order): 修复订单金额计算精度丢失问题

Closes TAPD-12345"

# 重构提交
git commit -m "refactor(api): 重构用户认证拦截器，优化异常处理逻辑"
```

### 7.4 协作流程要点

- 禁止直接向 `master` 或 `dev` 提交代码，所有变更必须通过 Pull Request / Merge Request 方式合并。
- 合并前需通过代码审查（Code Review），至少一名团队成员审批通过方可合并。
- 提交前确保本地通过所有单元测试和静态代码检查。
- 合并 `dev` 到 `master` 前必须经过 `release` 分支验证，确保发布内容可回滚。
- 每次正式发布需在 `master` 上打 Tag，命名格式：`v<主版本>.<次版本>.<补丁版本>`（如 `v1.2.0`）。

### 7.5 Exhibition

<img width="1772" height="812" alt="QQ20261108-131803" src="https://github.com/user-attachments/assets/0fa056e2-9162-4e9a-a633-ac61f821e9e4" />
<img width="1902" height="908" alt="QQ20261108-132505" src="https://github.com/user-attachments/assets/88c05880-95f7-438f-a8f9-224b004e291c" />
<img width="1896" height="909" alt="QQ20261108-132544" src="https://github.com/user-attachments/assets/d67366d5-207e-43da-92f5-bea20667c0e9" />
<img width="1885" height="910" alt="QQ20261108-132557" src="https://github.com/user-attachments/assets/7b8c0bbf-b478-4bdc-852c-c7e3e8e604be" />
<img width="1894" height="912" alt="QQ20261108-132639" src="https://github.com/user-attachments/assets/c4ec10b7-2c64-49d6-bc23-307c09370cb8" />
<img width="1888" height="910" alt="QQ20261108-132739" src="https://github.com/user-attachments/assets/5163fa3f-aecc-4883-9dba-dc5f5af834d6" />
<img width="1895" height="898" alt="QQ20261108-132713" src="https://github.com/user-attachments/assets/6eba5ee2-20af-4167-8344-a907cc10a261" />


















