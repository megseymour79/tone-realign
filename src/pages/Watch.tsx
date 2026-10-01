import { NBBadge, NBButton } from "@/components/nb";
import { PublicLayout } from "@/components/PublicLayout";
import { PagePager } from "@/components/PagePager";
import { WatchLearnSection } from "@/components/VideoCard";
import { WATCH_LIST } from "@/lib/watch-list";
import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router";

/**
 * /watch — the full video gallery. One curated video per card, each
 * paired with the drill that lets you practice the idea out loud.
 * The home page carries only a teaser; this page is the whole shelf.
 */
export default function Watch() {
  return (
    <PublicLayout>
      <section className="nb-grid-dots border-b-2 border-ink">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <NBBadge className="bg-coral text-ink">Watch & learn</NBBadge>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
            The people who <span className="italic text-sun">study this</span>{" "}
            for a living.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Seven curated videos on tone, delivery, and regulated responses —
            from Jefferson Fisher to Vanessa Van Edwards. Every one ends the
            same way: with a drill underneath it, so you can practice the idea.
          </p>
        </div>
      </section>

      <WatchLearnSection
        videos={WATCH_LIST}
        heading="All the videos"
        subheading="Coaches, interrogators, and researchers on what your voice broadcasts before your words land."
      />

      {/* Cross-link: the research shelf lives in the library */}
      <section className="border-b-2 border-ink bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8">
          <div className="flex items-center gap-4">
            <span className="nb flex size-11 shrink-0 items-center justify-center bg-card">
              <BookOpen className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg leading-tight">
                Prefer reading? The research shelf has the books and studies.
              </p>
              <p className="text-sm text-muted-foreground">
                The long-form ideas behind these videos — every link goes to
                the author.
              </p>
            </div>
          </div>
          <Link to="/library">
            <NBButton variant="ink" className="text-xs">
              Open the library <ArrowRight className="size-3.5" />
            </NBButton>
          </Link>
        </div>
      </section>
      <PagePager />
    </PublicLayout>
  );
}
