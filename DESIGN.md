---
name: 智慧小勇士
description: 航海探险手账——糖果贴纸质感、深海描边与按压物理的七巧板思维闯关世界
colors:
  sea: '#16314f'
  sea-deep: '#24507d'
  sky: '#e4f3f1'
  sky-deep: '#cfe9e6'
  sun: '#ffc531'
  sun-soft: '#fff0bd'
  coral: '#ff6a55'
  coral-hover: '#f25a44'
  coral-soft: '#ffe1db'
  leaf: '#17a46a'
  leaf-soft: '#d6f3e2'
  grape: '#6f55e6'
  grape-soft: '#e6e0ff'
  paper: '#fffaf0'
  line: '#c6d9dc'
  piece-circle: '#ef7656'
  piece-semi-a: '#f2bb51'
  piece-semi-b: '#e89cbe'
  piece-triangle: '#53a8c6'
  piece-trapezoid: '#9290d4'
  piece-center: '#58ad83'
  piece-large: '#e48643'
typography:
  display:
    fontFamily: "'ZCOOL KuaiLe', 'Nunito Variable', 'Noto Sans SC Variable', sans-serif"
    fontSize: '38px'
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: '0.01em'
  body:
    fontFamily: "'Nunito Variable', 'Noto Sans SC Variable', sans-serif"
    fontSize: '15px'
    fontWeight: 500
    lineHeight: 1.65
    letterSpacing: 'normal'
  label:
    fontFamily: "'Nunito Variable', 'Noto Sans SC Variable', sans-serif"
    fontSize: '13px'
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 'normal'
rounded:
  input: '12px'
  button: '14px'
  card: '20px'
  panel: '28px'
  pill: '999px'
components:
  button-primary:
    backgroundColor: '{colors.coral}'
    textColor: '#ffffff'
    rounded: '{rounded.button}'
    padding: '11px 18px'
  button-primary-hover:
    backgroundColor: '{colors.coral-hover}'
  button-secondary:
    backgroundColor: '#ffffff'
    textColor: '{colors.sea}'
    rounded: '{rounded.button}'
    padding: '11px 18px'
  button-secondary-hover:
    backgroundColor: '{colors.sun-soft}'
  button-sun:
    backgroundColor: '{colors.sun}'
    textColor: '{colors.sea}'
    rounded: '{rounded.button}'
    padding: '12px 20px'
  nav-item-active:
    backgroundColor: '{colors.sun}'
    textColor: '{colors.sea}'
    rounded: '{rounded.button}'
    padding: '11px 16px'
  tag-pill:
    backgroundColor: '{colors.grape-soft}'
    textColor: '#3d2ca8'
    rounded: '{rounded.pill}'
    padding: '4px 12px'
  star-wallet:
    backgroundColor: '{colors.sun}'
    textColor: '{colors.sea}'
    rounded: '{rounded.pill}'
    padding: '6px 16px'
---

# Design System: 智慧小勇士

## Overview

**Creative North Star: 「航海探险手账」**

这是一个孩子的航海探险手账：薄荷海雾绿的波点纸面上，贴着一张张奶油纸底的厚贴纸——每张贴纸都有深海墨蓝的粗描边和一层可以「按下去」的硬投影。它是明亮、厚实、大方块的糖果贴纸世界，活力外露但从不刺眼：大面积的静色（海雾绿、奶油纸、深海蓝）承载内容，高饱和的金黄、珊瑚红、叶绿、葡萄紫只在值得庆祝和需要注意的地方出现。练习画布（画线区、拼图区、火柴黑板）保持清楚安静，贴纸的热闹留给导航、奖励与反馈。

结构上它是两层世界：`tokens.css` 定义语义变量名（`--ink`、`--paper`、`--radius`……），`adventure.css` 作为主题层覆盖它们的值并补充航海色板。**`adventure.css` 是唯一生效的世界**；`tokens.css` 里的绿纸旧值（`#167c69`、`#f7f8f2` 等）已被覆盖退役，只许沿用变量名、不许沿用旧值。主题层可以覆盖值，永远不能改变量名。

**Key Characteristics:**

