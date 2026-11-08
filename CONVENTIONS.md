# Great Etymology Frontend 开发规约

本文档以仓库 [README.md](./README.md) 中的命名与 Git 规范为基准，并结合本项目实际技术栈（React + TypeScript + Vite + TanStack Router/Query + shadcn/ui）落地执行细则。新代码须遵循本规约；历史代码逐步对齐，不强制一次性大改。

## 当前约定（摘要）

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 多词**目录** | 小写 + 中划线 | `create-video`、`digital-human` |
| **组件文件** | 大驼峰（PascalCase），与导出名一致 | `DigitalHumanPicker.tsx` |
| **组件导出名** | 大驼峰（PascalCase）+ **箭头函数** | `export const DigitalHumanPicker = () => {}` |
| hooks / utils / api / store | 小驼峰 | `useMobile.ts`、`videoApi.ts` |
| 静态资源文件 | 小写 + 中划线 | `icon-label-red.png` |
| `components/ui` | 保持 shadcn 默认 | `button.tsx` |
| **路由 URL / 路由文件名** | 多词小写 + 中划线 | `sign-in.tsx` → `/sign-in` |

**目录与路由 URL 用 `-`；组件文件用大驼峰，不用中划线、不用小驼峰。**

---

## 1. 目录与模块划分

### 1.1 顶层目录（语义复数；多词目录用中划线）

| 目录 | 职责 |
| --- | --- |
| `src/pages` | 业务页面（按域划分子目录） |
| `src/components` | 可复用 UI / 业务组件 |
| `src/routes` | TanStack Router 路由定义 |
| `src/services` | HTTP 请求与 API 封装 |
| `src/stores` | 全局状态（如 Zustand） |
| `src/hooks` | 通用 Hooks |
| `src/utils` | 纯工具函数 |
| `src/assets` | 静态资源与图标组件 |
| `src/styles` | 全局样式 / CSS 变量 |
| `src/config` | 应用配置 |
| `src/context` | React Context |

有复数含义的目录使用复数：`pages`、`components`、`hooks`、`assets`、`styles`。

### 1.2 `components` 分层

| 目录 | 用途 | 示例 |
| --- | --- | --- |
| `components/ui` | shadcn/Radix 基础组件，尽量少改业务逻辑 | `button.tsx`、`dialog.tsx` |
| `components/common` | 跨业务通用组件（**不含业务逻辑**） | `Pagination.tsx`、`HoverVideoThumb.tsx` |
| `components/business` | 在通用组件之上叠加业务语义的复用组件 | `AssetLibraryPicker.tsx`、`PlansPickerDialog.tsx` |
| `components/layout` | 布局壳（侧栏、顶栏等） | `AppSidebar.tsx`、`Header.tsx` |

页面私有组件放在对应页面目录下的 `components/`，不要提升到全局除非已被多处复用。

**组件复用与抽取（必遵）**

1. **先复用，再新建**：编写 UI 前先查并复用已有组件——`components/ui`（Select / Button / Dialog 等）、`components/common`、`components/business`、以及本模块已有组件。禁止用原生 HTML 或另造一套样式去替代已有通用组件（如原生 `<select>` 替代 `ui/Select`）。
2. **使用超过 2 次即抽取**：同一 UI / 交互模式在代码中出现 **≥ 2 次** 时必须抽成组件，禁止复制粘贴堆叠。
3. **就近原则（页面 / 模块级）**：仅在当前页面或当前模块内复用 → 抽到该页面 / 模块同级 `components/`，不要过早上提到全局。
4. **应用级跨模块**：被 **≥ 2 个不同业务域 / 模块** 使用 → 抽到 `components/common`（纯展示 / 无业务）或 `components/business`（含业务语义）。
5. **通用组件不含业务**：`ui` / `common` 只做展示与通用交互，禁止夹带具体业务文案、接口、权限、租户、领域状态。
6. **业务组件 = 通用 + 业务**：`business` 与页面私有组件应在通用组件基础上组合扩展，补齐业务需求，而不是绕开通用层重写。

```text
✅ 用 ui/Select，而不是原生 <select>
✅ 本页用了两次相同弹窗结构 → pages/.../components/XxxDialog.tsx
✅ 素材库选择器被多页使用 → components/business/AssetLibraryPicker.tsx
✅ common/NameAvatar 只接收 name/alt，不请求账号接口
❌ 复制三份相近筛选栏不抽取
❌ 在 common 里写「到期提醒天数」等账号业务逻辑
```

