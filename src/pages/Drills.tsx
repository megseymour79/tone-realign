import { NBBadge, NBButton, NBPanel } from "@/components/nb";
import { PublicLayout } from "@/components/PublicLayout";
import { PagePager } from "@/components/PagePager";
import { DRILLS } from "@/lib/drills";
import { getAccessibleDailyChallenge } from "@/lib/daily";
import { ArrowRight, Check, Mic, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router";

export default function Drills() {
  // Public page: model a brand-new user, so "today's challenge" always
  // matches what they'll actually be asked to run after signing up.
  const daily = getAccessibleDailyChallenge(() => false);

  return (
    <PublicLayout>
      <section className="nb-grid-dots border-b-2 border-ink">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <NBBadge className="bg-mint text-ink">The drill floor</NBBadge>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
            Drills for the moments that{" "}
            <span className="italic text-coral">get to you</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Calm when you're annoyed, warmth when you mean it, and a no that
            doesn't wobble. Each one is 30–45 seconds out loud — the prompt is
            given; you bring the honesty.
          </p>
        </div>
      </section>

      {/* Daily challenge strip */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="nb flex flex-wrap items-center justify-between gap-4 bg-sun nb-shadow">
            <div className="flex items-center gap-4">
              <span className="nb flex size-12 shrink-0 items-center justify-center bg-card">
                <Sparkles className="size-6" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  This week's challenge · {daily.tag}
                </p>
                <p className="font-display text-lg leading-tight sm:text-xl">
                  {daily.drill.name} — {daily.angle.toLowerCase()}
                </p>
              </div>
            </div>
            <Link to="/auth">
              <NBButton variant="ink" className="text-xs">
                <Mic className="size-3.5" /> Do this week's take
              </NBButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Drill cards */}
      <section className="nb-dots border-b-2 border-ink">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {DRILLS.map((drill, i) => {
              const isToday = drill.id === daily.drill.id;
              return (
                <motion.div
                  key={drill.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="transition-transform duration-300 hover:-translate-y-1"
                >
                  <NBPanel className="flex h-full flex-col">
                    <div className={`border-b-2 border-ink px-5 py-3 ${drill.color}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-lg leading-tight">
                          {drill.name}
                        </span>
                        {isToday && <Sparkles className="size-4 shrink-0" />}
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest">
                        {drill.tag} · {drill.seconds}s
                      </div>
                    </div>
                    <div className="flex-1 p-5">
                      <p className="nb bg-secondary p-3 text-sm leading-relaxed">
                        {drill.prompt}
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {drill.focus}
                      </p>
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {drill.tips.map((tip) => (
                          <li
                            key={tip}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <Check className="mt-0.5 size-3 shrink-0 text-mint" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t-2 border-ink p-5 pt-4">
                      <Link to="/auth">
                        <NBButton
                          variant={isToday ? "coral" : "paper"}
                          className="w-full py-2 text-xs"
                        >
                          {isToday ? "Take this week's challenge" : "Try this drill"}{" "}
                          <ArrowRight className="size-3.5" />
                        </NBButton>
                      </Link>
                    </div>
                  </NBPanel>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      <PagePager />
    </PublicLayout>
  );
}