- 深海墨蓝 2–2.5px 粗描边包住每一个「立起来的」表面：按钮、卡片、画板、输入框
- 硬投影 `0 4px 0 var(--sea)` 是贴纸的物理厚度，按下时陷落（4px→2px，上浮时增高到 6px）
- 虚线边框 = 未完成 / 空位 / 幽灵状态的专属语言
- 金黄色只属于奖励与成就：星星、勋章、星币钱包、当前导航、提交按钮
- 七块拼板各有固定的糖果色，是全套图形语言的取色基准
- ZCOOL KuaiLe 只做展示层（标题、大数字），正文永远是 Nunito + 思源黑体
- 44px 最小触控目标、`focus-visible` 葡萄紫外圈、`prefers-reduced-motion` 全局关闭动效

## Colors

色板是一张航海图：深海墨蓝勾边定结构，薄荷海雾绿铺海面，奶油纸承载内容，金黄/珊瑚红/叶绿/葡萄紫四色糖果做强调。分组按角色，不按色相。

### Primary

- **深夜海军蓝 · Sea** (#16314f，别名 `--sea`/`--ink`)：整个世界的描边、正文墨色与最重结构。所有按钮描边、卡片描边、侧栏底色、火柴黑板底、大标题用色。它是这套系统的「笔」。
- **远海蓝 · Sea Deep** (#24507d，`--sea-2`)：海军的浅一号。首页横幅渐变、自由拼图区虚线描边、火柴黑板的内嵌描边（`inset 0 0 0 6px`）。

### Secondary

- **阳光金 · Sun** (#ffc531，`--sun`)：奖励与成就的专属色。星星（点亮态）、星币钱包、勋章（获得态）、当前导航项、提交答案按钮、步骤气泡、竞赛成绩卡。它从不做普通装饰。
- **柔和金 · Sun Soft** (#fff0bd，`--sun-soft`)：金的衬底。重试反馈底、提示便签（虚线金描边）、白按钮 hover 色、工具按钮 hover 底。

### Tertiary

- **珊瑚红 · Coral** (#ff6a55，`--coral`/`--orange`)：行动与注意。主按钮底色、当前关卡标记、头像、紧急倒计时、错题符号、大分数描字、导航小红点。
- **柔和珊瑚 · Coral Soft** (#ffe1db，`--coral-soft`)：错题符号底、存储警告底。
- **叶绿 · Leaf** (#17a46a，`--leaf`/`--teal`)：成功与进度。正确反馈、进度条（绿色领域）、成长总览大卡、自动保存图标。
- **柔和叶绿 · Leaf Soft** (#d6f3e2，`--leaf-soft`)：成功反馈底、继续挑战横幅底、拼图区领域卡底。
- **葡萄紫 · Grape** (#6f55e6，`--grape`)：聚焦与链接。`focus-visible` 外圈、链接色、关卡编号徽章、竞赛功能大卡底、空状态插画。
- **柔和葡萄 · Grape Soft** (#e6e0ff，`--grape-soft`)：小标签（pill）底、紫色领域卡底。

### Neutral

- **薄荷海雾 · Sky** (#e4f3f1，`--sky`)：页面唯一的海面底色，叠 28px 波点纹理（`radial-gradient(#97c7c3 1.2px, transparent 1.5px)`）。
- **深薄荷 · Sky Deep** (#cfe9e6，`--sky-2`)：画板工具栏分隔、进度条轨道。
- **奶油纸 · Paper** (#fffaf0，`--paper`)：所有卡片、面板、关卡选择器的纸面。
- **雾线 · Line** (#c6d9dc，`--line`)：顶栏虚线分隔、进度轨道等中性线。
- **纯白 · White** (#ffffff)：画线区、拼图板、次级按钮、输入框的「画布白」，比奶油纸更冷、更干净。
- **海上文字层次**（深海蓝底上）：主文字 #e9f6f4，次级 #cfe6e8，弱化 #9fd0cf。

### 拼板糖果色（固定，不可改动）

七块「现代智力七巧板」各有专属色，在全站图形、图例、自由拼图区保持一致（定义于 `src/tangram/geometry.ts`）：

- **圆形板** #ef7656 · **半圆板一** #f2bb51 · **半圆板二** #e89cbe · **三角板** #53a8c6 · **梯形板** #9290d4 · **中心板** #58ad83 · **曲形大板** #e48643

拼板在画布上以 28% 透明度叠印、深绿描边（`#557c6c`）；自由拼图区的选中态用主色实填。

### Named Rules

**深海描边规则。** 凡是「立起来」的表面——按钮、卡片、画板、计时器、钱包——必须有 2–2.5px 的深夜海军蓝实线描边。没有海军蓝描边的彩色块不属于这个世界（小标签等扁平胶囊除外）。

**金色只奖赏规则。** 阳光金只出现在奖励、成就、当前状态（当前导航/当前关卡）上。用它做普通装饰或危险提示都是破坏语义。

**虚线即留白规则。** 虚线描边专用于「还没有」的东西：未获得勋章、空状态、答案便签、火柴空位、目标轮廓、手账便签。实线是承诺，虚线是期待。

## Typography

**Display Font:** ZCOOL KuaiLe（站酷快乐体，回退 Nunito Variable / Noto Sans SC Variable）
**Body Font:** Nunito Variable + Noto Sans SC Variable（可变字重）
**Label/Mono Font:** 无独立字体；数字读数用 `font-variant-numeric: tabular-nums`（计时器、角度读数）

**Character:** 快乐体的手写涂鸦感负责「这是孩子的手账」，圆体感强、只用于标题和大数字；Nunito 的圆润几何感负责「这仍然是一个清楚的练习工具」。两者都是圆气质，从不混用场景。

### Hierarchy

- **Display**（ZCOOL KuaiLe 400，38px / 横幅 44px / 2K 屏 52px，行高 1.3，字距 0.01em）：页面 H1、横幅标语、关卡名、品牌字、大分数（88px，珊瑚红 + 2px 海军蓝描边 `paint-order: stroke fill`）、计时器数字、步骤气泡。
- **Headline**（Nunito 750–800，18–28px，行高 1.4，字距 -0.025em）：区块标题 H2/H3（`base.css` 默认，被快乐体覆盖时以快乐体为准）。
- **Title**（Nunito 700–800，14–17px）：卡片标题、关卡条目名、按钮文字（800）。
- **Body**（Nunito 500，15px 根字号（≥1800px 时 16px），行高 1.65）：说明文字、段落。段落颜色一律用 `--muted`（#4f6580）。
- **Label**（Nunito 700–800，11–13px）：面包屑、小标签（13px/700）、表头、时间戳。辅助性文字最小 11px（`accessibility.css` 强制），绝不更小。

### Named Rules

**快乐体不上正文规则。** ZCOOL KuaiLe 只出现在 H1–H3、品牌字、展示性大数字（分数/计时/步骤号）上；任何成段说明、按钮内长文案都用 Nunito。

## Layout

固定侧栏 + 居中主列的两栏手账结构。深海蓝侧栏固定在左（240px；≥1800px 时 260px；≤1150px 时 210px；≤900px 时 190px；≤650px 收起为抽屉 + 遮罩）。主内容区吃掉剩余宽度，水平内边距 `clamp(28px, 4vw, 72px)`，所有页面块（顶栏、横幅、卡片栅格、游戏面板……）统一 `max-width: 1720px` 居中——在 2K/超宽屏上既铺满又不过散。

- **栅格**：领域卡 3 列（≤650px 转 1 列，图改左置 117px 竖排）；竞赛套餐 3 列（≤1150px 2 列）；勋章 3 列（≤650px 2 列）；练习页 `205px 关卡选择器 + 1fr`（≤900px 纵向堆叠，选择器变横向滚动条）；画室双栏 `0.92fr / 1.08fr`（≤900px 单栏）；首页底部 `1.7fr / 1fr`。
- **节奏**：卡内边距 20–48px 随面板级别递增（游戏面板 20px → 横幅 36/48px）；区块间距 20–28px；顶栏高 84px。
- **断点**：1800px（2K 专属放大：根字号 16px、侧栏 260px）、1450px（基准增强）、1150px、900px（侧栏变窄、练习页堆叠）、650px（移动端：抽屉导航、单列）。
- **打印**：奖状有独立的 `@media print` 世界（白底、双线描金边、mm 单位排版），与屏幕世界互不干扰。

## Elevation & Depth

贴纸按压结构：深度由「硬投影 + 位移」这一对物理语言表达，柔和晕影只做环境衬托。硬投影永远是纯色不模糊的 `0 Npx 0 var(--sea)`，是贴纸贴在纸面上的厚度；柔和晕影（`rgba(22,49,79,0.16)` 系）叠在硬投影之下，负责大卡片的落影氛围。两者成对出现，不单独使用硬投影以外的高斯阴影。

### Shadow Vocabulary

- **贴纸静置** (`0 4px 0 var(--sea), 0 12px 24px -6px rgba(22,49,79,0.16)`，即 `--shadow`)：所有卡片、面板、领域卡、勋章（获得态）的默认深度。
- **主按钮** (`0 4px 0 var(--sea), 0 10px 20px -6px rgba(255,106,85,0.4)`)：珊瑚红的同色晕影代替海军蓝晕影，按压时降到 `0 2px 0`。
- **次级按钮** (`0 3px 0 var(--sea)`)：白贴纸薄一号；按压 `0 1px 0`。
- **工具钱包/计时器** (`0 3px 0 var(--sea)`)：胶囊贴纸。
- **火柴黑板** (`inset 0 0 0 6px var(--sea-2)` + `--shadow`)：内嵌一圈远海蓝是黑板独有的深度语言。
- **侧栏** (`6px 0 24px -10px rgba(22,49,79,0.4)`)：纯柔和晕影，硬投影会与主内容相撞。
- **模态** (`rgba(22,49,79,0.8)` 遮罩 + 大柔影)：深海军蓝 80% 遮罩压住整个海面。

### Named Rules

**贴纸按压规则。** 硬投影编码可按压性：静置 4px → hover 增至 6px 并 `translateY(-2px)`（上浮）→ active 降为 2px 并 `translateY(2px)`（陷落）。阴影变化必须与位移成对出现，禁止只动其一。

## Shapes

大圆角 + 粗描边 + 圆点是全部形状语言。圆角按表面级别分五档：输入框/工具钮 12px → 按钮 14px → 卡片 20px（领域卡 22px、游戏面板 26px）→ 大面板/横幅/弹窗 28px → 胶囊 999px（标签、钱包、计时器、进度条）。步骤气泡是正圆（42px）。头像、勋章徽章、路径站点都是圆形——「航海印章」感。

描边分三种语气：2–2.5px 实线海军蓝 = 立起来的实体；2px 虚线（海军蓝/金/灰蓝 `#a8c3c9`）= 留白与期待；1px 雾线 = 屏幕内的普通分隔。自由拼图区的目标轮廓用虚线路径直接画在画布上，是「虚线即留白」在画布内的延伸。

图标与插画全部是 SVG 线面结合：面用糖果色平涂，线用海军蓝，绝不出现渐变填充或投影滤镜（横幅大插画的重投影 `drop-shadow(0 12px 0 rgba(15,34,55,0.4))` 是唯一的装饰性阴影，属贴纸厚度语言）。

## Components

### 按钮（贴纸按钮）

厚实可按：有色底 + 2px 海军蓝描边 + 硬投影，按下会陷落。

- **Shape:** 圆角 14px，`min-height: 44px`，内边距 11px 18px，字重 800 / 15px
- **Primary（行动）:** 珊瑚红底 (#ff6a55) + 白字 + 海军蓝描边；hover 上浮变 #f25a44；active 陷落
- **Secondary（次级）:** 纯白底 + 海军蓝字与描边，`0 3px 0` 薄投影；hover 柔和金底 (#fff0bd) 上浮 1px
- **Sun（横幅 CTA）:** 阳光金底 + 海军蓝字，同主按钮物理；hover 变 #ffd45e
- **Text / Danger:** 无底色文字钮（#4f6580 → hover 海军蓝 + 金雾底）；危险操作用珊瑚红文字 (#b43a22)
- **Focus:** `outline: 3px solid var(--grape)`，offset 3px——全站统一

### 小标签（Chips）

- **Style:** 柔和葡萄底 (#e6e0ff) + 深紫字 (#3d2ca8)，胶囊 999px，13px/700，内边距 4px 12px
- **State:** 纯展示，无交互态；关卡进行中用柔和金底胶囊（level-status）

### 卡片 / 面板

- **Corner Style:** 卡片 20–22px，游戏面板 26px，横幅/弹窗 28px
- **Background:** 奶油纸 #fffaf0（内容卡）；画布区用纯白
- **Shadow Strategy:** `--shadow`（贴纸静置），见 Elevation
- **Border:** 2.5px 实线海军蓝；未获得勋章/空状态用 2.5px 虚线灰蓝
- **Internal Padding:** 游戏面板 20px；大面板 26–35px；领域卡内容区 18–21px
- **领域卡特例:** 头部插画区（132px 高）用柔和领域色打底（叶绿柔和/金柔和/葡萄柔和）+ 2.5px 海军蓝下边线

### 输入框 / 选择器

- **Style:** 纯白底 + 2px 海军蓝实线 + 圆角 12px，内边距 10–12px，`min-height: 44px`，caret 珊瑚红
- **Focus:** 全站统一葡萄紫外圈；无 glow
- **Disabled:** 按钮 `opacity: 0.5` + 默认光标

### 导航（深海航海日志侧栏）

- **Style:** 深夜海军蓝整栏 (#16314f)，品牌字用快乐体 + 白色，条目 15px/700 圆角 14px，右侧 9px 珊瑚红圆点做「未完成」标记
- **Default:** 文字 #cfe6e8；hover 白字 + 12% 白底
- **Active:** 阳光金底 + 海军蓝字（800 字重）+ `0 4px 0 -1px #c78f00` 压边投影——金色只奖赏规则的导航体现
- **Mobile (≤650px):** 侧栏变抽屉，`transform: translateX(-100%)`，配合 `nav-scrim` 遮罩

### 火柴黑板（签名组件）

火柴题的深海黑板：海军蓝底 + `inset 0 0 0 6px` 远海蓝内框 + 贴纸投影，木色火柴（#e7bc7e）配珊瑚红火柴头，被拿走的火柴留虚线幽灵（`stroke-dasharray: 3 5`），悬停金描边、选中亮黄 (#fff0a2)。算式中的关键数字用快乐体阳光金大字（32px）。这是「虚线即留白」与「金色只奖赏」在画布内的合体。

### 反馈条（Feedback）

成功：柔和叶绿底 + 深绿字 (#0b6b43)；重试：柔和金底 + 深金字 (#6b4b00)。都是 18px 圆角 + 2px 海军蓝描边，图标 + 标题 + 说明横排，星星用金色点亮。状态永远同时用文字与图形表达（PRODUCT.md 无障碍承诺）。

## Do's and Don'ts

### Do:

- **Do** 给每个新按钮/卡片补齐全套贴纸物理：2px 海军蓝描边 + `0 4px 0` 硬投影 + hover/active 的位移配对，`transition: 0.15s ease`。
- **Do** 保持 44px 最小触控目标与 `focus-visible` 葡萄紫外圈；新交互控件一律继承 `base.css` 的焦点样式。
- **Do** 新图形从拼板糖果色（7 色）与四强调色（金/珊瑚/叶绿/葡萄）中取色；中性结构一律海军蓝 + 雾线。
- **Do** 标题与大数字用 ZCOOL KuaiLe，正文用 Nunito + 思源黑体；计时器/角度等数字读数加 `font-variant-numeric: tabular-nums`。
- **Do** 新页面沿用「海雾底 + 奶油纸卡」双层结构，页面块 `max-width: 1720px` 居中。
- **Do** 用语义变量（`var(--sea)`、`var(--sun)`、`var(--coral)`……）取色；主题层只许覆盖值，不许改变量名。

### Don't:

- **Don't** 使用 `tokens.css` 里被退役的绿纸旧值（`#167c69` teal、`#d77d40` orange、`#f7f8f2` 底色）——那是被 `adventure.css` 覆盖前的世界；`--teal`/`--orange` 变量在主题下已分别解析为叶绿与珊瑚红。
- **Don't** 给按钮只加柔和阴影或只做位移——硬投影与位移必须成对（贴纸按压规则）。
- **Don't** 把阳光金用于普通装饰、错误提示或大面积背景——金色只属于奖励、成就与当前状态。
- **Don't** 用实线边框表达「未完成/空位」——那是虚线的语义（虚线即留白规则）。
- **Don't** 让快乐体出现在成段正文或按钮长文案中；辅助文字不要小于 11px。
- **Don't** 新增色板外的强调色相（荧光色、粉紫渐变等）；不做渐变填充插画；动效必须经受 `prefers-reduced-motion` 检查（全局已强制关闭）。
- **Don't** 打破「海雾底上放奶油纸卡」的层次——内容卡直接贴白底页面或给页面底换纯白都会让贴纸失去纸面。