**方法 / hooks 复用与抽取（必遵，与组件同原则）**

1. **先复用**：写逻辑前先查并复用已有 `@/utils`、`@/hooks`、本模块 `utils/` / `hooks/`，以及既有领域工具（如 `tenantAccess`）。禁止复制粘贴同一套判断 / 格式化 / 请求编排。
2. **使用超过 2 次即抽取**：同一纯函数、同一段业务逻辑出现 **≥ 2 次** 时必须抽到方法或 hook，禁止多处各写一份。
3. **就近原则（页面 / 模块级）**：仅在当前页面或当前模块内复用 → 抽到该模块同级 `utils/`（纯函数）或 `hooks/`（带状态 / 副作用）。
4. **应用级跨模块**：被 **≥ 2 个不同业务域 / 模块** 使用 → 抽到 `src/utils`（纯通用）或 `src/hooks`（通用 hooks）。
5. **通用方法不含业务**：`src/utils` / `src/hooks` 只做通用能力（格式化、请求封装、设备检测等），禁止夹带具体业务文案、接口字段拼装、权限/租户特例、领域状态。
6. **业务方法 = 通用 + 业务**：页面 / 模块 hooks、业务工具应在通用方法之上组合扩展，补齐业务需求，而不是绕开通用层重写。

```text
✅ 日期/字节格式化复用 @/utils；租户角色走 tenantAccess
✅ 本模块两处相同列表过滤 → pages/.../utils/filterXxx.ts 或 hooks/useXxx.ts
✅ 多页共用的 useMobile → src/hooks/useMobile.ts
✅ 通用 formatFileSize 不依赖「素材库」概念
❌ 三个页面各写一份相同的 expiresAt 计算
❌ 在 src/utils 里写「账号状态标签色阶」等业务规则
```

**组件类型细分**

| 类型 | 放哪 | 说明 |
| --- | --- | --- |
| 基础 UI | `components/ui` | shadcn/Radix，少写业务 |
| 可复用展示（无业务） | `components/common` | 跨模块、主题色与交互走 design token |
| 可复用业务组件 | `components/business` | 通用组件 + 业务需求 |
| 页面容器组件 | `pages/<域>/…` | 拼 hooks、布局、挂子组件；本身尽量薄 |
| 页面私有展示组件 | 页面同级 `components/` | **不可**跨页复用 |

**何时拆文件（就近原则）**

| 场景 | 放哪 | 示例 |
| --- | --- | --- |
| 确认弹窗 / 表单弹窗 | 页面 `components/` | `CancelInvoiceDialog.tsx` |
| 详情页主内容区 | 页面 `components/` | `InvoiceRecordDetailCard.tsx` |
| 列表页列定义 / 小块 UI | 页面 `components/` | `InvoiceRecordsColumns.tsx` |
| 纯格式化 / 常量 | 页面同级小文件或 `utils/` | `invoiceDetailFormatters.ts` |
| 页面/组件 Props、表单状态等 TS 类型 | 页面同级 `types.ts` | `invoices/types.ts` |
| 页面域业务逻辑 | 页面同级 `hooks/` | `useCustMateDraft.ts` |

页面入口（如 `detail.tsx`、`index.tsx`）保持精简：拉数据、拼布局、挂子组件；单文件明显变长（弹窗 + 详情 + 表格同屏）即拆。跨文件复用的类型放同级 `types.ts`，组件文件内只保留不导出的局部类型。

### 1.3 复杂页面 / 流程模块目录（就近 + 出口）

复杂流程（如 `cust-mate-flow`）按「视图 / 逻辑 / 纯函数」拆开，适配本仓库：页面在 `pages/`（不用 `containers/`），全局状态用 **Zustand**（不用 Redux），请求在 `services/api/`。

```text
pages/workbench/create-video/components/cust-mate-flow/
├── index.tsx                 # 模块唯一对外出口（限定可见性）
├── CustMateFlow.tsx          # 页面容器：拼 hooks + 布局
├── types.ts / constants.ts
├── hooks/                    # 本模块业务逻辑（可再拆子 hook）
│   └── index.ts              # 仅导出对外 hooks
├── utils/                    # 本模块纯函数
│   └── index.ts              # barrel；见下方「文件→目录」注意
└── components/               # 本页私有展示组件（不可跨页复用）
    ├── StudioWorkspace.tsx
    └── …
```

简单私有组件可用单文件；预计会扩展时优先用目录 + `index` 出口。

