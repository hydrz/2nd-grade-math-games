import { useEffect, useRef, useState } from 'react'
import { HashRouter, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudCheck,
  Compass,
  Flag,
  Flame,
  Home,
  LockKeyhole,
  Menu,
  Mountain,
  Pencil,
  Play,
  Settings2,
  Shapes,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Trash2,
  Trophy,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { MiniTangram } from './components/PuzzleCanvas'
import { GamePanel } from './components/GamePanel'
import { checkGame, kindIcon, kindLabel } from './games'
import { TANGRAMS } from './tangrams'
import { MATCHES, operationLabel } from './matches'
import {
  STORAGE_KEY,
  downloadText,
  emptyDraft,
  examLabel,
  freshSave,
  levelKey,
  loadSave,
  makeCompetition,
  parseSave,
  persistSave,
  settleCompetition,
  starsFor,
  validDraft,
} from './storage'
import { buildPath, parseRoute, type GrowthTab, type MatchOperation, type Page } from './routes'
import { sorted } from './collections'
import { playSound, setSoundEnabled } from './sound'
import type { CheckResult, Draft, ExamType, GameKind, SaveData } from './types'
import './App.css'
import './game.css'
import './growth.css'
import './responsive.css'
import './accessibility.css'

const counts = { draw: TANGRAMS.length, match: 60 }
const realms = [
  {
    kind: 'draw' as const,
    name: '图形探索岛',
    description: '一支笔，发现图形里的秘密',
    color: 'teal',
    label: '观察力 × 空间想象',
  },
  {
    kind: 'match' as const,
    name: '火柴思维谷',
    description: '小小一根火柴，大大的可能',
    color: 'purple',
    label: '逻辑力 × 数字挑战',
  },
]
const formatTime = (seconds: number) =>
  `${Math.floor(Math.max(0, seconds) / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(Math.max(0, seconds) % 60)
    .toString()
    .padStart(2, '0')}`
function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value}颗星`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i < value ? 'currentColor' : 'none'}
          className={i < value ? 'lit' : ''}
        />
      ))}
    </span>
  )
}

export function AppContent() {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const route = parseRoute(location.pathname, location.search)
  const page = route.page,
    growthTab = route.growthTab,
    operation = route.operation

  const [loaded] = useState(loadSave),
    [data, setData] = useState(loaded.data),
    [warning, setWarning] = useState(loaded.warning)
  const protectedSave = useRef(!!loaded.warning),
    dataRef = useRef(data)
  const [mobileNav, setMobileNav] = useState(false),
    [settings, setSettings] = useState(false),
    [help, setHelp] = useState(false)
  const [rankingType, setRankingType] = useState<ExamType>('mixed'),
    [now, setNow] = useState(Date.now),
    [resultScore, setResultScore] = useState<number | null>(null)
  const [saveLabel, setSaveLabel] = useState('进度已自动保存')

  useEffect(() => {
    setSoundEnabled(data.settings.sound)
  }, [data.settings.sound])

  function toggleSound() {
    const on = !data.settings.sound
    setSoundEnabled(on)
    update((s) => ({ ...s, settings: { ...s.settings, sound: on } }))
    if (on) playSound('star')
  }

  function update(fn: (current: SaveData) => SaveData) {
    const next = fn(dataRef.current)
    dataRef.current = next
    setData(next)
    if (!protectedSave.current) {
      const error = persistSave(next)
      if (error) {
        setWarning(error)
        setSaveLabel('暂未保存，请导出备份')
      } else setSaveLabel('进度已自动保存')
    }
  }

  const completed = (kind: GameKind) =>
    Object.keys(data.stars).filter((k) => k.startsWith(`${kind}:`)).length
  const totalStars = Object.values(data.stars).reduce((sum, v) => sum + v, 0),
    totalDone = Object.keys(data.stars).length
  const nextLevel = (kind: 'draw' | 'match') => {
    let n = 0
    while (n < counts[kind] - 1 && data.stars[levelKey(kind, n)]) n++
    return n
  }

  const practiceKind = page === 'draw' || page === 'match' ? page : null
  const level = practiceKind
    ? route.levelIndex !== undefined
      ? Math.max(0, Math.min(counts[practiceKind] - 1, route.levelIndex))
      : nextLevel(practiceKind)
    : 0

  useEffect(() => {
    if (practiceKind && route.levelIndex === undefined) {
      routerNavigate(buildPath(practiceKind, level, undefined, operation), { replace: true })
    }
  }, [practiceKind, route.levelIndex, level, operation, routerNavigate])

  function navigate(next: Page, index?: number, tab?: GrowthTab, op?: MatchOperation) {
    setMobileNav(false)
    setResultScore(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
    const targetIndex =
      next === 'draw' || next === 'match' ? (index ?? nextLevel(next)) : undefined
    routerNavigate(
      buildPath(next, targetIndex, tab, op ?? (next === 'match' ? operation : undefined)),
    )
  }

  function recordResult(kind: GameKind, index: number, results: CheckResult[], draft: Draft) {
    const key = levelKey(kind, index),
      success = results.every((r) => r.ok)
    update((s) => {
      if (success && draft.completed) return s
      const nextDraft = { ...draft, completed: success, errors: draft.errors + (success ? 0 : 1) },
        star = success ? starsFor(draft) : 0
      const next = {
        ...s,
        drafts: { ...s.drafts, [key]: nextDraft },
        stars: star ? { ...s.stars, [key]: Math.max(s.stars[key] || 0, star) } : s.stars,
      }
      if (!success) {
        const existing = s.mistakes.find((m) => m.puzzleId === key)
        const item = {
          id: existing?.id || `wrong-${Date.now()}`,
          kind,
          puzzleId: key,
          reason: results
            .filter((r) => !r.ok)
            .map((r) => r.message)
            .join(' '),
          snapshot: draft,
          date: Date.now(),
          streak: 0,
          reviews: existing?.reviews || 0,
        }
        next.mistakes = [...s.mistakes.filter((m) => m.puzzleId !== key), item]
      } else if (!draft.revealed && draft.hints === 0)
        next.mistakes = s.mistakes.map((m) =>
          m.puzzleId === key ? { ...m, streak: m.streak + 1, reviews: m.reviews + 1 } : m,
        )
      return next
    })
  }

  function finishExam() {
    const session = dataRef.current.competition
    if (!session) return
    const checks = session.tasks.flatMap((t) => checkGame(t.kind, t.index, t.draft)),
      correct = checks.filter((r) => r.ok).length,
      score = Math.round((correct / checks.length) * 100)
    update((s) => {
      const next = settleCompetition(s, score),
        mistakes = [...next.mistakes]
      for (const t of session.tasks) {
        const results = checkGame(t.kind, t.index, t.draft),
          key = levelKey(t.kind, t.index)
        if (results.some((r) => !r.ok) && !mistakes.some((m) => m.puzzleId === key))
          mistakes.push({
            id: `${session.id}-${key}`,
            kind: t.kind,
            puzzleId: key,
            reason: results
              .filter((r) => !r.ok)
              .map((r) => r.message)
              .join(' '),
            snapshot: t.draft,
            date: Date.now(),
            streak: 0,
            reviews: 0,
          })
      }
      return { ...next, mistakes }
    })
    setResultScore(score)
    playSound(score >= 80 ? 'fanfare' : 'success')
  }

  const finishRef = useRef(finishExam)
  useEffect(() => {
    finishRef.current = finishExam
  })
  useEffect(() => {
    const tick = () => {
      const time = Date.now()
      setNow(time)
      if (dataRef.current.competition && time >= dataRef.current.competition.deadline)
        finishRef.current()
    }
    tick()
    const timer = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  function exportSave() {
    downloadText(
      protectedSave.current
        ? localStorage.getItem(STORAGE_KEY) || JSON.stringify(data)
        : JSON.stringify(data, null, 2),
      `智慧小勇士-${new Date().toISOString().slice(0, 10)}.json`,
    )
  }
  async function importSave(file: File | undefined) {
    if (!file) return
    try {
      const next = parseSave(await file.text())
      if (!confirm('导入后将替换这台设备上的练习记录，是否继续？')) return
      protectedSave.current = false
      update(() => next)
      setSettings(false)
      setWarning('')
      navigate('home')
    } catch (e) {
      setWarning(e instanceof Error ? e.message : '这份存档无法读取。')
    }
  }

  function printCertificate(id: string) {
    const score = data.scores.find((s) => s.id === id),
      target = document.getElementById('certificate-print')
    if (!score || !target) return
    target.querySelector('[data-name]')!.textContent = data.nickname
    target.querySelector('[data-score]')!.textContent = `${score.score}分`
    target.querySelector('[data-date]')!.textContent = new Date(score.date).toLocaleDateString(
      'zh-CN',
    )
    window.print()
  }

  const medals = [
    { name: '勇敢出发', detail: '完成第一关', earned: totalDone >= 1, icon: Flag },
    {
      name: '图形侦探',
      detail: '完成全部分解关卡',
      earned: completed('draw') >= counts.draw,
      icon: Pencil,
    },
    {
      name: '火柴魔法师',
      detail: '完成全部火柴关卡',
      earned: completed('match') >= 60,
      icon: Flame,
    },
    { name: '闪亮收藏家', detail: '累计获得30颗星', earned: totalStars >= 30, icon: Star },
    {
      name: '思维小冠军',
      detail: '综合竞赛达到80分',
      earned: data.scores.some((s) => s.type === 'mixed' && s.score >= 80),
      icon: Trophy,
    },
  ]

  const session = data.competition,
    task = session?.tasks[session.current]
  const filteredLevels = practiceKind
    ? Array.from({ length: counts[practiceKind] }, (_, i) => i).filter(
        (i) =>
          practiceKind !== 'match' || operation === 'all' || MATCHES[i].operation === operation,
      )
    : []

  return (
    <>
      <div className="app-shell">
        <button
          className="mobile-menu tool"
          aria-label="打开导航"
          onClick={() => setMobileNav(!mobileNav)}
        >
          <Menu />
        </button>
        {mobileNav && (
          <button className="nav-scrim" aria-label="关闭导航" onClick={() => setMobileNav(false)} />
        )}
        <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
          <button className="brand" onClick={() => navigate('home')}>
            <span className="brand-mark">
              <Shapes size={29} strokeWidth={2.2} />
            </span>
            <span>
              智慧小勇士<small>每个想法，都有光</small>
            </span>
          </button>
          <nav aria-label="主要导航">
            {[
              { key: 'home' as const, label: '闯关地图', icon: Compass },
              { key: 'draw' as const, label: '七巧板 · 分解', icon: Pencil },
              { key: 'match' as const, label: '火柴棒挑战', icon: Flame },
            ].map((item) => (
              <button
                key={item.key}
                className={page === item.key ? 'nav-item active' : 'nav-item'}
                onClick={() => navigate(item.key)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {page === item.key && <span className="nav-dot" />}
              </button>
            ))}
            <span className="nav-divider" />
            <button
              className={page === 'contest' ? 'nav-item active' : 'nav-item'}
              onClick={() => navigate('contest')}
            >
              <Timer size={20} />
              <span>模拟竞赛</span>
              {session && <span className="live-dot" />}
            </button>
            <button
              className={page === 'growth' ? 'nav-item active' : 'nav-item'}
              onClick={() => navigate('growth')}
            >
              <Award size={20} />
              <span>成长与荣誉</span>
            </button>
          </nav>
          <div className="sidebar-bottom">
            <div className="journey-note">
              <Mountain size={28} />
              <p>
                不用着急，
                <br />
                每一步都算进步。
              </p>
              <span>今天也为自己加油！</span>
            </div>
            <button className="nav-item" onClick={() => setHelp(true)}>
              <CircleHelp size={19} />
              玩法小指南
            </button>
            <button className="profile" onClick={() => setSettings(true)}>
              <span className="avatar">{data.nickname.slice(0, 1)}</span>
              <span>
                <strong>{data.nickname}</strong>
                <small>我的探险档案</small>
              </span>
              <Settings2 size={17} />
            </button>
          </div>
        </aside>
        <main className="main-content">
          <header className="topbar">
            <div className="breadcrumb">
              <Home size={15} />
              <span>智慧训练营</span>
              <ChevronRight size={14} />
              <strong>
                {page === 'home'
                  ? '闯关地图'
                  : page === 'contest'
                    ? '模拟竞赛'
                    : page === 'growth'
                      ? '成长与荣誉'
                      : kindLabel[page]}
              </strong>
            </div>
            <div className="topbar-status">
              <button
                className={data.settings.sound ? 'tool sound-toggle active' : 'tool sound-toggle'}
                aria-label={data.settings.sound ? '关闭音效' : '开启音效'}
                aria-pressed={data.settings.sound}
                title={data.settings.sound ? '关闭音效' : '开启音效'}
                onClick={toggleSound}
              >
                {data.settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <span className="autosave">
                <CloudCheck size={16} />
                {saveLabel}
              </span>
              <span className="star-wallet">
                <Star size={17} fill="currentColor" />
                {totalStars}
                <small>颗星</small>
              </span>
            </div>
          </header>
          {warning && (
            <div className="storage-warning" role="alert">
              <strong>{warning}</strong>
              <button className="secondary" onClick={exportSave}>
                导出备份
              </button>
              <button className="tool" aria-label="关闭提示" onClick={() => setWarning('')}>
                <X size={18} />
              </button>
            </div>
          )}
          {session && page !== 'contest' && (
            <button className="resume-banner" onClick={() => navigate('contest')}>
              <Timer size={18} />
              你的{examLabel[session.type]}还在进行，剩余{' '}
              {formatTime((session.deadline - now) / 1000)}
              <span>
                返回比赛
                <ArrowRight size={16} />
              </span>
            </button>
          )}
          {page === 'home' && (
            <>
              <div className="page-title">
                <div>
                  <h1>
                    出发吧，{data.nickname}！
                    <span className="greeting-spark">
                      <Sparkles size={29} />
                    </span>
                  </h1>
                  <p>观察、尝试、再想一想，新的发现就在下一关。</p>
                </div>
                <span className="date-pill">
                  <Compass size={16} />
                  每一步，都是新发现
                </span>
              </div>
              <section className="welcome-banner">
                <div className="welcome-copy">
                  <span className="banner-ticket">
                    <Flag size={14} />
                    你的思维探险，正在继续
                  </span>
                  <h2>
                    小小脑袋，
                    <br />
                    装着大大的可能。
                  </h2>
                  <p>
                    用七块拼板探索形状，用一根火柴点亮灵感。
                    <br className="desktop-break" />
                    准备好了吗？今天的挑战等着你。
                  </p>
                  <button className="white-button" onClick={() => navigate('draw')}>
                    <Play size={17} fill="currentColor" />
                    {totalDone ? '继续我的探险' : '开始第一关'}
                    <ArrowRight size={18} />
                  </button>
                </div>
                <div className="banner-geometry">
                  <MiniTangram puzzle={TANGRAMS[5]} colored />
                  <span className="geometry-label">七块拼板 · 无限可能</span>
                  <span className="floating-star">
                    <Star size={26} fill="currentColor" />
                  </span>
                  <span className="floating-small">
                    <Sparkles size={20} />
                  </span>
                </div>
              </section>
              <div className="section-title">
                <h2>今天，想挑战什么？</h2>
                <span>选一个喜欢的方向，开始探索</span>
              </div>
              <section className="realm-grid">
                {realms.map((r) => (
                  <button
                    className={`realm ${r.color}`}
                    key={r.kind}
                    onClick={() => navigate(r.kind)}
                  >
                    <div className="realm-art">
                      {r.kind === 'match' ? (
                        <svg viewBox="0 0 220 100" aria-hidden="true">
                          <g stroke="#b97a49" strokeWidth="7" strokeLinecap="round">
                            {[
                              [36, 22, 78, 22],
                              [83, 28, 83, 47],
                              [36, 52, 78, 52],
                              [83, 58, 83, 78],
                              [36, 84, 78, 84],
                              [106, 52, 134, 52],
                              [120, 38, 120, 66],
                              [153, 24, 185, 24],
                              [190, 30, 190, 77],
                              [153, 83, 185, 83],
                            ].map((p, i) => (
                              <line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} />
                            ))}
                          </g>
                          <g fill="#df7553">
                            {[
                              [78, 22],
                              [83, 47],
                              [78, 52],
                              [83, 78],
                              [78, 84],
                              [134, 52],
                              [120, 66],
                              [185, 24],
                              [190, 77],
                              [185, 83],
                            ].map((p, i) => (
                              <circle key={i} cx={p[0]} cy={p[1]} r="4.5" />
                            ))}
                          </g>
                        </svg>
                      ) : (
                        <MiniTangram puzzle={TANGRAMS[8]} />
                      )}
                    </div>
                    <div className="realm-content">
                      <span className="realm-label">{r.label}</span>
                      <h3>
                        {r.name}
                        <ArrowRight size={19} />
                      </h3>
                      <p>{r.description}</p>
                      <div className="realm-progress">
                        <span style={{ width: `${(completed(r.kind) / counts[r.kind]) * 100}%` }} />
                      </div>
                      <div className="realm-meta">
                        <span>{kindLabel[r.kind]}</span>
                        <strong>
                          {completed(r.kind)}
                          <small> / {counts[r.kind]} 关</small>
                        </strong>
                      </div>
                    </div>
                  </button>
                ))}
              </section>
              <section className="home-bottom">
                <div className="next-adventure">
                  <div className="section-title">
                    <h2>我的探险足迹</h2>
                    <span>
                      {completed('draw')} / {counts.draw} 关
                    </span>
                  </div>
                  <p>图形探索岛 · 把观察变成你的超能力</p>
                  <div className="path-map">
                    <svg viewBox="0 0 650 110" preserveAspectRatio="none" aria-hidden="true">
                      <path
                        d="M35 65 C100 5 130 5 185 52 S270 105 320 56 S410 5 470 55 S555 105 615 45"
                        fill="none"
                        stroke="#cbd9cb"
                        strokeWidth="3"
                        strokeDasharray="6 8"
                      />
                    </svg>
                    {Array.from({ length: 6 }, (_, i) => {
                      const done = data.stars[levelKey('draw', i)],
                        unlocked = i <= nextLevel('draw')
                      return (
                        <button
                          key={i}
                          className={`path-stop stop-${i} ${done ? 'done' : unlocked ? 'current' : 'locked'}`}
                          disabled={!unlocked}
                          onClick={() => navigate('draw', i)}
                          aria-label={`分解第${i + 1}关${unlocked ? '' : '，未解锁'}`}
                        >
                          <span>
                            {done ? (
                              <Check size={22} />
                            ) : unlocked ? (
                              <Flag size={21} />
                            ) : (
                              <LockKeyhole size={17} />
                            )}
                          </span>
                          <small>第{i + 1}关</small>
                          {done && <Stars value={done} size={10} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="contest-invite">
                  <div className="contest-icon">
                    <Trophy size={30} />
                  </div>
                  <h3>来一场思维挑战赛？</h3>
                  <p>
                    15分钟，挑战更专注的自己。
                    <br />
                    还有专属荣誉奖状等你来拿。
                  </p>
                  <button className="secondary" onClick={() => navigate('contest')}>
                    进入模拟竞赛
                    <ArrowRight size={16} />
                  </button>
                </div>
              </section>
              <div className="gentle-footer">
                <ShieldCheck size={16} />
                只和昨天的自己比，今天又进步了一点点。
              </div>
            </>
          )}
          {practiceKind && (
            <>
              <div className="page-title">
                <div>
                  <h1>{realms.find((r) => r.kind === practiceKind)!.name}</h1>
                  <p>{kindLabel[practiceKind]} · 不限时间，慢慢想也很棒。</p>
                </div>
                <span className="level-status">
                  已完成 {completed(practiceKind)} / {counts[practiceKind]} 关
                </span>
              </div>
              <div className="practice-layout">
                <aside className="level-picker">
                  <div className="picker-heading">
                    <Flag size={17} />
                    <strong>选择关卡</strong>
                  </div>
                  {practiceKind === 'match' && (
                    <select
                      aria-label="筛选火柴题型"
                      value={operation}
                      onChange={(e) =>
                        navigate('match', level, undefined, e.target.value as MatchOperation)
                      }
                    >
                      <option value="all">全部题型</option>
                      <option value="remove">拿走火柴</option>
                      <option value="add">添加火柴</option>
                      <option value="move">移动火柴</option>
                    </select>
                  )}
                  <div className="level-list">
                    {filteredLevels.map((i) => {
                      const stars = data.stars[levelKey(practiceKind, i)] || 0,
                        unlocked = i <= nextLevel(practiceKind)
                      return (
                        <button
                          className={`level-item ${level === i ? 'active' : ''}`}
                          key={i}
                          disabled={!unlocked}
                          onClick={() => navigate(practiceKind, i)}
                        >
                          <span className="level-number">
                            {unlocked ? i + 1 : <LockKeyhole size={14} />}
                          </span>
                          <span>
                            <strong>
                              {practiceKind === 'draw'
                                ? TANGRAMS[i].name
                                : `${operationLabel[MATCHES[i].operation]}${MATCHES[i].count}根火柴`}
                            </strong>
                            <Stars value={stars} size={12} />
                          </span>
                          {level === i && <ChevronRight size={15} />}
                        </button>
                      )
                    })}
                  </div>
                </aside>
                <div className="practice-main">
                  <div className="exercise-title">
                    <span className="exercise-number">
                      第 {String(level + 1).padStart(2, '0')} 关
                    </span>
                    <strong>
                      {practiceKind === 'draw'
                        ? TANGRAMS[level].name
                        : `${operationLabel[MATCHES[level].operation]}${MATCHES[level].count}根的巧思`}
                    </strong>
                    <Stars value={data.stars[levelKey(practiceKind, level)] || 0} />
                  </div>
                  <GamePanel
                    key={`${practiceKind}-${level}`}
                    kind={practiceKind}
                    index={level}
                    draft={data.drafts[levelKey(practiceKind, level)] || emptyDraft()}
                    onDraft={(draft) =>
                      update((s) => ({
                        ...s,
                        drafts: { ...s.drafts, [levelKey(practiceKind, level)]: draft },
                      }))
                    }
                    onResult={(r, d) => recordResult(practiceKind, level, r, d)}
                    onNext={
                      level < counts[practiceKind] - 1
                        ? () => navigate(practiceKind, level + 1)
                        : undefined
                    }
                  />
                </div>
              </div>
            </>
          )}
          {page === 'contest' && (
            <>
              <div className="page-title">
                <div>
                  <h1>{session ? examLabel[session.type] : '思维挑战赛'}</h1>
                  <p>
                    {session
                      ? '每一道题都是新机会。作答会自动保存，切换页面也不会暂停计时。'
                      : '15分钟专注挑战，为努力的自己赢得一张荣誉奖状。'}
                  </p>
                </div>
                {session && (
                  <span className={`exam-timer ${session.deadline - now < 60000 ? 'urgent' : ''}`}>
                    <Timer size={22} />
                    {formatTime((session.deadline - now) / 1000)}
                  </span>
                )}
              </div>
              {resultScore !== null && (
                <section className="exam-result" role="status">
                  <Trophy size={52} />
                  <h2>挑战完成，为你的专注喝彩！</h2>
                  <div className="big-score">
                    {resultScore}
                    <small>分</small>
                  </div>
                  <p>
                    {resultScore >= 80
                      ? '你发现了很多巧妙的解法，继续保持这份好奇心。'
                      : '每一次挑战都在进步。到错题本里，再和这些题交个朋友。'}
                  </p>
                  <div>
                    <button
                      className="primary"
                      onClick={() => navigate('growth', undefined, 'scores')}
                    >
                      查看我的成绩
                      <ArrowRight size={17} />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => navigate('growth', undefined, 'mistakes')}
                    >
                      去错题本复习
                    </button>
                  </div>
                </section>
              )}
              {session && task ? (
                <>
                  <div className="exam-navigation">
                    {session.tasks.map((t, i) => (
                      <button
                        key={i}
                        className={session.current === i ? 'active' : ''}
                        onClick={() =>
                          update((s) => ({
                            ...s,
                            competition: s.competition ? { ...s.competition, current: i } : null,
                          }))
                        }
                      >
                        {i + 1}
                        <small>{t.kind === 'draw' ? '分解' : '火柴'}</small>
                      </button>
                    ))}
                    <button
                      className="submit-exam"
                      onClick={() => {
                        if (confirm('确定交卷吗？交卷后会立即判分。')) finishExam()
                      }}
                    >
                      交卷
                      <Check size={17} />
                    </button>
                  </div>
                  <GamePanel
                    key={`${session.id}-${session.current}`}
                    kind={task.kind}
                    index={task.index}
                    draft={task.draft}
                    exam
                    onResult={() => {}}
                    onDraft={(draft) =>
                      update((s) => ({
                        ...s,
                        competition: s.competition
                          ? {
                              ...s.competition,
                              tasks: s.competition.tasks.map((t, i) =>
                                i === s.competition!.current ? { ...t, draft } : t,
                              ),
                            }
                          : null,
                      }))
                    }
                  />
                </>
              ) : (
                <>
                  {resultScore === null && (
                    <section className="contest-feature">
                      <div>
                        <Trophy size={38} />
                        <h2>
                          让好奇心，
                          <br />
                          带你走得更远。
                        </h2>
                        <p>
                          七巧板分解 × 火柴算式
                          <br />
                          综合卷满分100分，达到80分即可获得荣誉奖状。
                        </p>
                      </div>
                      <div className="exam-rules">
                        <span>
                          <Clock3 />
                          固定15分钟
                        </span>
                        <span>
                          <BookOpen />
                          作答中不提供提示
                        </span>
                        <span>
                          <CloudCheck />
                          离开后计时继续
                        </span>
                        <span>
                          <Award />
                          记录本机最好成绩
                        </span>
                      </div>
                    </section>
                  )}
                  <div className="exam-options">
                    {(['mixed', 'draw', 'match'] as const).map((type) => (
                      <button
                        className={`exam-option ${type === 'mixed' ? 'featured' : ''}`}
                        key={type}
                        onClick={() => {
                          setResultScore(null)
                          update((s) => ({ ...s, competition: makeCompetition(type) }))
                        }}
                      >
                        <span className="exam-option-icon">
                          {type === 'mixed' ? (
                            <Trophy size={25} />
                          ) : (
                            (() => {
                              const Icon = kindIcon[type]
                              return <Icon size={25} />
                            })()
                          )}
                        </span>
                        <h3>{examLabel[type]}</h3>
                        <p>
                          {type === 'mixed'
                            ? '6题分解＋4题火柴'
                            : type === 'draw'
                              ? '6道分解题'
                              : '10道火柴棒算式题'}
                        </p>
                        <span>
                          开始挑战
                          <ArrowRight size={17} />
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {page === 'growth' && (
            <>
              <div className="page-title">
                <div>
                  <h1>每一份努力，都值得被看见</h1>
                  <p>这里记录着你的发现、成长和闪闪发亮的时刻。</p>
                </div>
                <button className="secondary" onClick={() => setSettings(true)}>
                  <Settings2 size={17} />
                  档案与存档
                </button>
              </div>
              <div className="growth-overview">
                <span className="growth-avatar">{data.nickname.slice(0, 1)}</span>
                <div>
                  <h2>{data.nickname}的成长手册</h2>
                  <p>
                    已完成 {totalDone} 关，收获 {totalStars} 颗星。慢慢来，也能走很远。
                  </p>
                </div>
                <div className="overview-stars">
                  <Star size={33} fill="currentColor" />
                  <strong>{totalStars}</strong>
                  <span>累计星星</span>
                </div>
              </div>
              <div className="tabs" role="tablist">
                {[
                  { id: 'medals' as const, name: '荣耀勋章墙', icon: Award },
                  {
                    id: 'mistakes' as const,
                    name: `错题练习本 · ${data.mistakes.filter((m) => m.streak < 2).length}`,
                    icon: BookOpen,
                  },
                  { id: 'scores' as const, name: '我的成绩榜', icon: Trophy },
                ].map((t) => (
                  <button
                    role="tab"
                    aria-selected={growthTab === t.id}
                    key={t.id}
                    className={growthTab === t.id ? 'active' : ''}
                    onClick={() => navigate('growth', undefined, t.id)}
                  >
                    <t.icon size={18} />
                    {t.name}
                  </button>
                ))}
              </div>
              {growthTab === 'medals' && (
                <>
                  <div className="medal-grid">
                    {medals.map((m) => (
                      <div className={`medal ${m.earned ? 'earned' : ''}`} key={m.name}>
                        <span className="medal-emblem">
                          <m.icon size={34} strokeWidth={1.8} />
                        </span>
                        <h3>{m.name}</h3>
                        <p>{m.detail}</p>
                        <span className="medal-state">
                          {m.earned ? (
                            <>
                              <CheckCircle2 size={14} />
                              已点亮
                            </>
                          ) : (
                            <>
                              <LockKeyhole size={13} />
                              等待你的挑战
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <section className="certificate-section">
                    <div>
                      <h2>
                        <Award size={22} />
                        我的荣誉奖状
                      </h2>
                      <p>综合竞赛达到80分，就能获得一张写着你名字的奖状。</p>
                    </div>
                    {data.certificates.length ? (
                      data.certificates.map((id) => {
                        const score = data.scores.find((s) => s.id === id)
                        return (
                          score && (
                            <button
                              className="certificate-button"
                              key={id}
                              onClick={() => printCertificate(id)}
                            >
                              <Award size={25} />
                              <span>
                                思维小勇士 · {score.score}分
                                <small>{new Date(score.date).toLocaleDateString('zh-CN')}</small>
                              </span>
                              <ArrowDownToLine size={18} />
                              打印奖状
                            </button>
                          )
                        )
                      })
                    ) : (
                      <span className="empty-certificate">第一张奖状，等你来点亮</span>
                    )}
                  </section>
                </>
              )}
              {growthTab === 'mistakes' &&
                (data.mistakes.length ? (
                  <div className="mistake-list">
                    {sorted(data.mistakes, (a, b) => a.streak - b.streak || b.date - a.date).map(
                      (m) => (
                        <article key={m.id}>
                          <span className={`mistake-symbol ${m.streak >= 2 ? 'mastered' : ''}`}>
                            {m.streak >= 2 ? <CheckCircle2 size={22} /> : <BookOpen size={22} />}
                          </span>
                          <div>
                            <h3>
                              {kindLabel[m.kind]} · 第{Number(m.puzzleId.split(':')[1]) + 1}关
                              <span className="small-tag">
                                {m.streak >= 2
                                  ? '已掌握'
                                  : `独立答对 ${Math.min(2, m.streak)} / 2 次`}
                              </span>
                            </h3>
                            <p>{m.reason}</p>
                            <small>
                              复习{m.reviews}次 · {new Date(m.date).toLocaleDateString('zh-CN')}
                            </small>
                          </div>
                          <button
                            className="secondary"
                            onClick={() => {
                              const snapshot = m.snapshot
                              if (validDraft(snapshot))
                                update((s) => ({
                                  ...s,
                                  drafts: {
                                    ...s.drafts,
                                    [m.puzzleId]: {
                                      ...snapshot,
                                      hints: 0,
                                      revealed: false,
                                      errors: 0,
                                    },
                                  },
                                }))
                              navigate(m.kind, Number(m.puzzleId.split(':')[1]))
                            }}
                          >
                            再练一次
                            <ArrowRight size={15} />
                          </button>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <BookOpen size={45} />
                    <h2>错题本还是空白的</h2>
                    <p>遇到暂时没想通的题，也没关系。它们会在这里等你再试一次。</p>
                    <button className="primary" onClick={() => navigate('match')}>
                      去发现新挑战
                      <ArrowRight size={17} />
                    </button>
                  </div>
                ))}
              {growthTab === 'scores' && (
                <section className="leaderboard">
                  <div className="leaderboard-heading">
                    <h2>和昨天的自己，来场比赛</h2>
                    <select
                      aria-label="排行榜卷型"
                      value={rankingType}
                      onChange={(e) => setRankingType(e.target.value as ExamType)}
                    >
                      {Object.entries(examLabel).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p>本机记录 · 按得分、用时排序</p>
                  {data.scores.filter((s) => s.type === rankingType).length ? (
                    <table>
                      <thead>
                        <tr>
                          <th>名次</th>
                          <th>小勇士</th>
                          <th>得分</th>
                          <th>用时</th>
                          <th>挑战日期</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted(
                          data.scores.filter((s) => s.type === rankingType),
                          (a, b) => b.score - a.score || a.seconds - b.seconds,
                        )
                          .slice(0, 20)
                          .map((s, i) => (
                            <tr key={s.id}>
                              <td>
                                <span className={`rank rank-${i}`}>{i + 1}</span>
                              </td>
                              <td>{data.nickname}</td>
                              <td>
                                <strong>{s.score}</strong> 分
                              </td>
                              <td>{formatTime(s.seconds)}</td>
                              <td>{new Date(s.date).toLocaleDateString('zh-CN')}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <Trophy size={42} />
                      <h3>你的第一场挑战，还在前方</h3>
                      <p>完成模拟竞赛后，成绩会自动记录在这里。</p>
                      <button className="secondary" onClick={() => navigate('contest')}>
                        进入模拟竞赛
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
      {(settings || help) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setSettings(false)
            setHelp(false)
          }}
        >
          <section
            className="settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={settings ? '我的档案与存档' : '玩法小指南'}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="tool dialog-close"
              aria-label="关闭对话框"
              onClick={() => {
                setSettings(false)
                setHelp(false)
              }}
            >
              <X size={22} />
            </button>
            {settings ? (
              <>
                <h2>我的探险档案</h2>
                <p>所有记录保存在当前浏览器中，导出一份备份，就能安心留住进步。</p>
                <label className="nickname-label">
                  小勇士的昵称
                  <input
                    maxLength={20}
                    value={data.nickname}
                    onChange={(e) => update((s) => ({ ...s, nickname: e.target.value }))}
                    onBlur={() => {
                      if (!data.nickname.trim()) update((s) => ({ ...s, nickname: '小勇士' }))
                    }}
                  />
                </label>
                <div className="settings-actions">
                  <button className="secondary" onClick={exportSave}>
                    <ArrowDownToLine size={18} />
                    导出存档备份
                  </button>
                  <label className="secondary file-label">
                    <Upload size={18} />
                    导入存档
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => {
                        void importSave(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                <div className="reset-area">
                  <p>重新开始会清空当前浏览器里的全部进度。</p>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (!confirm('确定清空全部进度、成绩和错题吗？建议先导出备份。')) return
                      protectedSave.current = false
                      update(freshSave)
                      setWarning('')
                      setSettings(false)
                      navigate('home')
                    }}
                  >
                    <Trash2 size={16} />
                    清空全部记录
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>每一次尝试，都在变聪明</h2>
                <div className="guide-section">
                  <Pencil />
                  <div>
                    <h3>分解：先拼一拼，再画出七块板</h3>
                    <p>
                      左边自由拼组七块板，拼好后点「检查拼法」确认；右边照着轮廓点两个圆点画出分界线，直线自动对齐45°角。
                    </p>
                  </div>
                </div>
                <div className="guide-section">
                  <Flame />
                  <div>
                    <h3>火柴：留意题目要求的根数</h3>
                    <p>
                      拿走、添加或移动一至两根火柴。移动时可以先点火柴，再点空槽。等号不能改变。
                    </p>
                  </div>
                </div>
                <div className="guide-stars">
                  <Stars value={3} size={20} />
                  <p>
                    首次独立完成得三星；提示不超过一次、错误不超过两次得二星；其他独立完成得一星。查看答案后，重新挑战才能获得星星。
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      <section id="certificate-print">
        <div className="certificate-border">
          <Award size={70} />
          <h1>荣誉奖状</h1>
          <p>颁发给</p>
          <h2 data-name />
          <p>在“智慧小勇士”综合思维挑战中，专注思考、勇敢尝试，获得</p>
          <strong data-score />
          <h3>思维小勇士</h3>
          <p>愿你一直保持好奇，发现每一个闪闪发光的想法。</p>
          <footer>
            <span>智慧小勇士 · 智力七巧板与火柴棒思维训练</span>
            <span data-date />
          </footer>
        </div>
      </section>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}
