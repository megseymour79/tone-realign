import { NBBadge, NBButton, NBPanel } from "@/components/nb";
import { AppShell } from "@/components/AppShell";
import { QUIZ, type QuizQuestion } from "@/lib/quiz";
import { getDailyLeak, type LeakScenario } from "@/lib/leak";
import { dailyLabel, DAILY_ANGLES } from "@/lib/daily";
import { ArrowRight, Check, Ear, MessagesSquare, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { trackEvent } from "@/lib/analytics";

/** Day number for the featured-question rotation (local midnight reset). */
function todayNumber(): number {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(local.getTime() / 86_400_000);
}

const FEATURED = todayNumber() % QUIZ.length;

type Phase = "choosing" | "revealed";

function QuizCard({
  question,
  featured,
}: {
  question: QuizQuestion;
  featured: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("choosing");
  const [picked, setPicked] = useState<number | null>(null);

  // Answering a scenario counts toward the lifetime total + today's checklist.
  const countScenario = useMutation(api.dailyLog.countQuizScenario);
  const countedRef = useRef(false);
  useEffect(() => {
    if (phase === "revealed" && !countedRef.current) {
      countedRef.current = true;
      countScenario({}).catch(() => {});
    }
  }, [phase, countScenario]);

  const reset = () => {
    setPhase("choosing");
    setPicked(null);
  };

  return (
    <NBPanel className="overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-ink bg-sun px-5 py-3">
        <div className="flex items-center gap-2">
          <MessagesSquare className="size-5" />
          <span className="font-display text-sm">{question.from}</span>
        </div>
        {featured && <NBBadge className="bg-ink text-paper">This week's</NBBadge>}
      </div>

      <div className="p-6">
        <p className="font-display text-xl leading-relaxed text-balance">
          {question.scene}
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          What do you send?
        </p>

        <div className="mt-5 flex flex-col gap-3">
          {question.options.map((opt, i) => {
            const isBest = i === question.best;
            const isPicked = picked === i;
            const revealed = phase === "revealed";

            const bg = !revealed
              ? picked === i
                ? "bg-sun"
                : "bg-card"
              : isBest
                ? "bg-mint"
                : isPicked
                  ? "bg-coral"
                  : "bg-card opacity-70";

            return (
              <button
                key={opt.text}
                type="button"
                disabled={revealed}
                onClick={() => {
                  trackEvent("quiz_answered", {
                    featured,
                    correct: i === question.best,
                  });
                  setPicked(i);
                  setPhase("revealed");
                }}
                className={`nb nb-press w-full p-4 text-left text-sm font-medium transition-colors ${bg} ${
                  revealed ? "cursor-default" : "hover:-translate-y-0.5"
                }`}
              >
                <span className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 border-ink text-[10px] font-bold ${
                      revealed && isBest ? "bg-ink text-paper" : "bg-paper"
                    }`}
                  >
                    {revealed && isBest ? (
                      <Check className="size-3.5" />
                    ) : revealed && isPicked ? (
                      <X className="size-3.5" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span>
                    {opt.text}
                    <AnimatePresence>
                      {revealed && (
                        <motion.span
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, delay: 0.15 }}
                          className="mt-2 block text-xs font-normal leading-relaxed text-ink/80"
                        >
                          {opt.note}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {phase === "revealed" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-5 flex flex-wrap items-center justify-between gap-3"
            >
              <p className="max-w-md text-sm italic text-muted-foreground">
                {picked === question.best
                  ? "That's the one. Notice how it felt to choose warmth *and* a spine."
                  : "No shame — the pull you felt toward your pick is exactly the reflex worth studying."}
              </p>
              <NBButton variant="paper" onClick={reset} className="text-xs">
                <ArrowRight className="size-3.5" /> Re-read it
              </NBButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NBPanel>
  );
}

export default function Quiz() {
  const [shown, setShown] = useState(() => [FEATURED]);
  const current = shown[shown.length - 1];

  const next = () => {
    setShown((s) => [...s, (s[s.length - 1] + 1) % QUIZ.length]);
  };

  return (
    <AppShell active="quiz">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-16 pt-6">
        <div className="flex items-center justify-end">
          <NBBadge className="bg-mint">READ THE ROOM</NBBadge>
        </div>

        <div>
          <h1 className="font-display text-2xl">
            No mic needed — just{" "}
            <span className="italic text-coral">judgment</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Tone starts before you speak. Each scenario is a real moment — pick
            the reply you'd actually send, then see what it would broadcast.
            This week's is featured; the rest are there when you want them
            ({DAILY_ANGLES.length * 4 + 2} total, new one daily).
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {dailyLabel()}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {shown.map((q, i) => (
            <span
              key={`${q}-${i}`}
              className={`size-2 ${i === shown.length - 1 ? "bg-coral" : "bg-ink/30"}`}
            />
          ))}
          <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {shown.length} done
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <QuizCard
              question={QUIZ[current]}
              featured={current === FEATURED}
            />
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center">
          <NBButton variant="sun" onClick={next} className="px-6 py-3">
            Next scenario <ArrowRight className="size-4" />
          </NBButton>
        </div>

        {/* Ear training — the other side of tone */}
        <LeakCard scenario={getDailyLeak(todayNumber())} />
      </div>
    </AppShell>
  );
}

function LeakCard({ scenario }: { scenario: LeakScenario }) {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <NBPanel className="overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-5 py-3 text-paper">
        <div className="flex items-center gap-2">
          <Ear className="size-4" />
          <span className="font-display text-sm">Catch the Leak — ear training</span>
        </div>
        <span className="hidden text-[10px] font-bold uppercase tracking-widest text-paper/60 sm:block">
          What the voice says under the words
        </span>
      </div>
      <div className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          From {scenario.from}:
        </p>
        <p className="mt-1 font-display text-xl leading-relaxed">{scenario.words}</p>
        <p className="mt-3 border-l-4 border-ink bg-card px-4 py-2 text-sm text-muted-foreground">
          <span className="font-bold uppercase tracking-widest text-ink">Delivered:</span>{" "}
          {scenario.delivered}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {scenario.options.map((opt, i) => {
            const isAnswer = i === scenario.answer;
            const isPicked = picked === i;
            const showState = picked !== null && (isPicked || isAnswer);
            return (
              <button
                key={i}
                onClick={() => setPicked(i)}
                disabled={picked !== null}
                className={`nb nb-press px-4 py-3 text-left text-sm font-medium transition-colors ${
                  showState
                    ? isAnswer
                      ? "bg-mint text-ink"
                      : "bg-coral text-ink"
                    : "bg-card"
                }`}
              >
                {showState && (isAnswer ? <Check className="mr-1.5 inline size-4" /> : <X className="mr-1.5 inline size-4" />)}
                {opt.text}
                {showState && (
                  <span className="mt-1 block text-xs font-normal text-ink/80">{opt.note}</span>
                )}
              </button>
            );
          })}
        </div>
        {picked !== null && picked !== scenario.answer && (
          <p className="mt-3 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Everyone misses this one. That's why it trains.
          </p>
        )}
      </div>
    </NBPanel>
  );
}