**`foo.ts` → `foo/` 目录拆分时（Vite）**

删除同名文件、新建同名目录后，外部 import 须写明确路径，避免 HMR 仍解析到已删除的 `foo.ts`：

```ts
✅ import { x } from '../utils/index'
❌ import { x } from '../utils'   // 拆分迁移期易误解析为 utils.ts
```

同模块内 hooks **不要**经 `hooks/index` 互相引用（易循环依赖），应直接 `import { useFoo } from './useFoo'`；`index.ts` 只给模块外做出口。

### 1.4 `pages` 域划分（与现有一致）

```text
pages
|-- workbench/     # 创作工作台（create-video、digital-human、tasks…）
|-- admin/         # 平台管理
|-- account/       # 账户 / 订阅 / 积分
|-- organization/  # 企业组织
|-- portal/        # 官网 / 落地页
|-- auth/          # 登录注册
|-- settings/      # 设置
|-- errors/        # 错误页
```

页面入口优先 `index.tsx`；同目录复杂逻辑拆到 `components/`、`data/`、`types.ts`。

### 1.5 `services` API 约定

```text
services
|-- request.ts          # axios / 拦截器
|-- api/
|   |-- videoApi.ts     # 按领域：*Api.ts（小驼峰，非组件）
|   |-- creditApi.ts
|   |-- modelApi.ts
```

- 一个领域一个 `*Api.ts` 文件。
- 导出函数使用完整语义动词：`listVideoGenerations`、`getCreditAccount`。
- 类型与请求同文件导出；响应统一经 `unwrap` / `unwrapResponse` 处理 `code !== 0`。

---

## 2. 命名规范

### 2.1 目录命名

多个单词：**小写 + 中划线**；单词语直接小写。**只有目录用 `-`，文件名不用。**

| 类型 | 示例 |
| --- | --- |
| 业务目录 | `create-video`、`digital-human`、`asset-library` |
| 组件目录 | `data-table`、`brand-icons` |

### 2.2 文件命名

- **多词组件文件（`.tsx`）**：**大驼峰（PascalCase）**，与导出名一致，例如：
  - `CustomMaterialFlow.tsx`
  - `DigitalHumanPicker.tsx`
  - `VideoConfigPane.tsx`
- **非组件源码**（hooks / utils / api / store 等）：小驼峰，例如 `useMobile.ts`、`videoApi.ts`
- **页面入口**：`index.tsx`
- **类型集中文件**：`types.ts`
- **静态资源文件**：小写 + 中划线
- **`components/ui`**：保持 shadcn 默认（多为小写单词）

```text
assets
|-- icons
|   |-- icon-label-red.png
|-- images
|   |-- img_background-color.png
|-- styles
```

### 2.3 图片 / 图标命名

- 图片：`img` 前缀 → `img_功能_编号`
- 图标：`icon` 前缀 → `icon_功能_编号`
- React 图标组件文件：大驼峰，如 `IconSkype.tsx`

### 2.4 组件与导入

- **组件文件名**与**导出名**均为大驼峰；**其余**源码（hooks / utils / api / store）小驼峰
- **组件定义**：用 `const` + 箭头函数 + 显式 Props；可用 `FC` / `React.FC` 标注类型；**禁止 `export default` 导出组件**
- **泛型组件**（`.tsx`）：`export const Foo = <T,>(props: FooProps<T>) => {`（`<T,>` 尾逗号避免与 JSX 混淆）
- **非组件**（hooks、`createXColumns`、utils、api）仍用 `export function`
- 事件处理函数命名：`handle` + 事件，如 `handleSubmit`、`handleMaterialRemove`
- 需要默认值：用参数默认值或解构默认值声明（勿依赖隐式 undefined）

```tsx
type DigitalHumanPickerProps = {
  value: string
  onChange?: (value: string) => void
}

export const DigitalHumanPicker = ({
  value,
  onChange,
}: DigitalHumanPickerProps) => {
  const handleChange = (next: string) => onChange?.(next)
  return <div onClick={() => handleChange(value)}>{value}</div>
}
```

- **例外**：`components/ui`（shadcn/Radix）保持库内原有写法，不必为对齐规约批量改写
- **类型就近**：页面域内跨文件复用的 Props、表单状态、Tab 枚举等抽到页面同级 `types.ts`（小驼峰）；API 领域类型仍在 `services/api/*Api.ts`

**模块出口与依赖引入**

