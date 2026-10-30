import { useState } from 'react';
import {
  Check,
  CheckCheck,
  Lightbulb,
  Pencil,
  RotateCcw,
  Eye,
  ChevronRight,
  Shapes,
  ShieldCheck,
} from 'lucide-react';
import { MATCHES } from '../match/matches';
import { TANGRAMS } from '../tangram/tangrams';
import { emptyDraft, starsFor } from '../core/storage';
import { checkAssembly } from '../tangram/geometry';
import { AssemblyCanvas } from './tangram/AssemblyCanvas';
import { DrawCanvas } from './tangram/DrawCanvas';
import { checkGame, scatter } from '../core/games';
import { MatchCanvas } from './match/MatchCanvas';
import { Stars } from './ui/Stars';
import { playSound } from '../core/sound';
import type { CheckResult, Draft, GameKind } from '../core/types';

export function GamePanel({
  kind,
  index,
  draft,
  onDraft,
  onResult,
  exam = false,
  onNext,
}: {
  kind: GameKind;
  index: number;
  draft: Draft;
  onDraft: (d: Draft) => void;
  onResult: (results: CheckResult[], draft: Draft) => void;
  exam?: boolean;
  onNext?: () => void;
}) {
  const [feedback, setFeedback] = useState<CheckResult[] | null>(null),
    [submitted, setSubmitted] = useState(false),
    [showHint, setShowHint] = useState(false),
    [showAnswer, setShowAnswer] = useState(false),
    [assembleCheck, setAssembleCheck] = useState<CheckResult | null>(null);
  const puzzle = TANGRAMS[index],
    allGood = submitted && !!feedback && feedback.every((r) => r.ok);
  function update(next: Draft) {
    setSubmitted(false);
    setFeedback(null);
    onDraft({ ...next, completed: false });
  }
  function check() {
    const results = checkGame(kind, index, draft);
    setFeedback(results);
    setSubmitted(true);
    onResult(results, draft);
    if (results.every((r) => r.ok)) {
      playSound('success');
      if (!draft.revealed) window.setTimeout(() => playSound('star'), 380);
    } else playSound('retry');
  }
  return (
    <div className="game-panel">
      {kind === 'draw' && (
        <>
          <div className="exercise-instruction">
            <span className="step-bubble">
              <Pencil size={18} />
            </span>
            <div>
              <strong>先拼一拼，再画出七块的分割线</strong>
              <p>
                左边自由拼组七块板，点「检查拼法」确认分法；右边照着轮廓点两个圆点，画出每块板的分界线。
              </p>
            </div>
          </div>
          <div className="draw-studio">
            <section className="studio-pane">
              <div className="pane-heading">
                <Shapes size={16} />
                自由拼图区
                <span>拼一拼，帮自己找到分法</span>
              </div>
              <AssemblyCanvas
                puzzle={puzzle}
                placements={draft.placements || scatter(puzzle)}
                onChange={(placements) => {
                  setAssembleCheck(null);
                  update({ ...draft, placements });
                }}
                reveal={false}
                hint={false}
                bad={
                  assembleCheck && !assembleCheck.ok
                    ? (assembleCheck.regions ?? null)
                    : null
                }
                action={
                  <button
                    className="secondary"
                    onClick={() => {
                      const result = checkAssembly(
                        puzzle,
                        draft.placements || scatter(puzzle),
                      );
                      setAssembleCheck(result);
                      playSound(result.ok ? 'success' : 'retry');
                    }}
                  >
                    <ShieldCheck size={16} />
                    检查拼法
                  </button>
                }
              />
              {assembleCheck && (
                <p
                  className={`assemble-feedback ${assembleCheck.ok ? 'good' : ''}`}
                  role="status"
                >
                  {assembleCheck.ok ? <Check size={14} /> : null}
                  {assembleCheck.message}
                </p>
              )}
            </section>
            <section className="studio-pane">
              <div className="pane-heading">
                <Pencil size={16} />
                画线区
                <span>点两个圆点即可连线</span>
              </div>
              <DrawCanvas
                puzzle={puzzle}
                strokes={draft.strokes?.[0] || []}
                onChange={(strokes) => update({ ...draft, strokes: [strokes] })}
                reveal={showAnswer}
                hint={showHint}
                bad={feedback?.[0]?.regions ?? null}
                badStroke={feedback?.[0]?.strokeIndex}
              />
              {feedback?.[0] && (
                <p className="individual-feedback">
                  {feedback[0].ok ? <Check size={15} /> : null}
                  {feedback[0].message}
                </p>
              )}
            </section>
          </div>
        </>
      )}
      {kind === 'match' && (
        <MatchCanvas
          puzzle={MATCHES[index]}
          state={draft.matches || MATCHES[index].initial}
          onChange={(matches) => update({ ...draft, matches })}
          hint={showHint}
          reveal={showAnswer}
        />
      )}
      {showAnswer && (
        <div className="answer-note">
          <Eye size={18} />
          这是参考答案。观察后点“重新挑战”，独立完成才能获得星星。
          {kind === 'match' && (
            <button
              className="text-button"
              onClick={() => {
                playSound('hint');
                update({
                  ...draft,
                  matches: MATCHES[index].solutions[0],
                  revealed: true,
                });
              }}
            >
              摆出参考解
            </button>
          )}
        </div>
      )}
      {submitted && feedback && (
        <div
          className={`feedback ${allGood ? 'success' : 'retry'}`}
          role="status"
        >
          {allGood ? <CheckCheck size={24} /> : <Lightbulb size={23} />}
          <div>
            <strong>
              {allGood
                ? draft.revealed
                  ? '完成啦！重新挑战可以赢得星星'
                  : '太棒了，这一关完成啦！'
                : '再观察一下，你离答案更近了'}
            </strong>
            {kind !== 'draw' && <p>{feedback[0]?.message}</p>}
            {allGood && !draft.revealed && (
              <span className="earned-stars">
                <Stars value={starsFor(draft)} size={20} />
              </span>
            )}
          </div>
          {allGood && onNext && (
            <button
              className="primary"
              onClick={() => {
                playSound('tap');
                onNext();
              }}
            >
              下一关
              <ChevronRight size={17} />
            </button>
          )}
        </div>
      )}
      <div className="game-footer">
        <div className="assist-actions">
          {!exam && (
            <>
              <button
                className="secondary"
                onClick={() => {
                  playSound('hint');
                  setShowHint(true);
                  onDraft({ ...draft, hints: draft.hints + 1 });
                }}
              >
                <Lightbulb size={18} />
                给我提示
              </button>
              <button
                className="text-button"
                onClick={() => {
                  playSound('hint');
                  setShowAnswer(true);
                  onDraft({ ...draft, revealed: true });
                }}
              >
                <Eye size={17} />
                看答案
              </button>
            </>
          )}
          <button
            className="text-button"
            onClick={() => {
              playSound('erase');
              onDraft({
                ...emptyDraft(),
                errors: draft.errors,
                hints: draft.hints,
                revealed: draft.revealed,
              });
              setFeedback(null);
              setShowHint(false);
              setShowAnswer(false);
            }}
          >
            <RotateCcw size={17} />
            重置题面
          </button>
          {!exam && draft.revealed && (
            <button
              className="secondary"
              onClick={() => {
                playSound('tap');
                onDraft(emptyDraft());
                setFeedback(null);
                setShowAnswer(false);
                setShowHint(false);
              }}
            >
              重新挑战
            </button>
          )}
        </div>
        {!exam ? (
          <button className="primary check-button" onClick={check}>
            <Check size={19} />
            检查答案
          </button>
        ) : (
          <span className="saved-note">作答自动保存，交卷后统一判分</span>
        )}
      </div>
    </div>
  );
}
