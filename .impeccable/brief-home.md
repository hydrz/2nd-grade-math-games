# 首页 · 闯关地图（启程甲板）

**Scope**: 仅首页路由（App.tsx `page === 'home'` 段）及其样式；访客模式 **Operate**（孩子完成任务：知道下一站并出发），语气保持轻冒险。

**Audience / Job**: 二年级孩子（7-8 岁），平板横屏或电脑，放学后短时段使用。任务 = 3 秒内知道"练到哪了、下一步做什么"并点下去。

**Action / Proof**: 主动作 = 出发票上的「继续探险」直达当前关。证明 = 真实存档数据（两岛进度、星星、自动算出的下一关），不发明任何商业或事实性声明。

**Constraints**: 沿用探险手账视觉世界与全部既有 token；44px 最小操作目标；状态文字+图形双表达；`prefers-reduced-motion`；无新依赖；e2e 契约：`/出发吧/` 标题、`.resume-banner`、无横向溢出。

**Chosen direction**: 启程甲板——首页是一张「今天的启程牌」。焦点时刻 = 出发票。

**Unresolved→resolved**: ①「下一站」规则 = 进度更深的岛优先（并列取图形探索岛；全部通关则出发票转向竞赛/错题复习）；② 6 站迷你足迹撤销，进度表达由舱位行进度条承担；③ gentle-footer 保留作页面收尾。

## Direction contract

**THESIS**: 首页是一张「今天的启程牌」：打开即回答"下一站去哪"，拒绝"欢迎横幅 + 菜单"的两段式；每个板块都为"出发"这一个动作服务。

**OWN-WORLD**: 探险手账不变——深海蓝 `--sea` 描边贴纸卡与 `0 4px 0 var(--sea)` 下沉按压、薄荷波点底、阳光黄/珊瑚红强调、ZCOOL KuaiLe 标题 + Nunito/Noto Sans SC 正文；出发票用票据打孔边与"下一站"邮戳章。

**STORY**: 孩子打开页面就知道自己练到哪、下一关是哪个岛什么题型，一键直达；两条舱位行让换岛只需一次点击；竞赛是"船长的邀请"。

**FIRST VIEWPORT**: 顶部问候行（h1「出发吧，{昵称}！」+ 星星徽章）→ 整宽出发票（约占首屏 40%）：左侧票面（「下一站」小标 + 岛名·关名 + 题型标签 + 珊瑚红「继续探险」大按钮位于票面左下），右侧 MiniTangram 彩色插画与浮动邮戳；票下两条舱位行开始露头。

**FORM**: 启程甲板——我方 7 个结构候选的第 7 位（concept-seed key 67f0b086，dealt lead，THE ROLL；code-led）。

**SIGNATURE**: 签名交互 = 出发票「继续探险」的贴纸按压（既有 hover 抬起/按下下沉语法）+ 票面邮戳章的轻微浮动（唯一新增动效，reduced-motion 停用）。动效语法仅此一套，不散落。

**FINISH**: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