1. 一个模块 / 目录由 **`index.ts(x)`** 统一管理对外导出，限定可见性；内部文件互引尽量直连，避免经 barrel 绕圈。
2. import 顺序（同组空行分隔更佳）：

```text
全局绝对路径（@/…、第三方包）
→ 公共组件（ui / common / business）
→ 本模块组件
→ 公共方法（@/utils、@/hooks）
→ 本模块方法（./utils、./hooks）
→ 服务（@/services）
→ 样式
```

3. **避免循环依赖**（尤其 hooks ↔ hooks、barrel ↔ 实现文件）。
4. 相对路径尽量不超过两级（`./`、`../`）；更深优先改成 `@/`。
5. 工具库按需引入，禁止 `import * as _ from '…'` 整包拖入。

```ts
✅ import { DigitalHumanPicker } from './DigitalHumanPicker'
✅ import { Button } from '@/components/ui/button'
✅ import { listVideoGenerations } from '@/services/api/videoApi'
❌ import * as api from '@/services/api/videoApi'
❌ export default DigitalHumanPicker
```

```text
✅ create-video/DigitalHumanPicker.tsx → export const DigitalHumanPicker = () => {}
❌ export function DigitalHumanPicker() {}
❌ createVideo/digiHumaPick.tsx
❌ create-video/digital-human-picker.tsx
```

- 路径别名优先 `@/`（见 `tsconfig`）。
- **路由**：`src/routes` 下多词文件名与访问 URL 均为中划线（如 `asset-library.tsx` → `/asset-library`）；`Link`/`navigate`/`url` 须同步。

### 2.5 方法 / 函数命名

方法命名不同于文件命名，**尽量完整英文、语义清晰**，小驼峰。常用前缀：

| 前缀 | 含义 | 返回值 |
| --- | --- | --- |
| `can` | 是否可执行某动作 | `boolean` |
| `has` | 是否含有某值 | `boolean` |
| `is` | 是否为某状态 | `boolean` |
| `get` | 获取值 | 非布尔 |
| `set` | 设置值 | void / 是否成功 / 链式 |
| `load` / `list` / `fetch` | 加载数据 | Promise 或 void |
| `create` / `update` / `delete` | 写操作 | Promise |

模块内私有辅助可用下划线前缀或文件内不导出函数区分：

```ts
export function formatResolutionLabel(value: string) { /* 对外 */ }

function resolutionRank(value: string) { /* 仅本文件 */ }
```

常用动词简写（与 README 一致）：`get`/`set`、`add`/`remove`、`show`/`hide`、`edit`、`save`、`delete`、`find`、`refresh`、`send`/`receive` 等。

### 2.6 变量与常量

- 变量：小驼峰；优先 `const` / `let`，禁止 `var`。
- 常量：全大写 + 下划线：

```ts
const DEFAULT_RESOLUTION = '480p'
const FALLBACK_GENERATION_DURATION_MAX = 15
```

### 2.7 样式 class 命名

- Tailwind 为主时，以 utility 为主，少写自定义 class。
- 若写自定义 class：**小写 + 中划线**，不用驼峰：

| 用途 | 示例 |
| --- | --- |
| 包裹层 | `.xx-wrap` |
| 列表 / 项 | `.xx-list`、`.xx-list-item` |
| 左中右 | `.xx-left`、`.xx-middle`、`.xx-right` |
| 页面根 | `.xx-page` |

---

## 3. 组件开发与 React / TypeScript 实践

### 3.1 原则

1. **单一职责**：高内聚、低耦合；一个组件只做一件事。
2. **逻辑与视图分离**：可复用 / 复杂业务逻辑抽到 hooks；容器只编排。
3. **状态边界**：组件状态默认只在组件（或同域 hook）内；**仅全局共用**数据进 Zustand（本仓库不用 Redux）。服务端状态用 TanStack Query。
4. **无状态优先**：不需要状态则用无状态函数组件。性能倾向：无状态函数 > 有状态函数 > class（本仓库不用 class 组件）。
5. **最小化 props**：只传真正需要的字段；内部条件分支过多时继续拆组件，而不是堆 `if`。

### 3.2 拆分阈值

| 信号 | 动作 |
| --- | --- |
| 单文件 **> 300 行** | 必须进一步拆（子组件 / hooks / utils） |
| `render` 块过长或重复 JSX | 拆子组件或局部渲染函数 |
| 多段独立 UI（弹窗、列表、工具栏） | 就近拆到 `components/` |
| 上传 / 轮询 / 草稿等副作用集中 | 抽 `useXxx` hook |

