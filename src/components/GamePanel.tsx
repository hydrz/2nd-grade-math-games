import { useState } from 'react'
import { Check, CheckCheck, Lightbulb, RotateCcw, Eye, Star, ChevronRight, Shapes, Expand, X } from 'lucide-react'
import { bounds, checkDrawing, silhouette } from '../geometry'
import { MATCHES } from '../matches'
import { TANGRAMS, drawingGroup } from '../tangrams'
import { emptyDraft } from '../storage'
import { AssemblyCanvas, DrawCanvas } from './PuzzleCanvas'
import { checkGame, scatter } from '../games'
import { MatchCanvas } from './MatchCanvas'
import type { CheckResult, Draft, GameKind } from '../types'

export function GamePanel({ kind, index, draft, onDraft, onResult, exam = false, onNext }: { kind: GameKind; index: number; draft: Draft; onDraft: (d: Draft) => void; onResult: (results: CheckResult[], draft: Draft) => void; exam?: boolean; onNext?: () => void }) {
  const [feedback, setFeedback] = useState<(CheckResult | null)[] | null>(null), [submitted, setSubmitted] = useState(false), [showHint, setShowHint] = useState(false), [showAnswer, setShowAnswer] = useState(false)
  const [focus, setFocus] = useState(false)
  const groups = kind === 'draw' ? drawingGroup(index) : [], allGood = submitted && !!feedback && feedback.every(r => r?.ok)
  // Every board of a question shares one viewport, so identical pieces render identical.
  const view = groups.length ? (() => {
    const boxes = groups.map(p => bounds(silhouette(p.placements)))
    const maxW = Math.max(...boxes.map(b => b.width)) + 1, maxH = Math.max(...boxes.map(b => b.height)) + 1, ratio = 1.75
    return maxW >= maxH * ratio ? { width: maxW, height: maxW / ratio } : { width: maxH * ratio, height: maxH }
  })() : undefined
  function update(next: Draft, board?: number) {
    setSubmitted(false)
    if (board === undefined) setFeedback(null)
    else setFeedback(f => f ? f.map((r, n) => n === board ? null : r) : null)
    onDraft({ ...next, completed: false })
  }
  function check() { const results = checkGame(kind, index, draft); setFeedback(results); setSubmitted(true); onResult(results, draft) }
  function checkBoard(board: number) {
    const result = checkDrawing(groups[board], draft.strokes?.[board] || [])
    setFeedback(f => { const next = f ? [...f] : Array.from({ length: groups.length }, () => null); next[board] = result; return next })
  }
  return <div className={`game-panel ${focus ? 'focus-mode' : ''}`}>
    {kind === 'draw' && <><div className="exercise-instruction"><span className="step-bubble">4</span><div><strong>四个造型，每个都分成七块</strong><p>画出分割线，把每个图形分成七块拼板。可以有不同的正确分法。</p></div><button className="secondary focus-button" onClick={() => setFocus(!focus)}>{focus ? <X size={16} /> : <Expand size={16} />}{focus ? '收起同屏' : '全屏四图'}</button></div><div className="four-boards">{groups.map((p, i) => { const result = feedback?.[i] ?? null; return <div key={p.id} className={result ? `board-result ${result.ok ? 'correct' : 'incorrect'}` : ''}><DrawCanvas puzzle={p} strokes={draft.strokes?.[i] || []} onChange={s => { const next = Array.from({ length: 4 }, (_, n) => draft.strokes?.[n] || []); next[i] = s; update({ ...draft, strokes: next }, i) }} reveal={showAnswer} hint={showHint} compact view={view} bad={result?.regions ?? null} badStroke={result?.strokeIndex} onCheck={() => checkBoard(i)} />{result && <p className="individual-feedback">{result.ok ? <Check size={15} /> : null}{result.message}</p>}</div> })}</div></>}
    {kind === 'assemble' && <><div className="exercise-instruction"><Shapes size={25} /><div><strong>拼出「{TANGRAMS[index].name}」</strong><p>七块全部用上，可以旋转、翻面，不能重叠。</p></div><span className="small-tag">45°旋转</span></div><AssemblyCanvas puzzle={TANGRAMS[index]} placements={draft.placements || scatter(TANGRAMS[index])} onChange={p => update({ ...draft, placements: p })} reveal={showAnswer} hint={showHint} /></>}
    {kind === 'match' && <MatchCanvas puzzle={MATCHES[index]} state={draft.matches || MATCHES[index].initial} onChange={matches => update({ ...draft, matches })} hint={showHint} reveal={showAnswer} />}
    {showAnswer && <div className="answer-note"><Eye size={18} />这是参考答案。观察后点“重新挑战”，独立完成才能获得星星。{kind === 'match' && <button className="text-button" onClick={() => update({ ...draft, matches: MATCHES[index].solutions[0], revealed: true })}>摆出参考解</button>}</div>}
    {submitted && feedback && <div className={`feedback ${allGood ? 'success' : 'retry'}`} role="status">{allGood ? <CheckCheck size={24} /> : <Lightbulb size={23} />}<div><strong>{allGood ? draft.revealed ? '已经完成，重新挑战来赢得星星吧' : '太棒了，这一关完成啦！' : '再观察一下，你离答案更近了'}</strong>{kind !== 'draw' && <p>{feedback[0]?.message}</p>}{allGood && !draft.revealed && <span className="earned-stars">{Array.from({ length: 3 }, (_, i) => <Star key={i} size={20} fill={i < (draft.hints === 0 && draft.errors === 0 ? 3 : draft.hints <= 1 && draft.errors <= 2 ? 2 : 1) ? 'currentColor' : 'none'} />)}</span>}</div>{allGood && !draft.revealed && onNext && <button className="primary" onClick={onNext}>下一关<ChevronRight size={17} /></button>}</div>}
    <div className="game-footer"><div className="assist-actions">
      {!exam && <><button className="secondary" onClick={() => { setShowHint(true); onDraft({ ...draft, hints: draft.hints + 1 }) }}><Lightbulb size={18} />给我提示</button><button className="text-button" onClick={() => { setShowAnswer(true); onDraft({ ...draft, revealed: true }) }}><Eye size={17} />看答案</button></>}
      <button className="text-button" onClick={() => { onDraft({ ...emptyDraft(), errors: draft.errors, hints: draft.hints, revealed: draft.revealed }); setFeedback(null); setShowHint(false); setShowAnswer(false) }}><RotateCcw size={17} />重置题面</button>
      {!exam && draft.revealed && <button className="secondary" onClick={() => { onDraft(emptyDraft()); setFeedback(null); setShowAnswer(false); setShowHint(false) }}>重新挑战</button>}
    </div>{!exam ? <button className="primary check-button" onClick={check}><Check size={19} />检查答案</button> : <span className="saved-note">作答自动保存，交卷后统一判分</span>}</div>
  </div>
}
