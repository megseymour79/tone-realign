import { NBBadge, NBButton, NBPanel } from "@/components/nb";
import { AppShell } from "@/components/AppShell";
import { ResponsePlanner } from "@/components/ResponsePlanner";
import { REFRAME_SCENARIOS } from "@/lib/drills";
import { LENSES } from "@/lib/perspectives";
import { api } from "@/convex/_generated/api";
import {
  Dices,
  Eye,
  Loader2,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import { useAction, useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export default function Reframe() {
  const [trigger, setTrigger] = useState("");
  const [reaction, setReaction] = useState("");
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<{
    reframe: string;
    toneNote: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const reframeAction = useAction(api.ai.reframe);
  const saveReframe = useMutation(api.reframes.save);
  const markReframe = useMutation(api.dailyLog.mark);

  // Perspective lens: flip through readings of the same situation
  const [lensIdx, setLensIdx] = useState(0);
  const lens = LENSES[lensIdx];

  const randomScenario = () => {
    const pick =
      REFRAME_SCENARIOS[Math.floor(Math.random() * REFRAME_SCENARIOS.length)];
    setTrigger(pick);
  };

  const coach = async () => {
    if (!trigger.trim() || !reaction.trim()) {
      setError("Fill in both the trigger and your automatic reaction.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const res = await reframeAction({
        trigger,
        reaction,
        goal: goal || undefined,
      });
      setResult(res);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The coach couldn't respond. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveReframe({
        trigger,
        reaction,
        goal: goal || undefined,
        reframe: result.reframe,
        toneNote: result.toneNote,
      });
      trackEvent("reframe_saved");
      toast.success("Kept. It's in your log.");
      setSaved(true);
      // Keeping a reframe credits today's checklist (idempotent server-side).
      markReframe({ action: "reframe" }).catch(() => {});
    } catch {
      toast.error("That didn't save. One more try?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell active="reframe">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-16 pt-6">
        <div className="flex items-center justify-end">
          <NBBadge className="bg-mint">REFRAME LAB</NBBadge>
        </div>

        <NBPanel className="p-6">
          <h1 className="font-display text-2xl text-balance">
            Say it <span className="italic text-coral">better</span> this time
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            The trigger fires. The old reply comes out. This is where you slow
            it down and write the version you actually want to say.
          </p>

          {/* The think-through: frame the response before writing it.
              Tapping a message kind prefills the goal field below. */}
          <div className="mt-6">
            <ResponsePlanner
              title="Frame it before you write it"
              intro="Answer these four and the response almost writes itself — you'll know what their move was, what the real message is, and what you want them to feel afterward."
              accent="bg-secondary"
              onGoalPick={(g) => setGoal(g)}
            />
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest">
                  The trigger
                </label>
                <button
                  onClick={randomScenario}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-ink"
                >
                  <Dices className="size-3.5" /> Surprise me
                </button>
              </div>
              <textarea
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="What happened? What did they say or do?"
                className="nb w-full bg-card p-3 text-sm outline-none placeholder:text-muted-foreground"
                rows={2}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest">
                Your automatic reaction
              </label>
              <textarea
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
                placeholder="What would you blurt out — or swallow? Be honest, this stays between us."
                className="nb w-full bg-card p-3 text-sm outline-none placeholder:text-muted-foreground"
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest">
                Your goal (optional)
              </label>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="like: stay calm, hold my ground, fix it without groveling"
                className="nb w-full bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            {error && (
              <p className="nb bg-coral px-3 py-2 text-sm font-medium">{error}</p>
            )}

            <div>
              <NBButton onClick={coach} disabled={loading} variant="sun">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Thinking…
                  </>
                ) : (
                  <>
                    <Shuffle className="size-4" /> Help me reframe it
                  </>
                )}
              </NBButton>
            </div>
          </div>
        </NBPanel>

        {/* Perspective lens — the same moment, five legitimate readings */}
        <NBPanel className="overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-ink bg-paper px-5 py-3">
            <div className="flex items-center gap-2 font-display text-xl">
              <Eye className="size-5" /> Change the lens, change the moment
            </div>
            <span className="hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:block">
              Not spin — other true things
            </span>
          </div>

          <div className="p-6">
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              A narrow perception says there's one obvious reading of what
              happened. There isn't — and practicing the other readings is
              where the freedom is. Flip through the lenses; keep whatever
              makes your shoulders drop.
            </p>

            {/* Lens tabs */}
            <div className="mt-4 flex flex-wrap gap-2">
              {LENSES.map((l, i) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLensIdx(i)}
                  className={`nb nb-press px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                    i === lensIdx ? `${l.color} text-ink` : "bg-card text-muted-foreground hover:text-ink"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>

            {/* Active lens */}
            <AnimatePresence mode="wait">
              <motion.div
                key={lens.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="mt-5"
              >
                <div className={`nb inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${lens.color}`}>
                  Through {lens.name}
                </div>
                <p className="mt-3 text-base leading-relaxed">{lens.idea}</p>
                <p className="nb mt-3 bg-secondary p-3 font-display text-lg leading-snug">
                  {lens.question}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {lens.seed}
                </p>

                {/* Scratchpad: capture what surfaced */}
                <LensScratchpad lensId={lens.id} />
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex flex-wrap gap-3">
              <NBButton
                variant="paper"
                className="text-xs"
                onClick={() => setLensIdx((i) => (i + 1) % LENSES.length)}
              >
                <Shuffle className="size-3.5" /> Next lens
              </NBButton>
              <NBButton
                variant="paper"
                className="text-xs"
                onClick={() => setLensIdx((i) => (i - 1 + LENSES.length) % LENSES.length)}
              >
                <RotateCcw className="size-3.5" /> Previous
              </NBButton>
            </div>
          </div>
        </NBPanel>

        {result && (
          <NBPanel className="p-6">
            <div className="flex items-center justify-between">
              <NBBadge className="bg-sun">COACHED RESPONSE</NBBadge>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Try saying it like this
              </span>
            </div>
            <p className="mt-4 text-lg font-medium leading-relaxed">
              “{result.reframe}”
            </p>
            <div className="mt-4 nb bg-mint p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest">
                Delivery note
              </p>
              <p className="mt-1 text-sm">{result.toneNote}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <NBButton variant="mint" disabled={saving || saved} onClick={handleSave}>
                {saved ? "Saved" : saving ? "Saving…" : "Keep this one"}
              </NBButton>
              <NBButton
                variant="paper"
                onClick={() => {
                  setResult(null);
                  setReaction("");
                  setSaved(false);
                }}
              >
                Another one
              </NBButton>
            </div>
          </NBPanel>
        )}
      </div>
    </AppShell>
  );
}

/** Per-lens scratchpad: one private note per lens, session-persistent. */
function LensScratchpad({ lensId }: { lensId: string }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <textarea
      value={notes[lensId] ?? ""}
      onChange={(e) => setNotes((n) => ({ ...n, [lensId]: e.target.value }))}
      placeholder="What surfaced through this lens? (Stays on this screen)"
      rows={2}
      className="nb mt-4 w-full bg-card p-3 text-sm outline-none placeholder:text-muted-foreground"
    />
  );
}