### 3.3 公共方法封装

1. 写清用途、使用场景、入参、返回值（简短 JSDoc 即可）。
2. **超过两个入参**用对象传入；在参数上给默认值，并对关键字段做类型约束（TypeScript 类型 + 必要运行时校验）。
3. 纯函数放 `utils/`（全局或模块内）；勿在组件文件堆业务无关工具。

### 3.4 日常实践清单

1. **类型**：对外 props、API 入参/出参显式声明；避免无必要的 `any`。
2. **副作用**：数据请求放 `useQuery` / `useMutation`，不要在随意 `useEffect` 里散落请求。
3. **复用**：先查 `components/common`、`components/business` 与同域 `components/`，避免重复造轮子。
4. **UI**：优先 `components/ui`（shadcn）；样式用已有 token / Tailwind。
5. **错误处理**：接口错误用 `getApiErrorMessage`，用户可见反馈用 `toast`，勿静默吞错。
6. **权限**：租户角色判断走 `utils/tenantAccess` 等既有工具，不在页面硬编码角色字符串散落。

---

## 4. Git 规范

与 README「7. Git 规范」一致，摘要如下。

### 4.1 分支

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| 主干 | `master` / `main` | 生产；禁止直接提交 |
| 开发 | `dev` | 功能集成基线 |
| 功能 | `feature/版本号-功能简称` | 如 `feature/v1.2.0-user-auth` |
| 测试 | `test/对应功能分支名` | 如 `test/v1.2.0-user-auth` |
| 预发布 | `release` / `release/版本号` | 上线前验证 |
| 热修 | `bugfix/问题简述` | 如 `bugfix/issue-123-login-error` |

### 4.2 Commit Message

```text
<类型>(<可选范围>): <主题描述>

[可选正文]
[可选脚注：Issue / TAPD]
```

| 类型 | 说明 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档 |
| `style` | 格式（不影响逻辑） |
| `refactor` | 重构 |
| `perf` | 性能 |
| `test` | 测试 |
| `build` | 构建 / 依赖 |
| `ci` | CI 配置 |
| `chore` | 杂项工具/配置 |
| `revert` | 回退 |

示例：

```bash
git commit -m "feat(create-video): 分辨率改取系统设置并按从小到大排序"

git commit -m "fix(workbench): 创作日历按真实生成记录打点

Closes TAPD-12345"
```

### 4.3 协作要点

- 禁止直接向 `master` / `dev` 推送业务提交；经 PR/MR 合并。
- 合并前至少一人 Code Review。
- 提交前本地通过类型检查 / lint（如 `pnpm exec tsc -p tsconfig.app.json --noEmit`）。
- 正式发布在主干打 Tag：`v主.次.补丁`（如 `v1.2.0`）。

---

## 5. 评审自检清单（建议）

- [ ] 多词目录用中划线；组件文件与导出名均为 PascalCase；其余小驼峰
- [ ] 新组件用具名 `export const X = () => {}`（可用 FC），**无** `export default`
- [ ] 事件处理为 `handleXxx`；默认 props 已声明
- [ ] 单文件一般 **≤300 行**；超则已拆
- [ ] 模块有 `index` 出口；无循环依赖；相对路径 ≤两级或已改 `@/`
- [ ] import 顺序：全局 → 公共组件 → 本模块 → 公共方法 → 本模块方法 → 服务 → 样式
- [ ] 路由 URL / 路由文件名为中划线（如 `/sign-in`）
- [ ] 组件落在正确分层：`ui` / `common` / `business` / 页面私有
- [ ] 弹窗 / 详情等已从页面入口拆到就近 `components/`；逻辑已抽 hooks
- [ ] 仅全局数据用 Zustand；服务端状态用 TanStack Query
- [ ] 跨文件 Props / 状态类型已抽到页面同级 `types.ts`
- [ ] API 落在对应 `*Api.ts`，错误有统一提示；工具按需引入
- [ ] 无无关大范围格式化、无调试残留
- [ ] Commit 类型与范围写清楚
- [ ] 涉及权限 / 租户的逻辑使用既有工具函数

---

## 6. 与 README 的关系

| 文档 | 职责 |
| --- | --- |
| [README.md](./README.md) | 基础命名与 Git 总则（团队通用） |
| **本文档 CONVENTIONS.md** | 本前端仓库的落地细则与目录约定 |

若两处冲突，以**本仓库现行代码结构 + 本文档**为准，并回写 README 保持同步。
