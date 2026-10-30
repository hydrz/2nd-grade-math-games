# 智慧小勇士 · 七巧板与火柴棒思维闯关

为低年级小朋友设计的数学思维训练应用：用同一套「现代智力七巧板」完成分解画线，用拿走、添加和移动火柴让算式成立，通过闯关与限时模拟竞赛培养空间思维。

## 功能特性

- **七巧板 · 分解**（图形探索岛）：先在自由拼图区拼一拼，再照轮廓画出七块的分割线；24 关，接受所有合法分解，内置拼法验证与逐步放大。
- **火柴棒挑战**（火柴思维谷）：拿走 / 添加 / 移动火柴使等式成立，60 关，空位保留虚线痕迹。
- **模拟竞赛**：15 分钟综合与专项限时赛，自动判分、生成大分数成绩单。
- **成长与荣誉**：勋章墙、错题复习、本机排行榜、可打印奖状。
- **零后端**：单昵称档案，LocalStorage 自动存档，支持导出 / 导入备份。

## 技术栈

React 18 · TypeScript · Vite 5 · react-router（Hash 路由）· 纯前端，无后端与数据库。

几何验证使用 jsts 与 polygon-clipping（独立 chunk）；图标用 lucide-react；字体通过 @fontsource 自托管（ZCOOL KuaiLe / Nunito / Noto Sans SC）。

视觉系统见 [DESIGN.md](DESIGN.md)（航海探险手账：深海描边、贴纸按压、糖果拼板色），产品定义见 [PRODUCT.md](PRODUCT.md)。

## 本地开发

```sh
npm install

npm run dev        # 开发服务器，http://localhost:5173
npm run build      # 类型检查 + 生产构建，产物在 dist/
npm run preview    # 本地预览构建产物
```

## 测试

```sh
npm run test       # Vitest 单元测试（src/**/*.test.ts：路由、引擎、存档、音效）
npm run test:e2e   # Playwright 端到端测试
```

E2E 覆盖桌面（Desktop Chrome）与平板（iPad 横屏）两个视图，自动拉起 `127.0.0.1:5174` 的 vite 服务（`reuseExistingServer`）。

## 代码质量

```sh
npm run lint        # oxlint 检查
npm run lint:fix    # oxlint 自动修复
npm run format      # oxfmt 格式化
npm run format:check
```

## 关卡数据维护

`scripts/` 下提供一组 Python 工具，用于从题图提取与校验七巧板原始造型、火柴题数据及参考目标（`author-originals.py`、`extract-exam.py`、`infer-center.py`、`recover-reference.py`、`verify-reference-targets.py`）。

## 部署

使用 EdgeOne Pages 部署：

```sh
npm run edgeone:deploy
```

[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?template=vite-react)
