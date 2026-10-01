import { NBButton, NBPanel } from "@/components/nb";
import { AppShell } from "@/components/AppShell";
import { GroundingKit } from "@/components/GroundingKit";
import { GROUNDING_EXERCISES } from "@/lib/grounding";
import { api } from "@/convex/_generated/api";
import {
  ArrowRight,
  MessagesSquare,
  Shuffle,
} from "lucide-react";
import { useQuery } from "convex/react";
import { Link } from "react-router";

/**
 * /calm — the low-arousal side of training. The full grounding kit
 * (six exercises) plus the two no-mic practices. Nothing to score,
 * nothing to unlock — a place to downshift before or after reps.
 */
export default function Calm() {
  const reframeLogs = useQuery(api.reframes.list, { limit: 2 });

  return (
    <AppShell active="calm">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Heading */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Calm is a skill too
          </p>
          <h1 className="mt-1 font-display text-3xl text-balance sm:text-4xl">
            The <span className="italic text-mint">calm</span> side of the gym
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {GROUNDING_EXERCISES.length} grounding exercises — breath pacers
            and attention guides — plus the no-mic practices. Come here
            before a hard conversation, or after one.
          </p>
        </section>

        {/* The grounding kit */}
        <GroundingKit />

        {/* No-mic practices */}
        <section className="grid gap-6 lg:grid-cols-2">
          <NBPanel className="bg-ink text-paper">
            <div className="border-b-2 border-paper/20 p-6">
              <div className="flex items-center gap-2 font-display text-xl">
                <MessagesSquare className="size-5 text-sun" /> Read the Room
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed text-paper/80">
                No mic needed. Pick the reply you'd actually send and see what
                it would broadcast — new scenario every day.
              </p>
              <Link to="/quiz" className="mt-6 inline-block">
                <NBButton variant="sun" className="text-xs">
                  This week's scenario <ArrowRight className="size-3.5" />
                </NBButton>
              </Link>
            </div>
          </NBPanel>

          <NBPanel className="bg-ink text-paper">
            <div className="border-b-2 border-paper/20 p-6">
              <div className="flex items-center gap-2 font-display text-xl">
                <Shuffle className="size-5 text-sun" /> Reframe Lab
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed text-paper/80">
                Something get under your skin? Look at what you almost said,
                then write the version you'd rather have said.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-xs uppercase tracking-widest text-paper/60">
                {(reframeLogs ?? []).map((log) => (
                  <li key={log._id} className="truncate">· {log.trigger}</li>
                ))}
              </ul>
              <Link to="/reframe" className="mt-6 inline-block">
                <NBButton variant="sun" className="text-xs">
                  Open reframe lab <ArrowRight className="size-3.5" />
                </NBButton>
              </Link>
            </div>
          </NBPanel>
        </section>
      </div>
    </AppShell>
  );
}
