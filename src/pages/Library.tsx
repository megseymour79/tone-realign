import { NBBadge, NBButton } from "@/components/nb";
import { PublicLayout } from "@/components/PublicLayout";
import { PagePager } from "@/components/PagePager";
import { READING_LIST } from "@/lib/reading-list";
import {
  ArrowRight,
  ArrowUpRight,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router";

export default function Library() {
  return (
    <PublicLayout>
      <section className="nb-grid-dots border-b-2 border-ink">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <NBBadge className="bg-sun text-ink">The library</NBBadge>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
            Ideas from the <span className="italic text-sun">pros</span>.
            Reps from you.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            The free web shelf — websites, talks, and studies from the people
            whose work this app stands on. Every link opens free content:
            no books to buy, no paywalls, no sign-up. For the videos, the
            tour's next stop back is Watch.
          </p>
        </div>
      </section>

      {/* Go deeper — the research shelf */}
      <section className="border-b-2 border-ink bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <NBBadge className="bg-mint text-ink">Go deeper</NBBadge>
              <h2 className="mt-4 flex items-center gap-2 font-display text-3xl sm:text-4xl">
                <Globe className="size-6 text-coral" /> The free web shelf
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Guides, talks, and studies from the people whose work this app
              stands on. Every link is a free website — no books to buy, no
              paywalls, no sign-up.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {READING_LIST.map((r, i) => (
              <motion.a
                key={r.title}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className="group flex items-start gap-4 border-2 border-ink/15 bg-card p-4 text-ink transition-colors hover:border-ink hover:bg-paper"
              >
                <span className={`mt-1 h-10 w-1.5 shrink-0 ${r.color}`} />
                <span className="min-w-0 flex-1">
                  <span className="font-display text-sm leading-snug">
                    {r.title}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-widest text-coral">
                    {r.source}
                  </span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                    {r.blurb}
                  </span>
                </span>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-coral" />
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-b-2 border-ink bg-sun">
        <div
          aria-hidden
          className="nb-rays nb-spin-slow pointer-events-none absolute -inset-[60%]"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-14 text-center">
          <h2 className="max-w-2xl font-display text-3xl text-balance sm:text-4xl">
            Ideas are the warm-up. <span className="italic">Reps</span> are the
            workout.
          </h2>
          <Link to="/auth">
            <NBButton variant="ink" className="px-8 py-4 text-lg">
              Start practicing free <ArrowRight className="size-5" />
            </NBButton>
          </Link>
        </div>
      </section>
      <PagePager />
    </PublicLayout>
  );
}
