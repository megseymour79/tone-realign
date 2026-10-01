import { NBBadge, NBPanel } from "@/components/nb";
import {
  DAILY_ACTIONS,
  dailyProgressPct,
  type DailyActionId,
} from "@/lib/gamify";
import { api } from "@/convex/_generated/api";
import {
  Check,
  Flame,
  Languages,
  MessageSquareText,
  Mic,
  Shuffle,
  Wind,
} from "lucide-react";
import { useQuery } from "convex/react";
import { Link } from "react-router";

const ACTION_META: Record<
  DailyActionId,
  { icon: typeof Mic; to?: string }
> = {
  take: { icon: Mic, to: undefined },
  quiz: { icon: MessageSquareText, to: "/quiz" },
  reframe: { icon: Shuffle, to: "/reframe" },
  reset: { icon: Wind, to: undefined },
  translate: { icon: Languages, to: "/translate" },
};

/**
 * Today's four habits, one honest click each. Completing all four pays the
 * sweep bonus — the "chain" reward that keeps the streak meaningful.
 */
export function DailyChecklist({ todayDrillId }: { todayDrillId: string }) {
  const today = useQuery(api.dailyLog.today);
  const completed = new Set((today?.completed ?? []) as DailyActionId[]);
  const pct = dailyProgressPct([...completed]);

  return (
    <NBPanel className="overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-ink bg-sun px-5 py-3">
        <div className="flex items-center gap-2 font-display text-xl">
          <Flame className="size-5" /> This week's four
        </div>
        <NBBadge className="bg-card">
          {completed.size}/4 done
        </NBBadge>
      </div>

      <div className="p-5">
        {/* Sweep bonus meter */}
        <div className="nb flex items-center justify-between gap-3 bg-secondary px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            All four → +40 XP bonus
          </span>
          <div className="flex gap-1" aria-hidden>
            {DAILY_ACTIONS.map((a) => (
              <span
                key={a.id}
                className={`h-3 w-6 ${completed.has(a.id) ? "bg-mint" : "bg-card"}`}
              />
            ))}
          </div>
        </div>

        <ul className="mt-4 flex flex-col gap-2.5">
          {DAILY_ACTIONS.map((action) => {
            const meta = ACTION_META[action.id];
            const Icon = meta.icon;
            const done = completed.has(action.id);
            const to =
              action.id === "take" ? `/practice/${todayDrillId}` : meta.to;

            const row = (
              <button
                type="button"
                disabled={done}
                className={`nb nb-press flex w-full items-center gap-3 p-3 text-left transition-colors ${
                  done ? "cursor-default bg-mint" : "bg-card hover:bg-accent"
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center border-2 border-ink ${
                    done ? "bg-ink text-paper" : "bg-paper"
                  }`}
                >
                  {done && <Check className="size-4" />}
                </span>
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {action.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {action.detail}
                  </span>
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    done ? "text-ink/70" : "text-muted-foreground"
                  }`}
                >
                  {done ? "+done" : `+${action.xp} XP`}
                </span>
              </button>
            );

            return (
              <li key={action.id}>
                {done || !to ? (
                  row
                ) : (
                  <Link to={to} className="block">
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* Progress line */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-3 flex-1 gap-[3px]" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className={`flex-1 ${i < Math.round((pct / 100) * 8) ? "bg-sun" : "bg-muted"}`}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {pct}%
          </span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Four small practice activities beat one heroic session. Complete them
          all and the sweep bonus lands on top.
        </p>
      </div>
    </NBPanel>
  );
}
