/**
 * "Go deeper" — the free web shelf. Reputable, 100% free websites on
 * communication, tone, and regulated responses. No books to buy, no
 * paywalls, no sign-ups: every link opens straight onto free content.
 */

export interface ReadingResource {
  title: string;
  /** Who made it — shown as the authority line. */
  source: string;
  blurb: string;
  url: string;
  /** Tailwind bg utility for the accent bar. */
  color: string;
  kind: "article" | "research" | "tool";
}

export const READING_LIST: ReadingResource[] = [
  {
    title: "Active Listening",
    source: "Greater Good in Action · UC Berkeley",
    blurb:
      "The step-by-step protocol from the science-of-happiness lab: paraphrase, ask, validate, watch your body language, park your rebuttal. Ten minutes a week to build this core communication skill.",
    url: "https://ggia.berkeley.edu/practice/active_listening",
    color: "bg-sun",
    kind: "research",
  },
  {
    title: "Body Language & Nonverbal Communication",
    source: "Science of People · Vanessa Van Edwards",
    blurb:
      "The research lab behind the app's warmth drills. A free, deep guide to the signals that build — or spend — trust: faces, hands, and vocal cues you can train.",
    url: "https://www.scienceofpeople.com/body-language/",
    color: "bg-mint",
    kind: "article",
  },
  {
    title: "What is NVC?",
    source: "Center for Nonviolent Communication",
    blurb:
      "Marshall Rosenberg's free explainer on separating observation from evaluation, and hearing the feelings and needs behind “attacks.” The antidote to the reactive text-back.",
    url: "https://www.cnvc.org/learn/what-is-nvc",
    color: "bg-coral",
    kind: "article",
  },
  {
    title: "How to Speak So That People Want to Listen",
    source: "Julian Treasure · TED · 9:44",
    blurb:
      "The seven deadly sins of speaking, and the four foundations — HAIL. Seventy million people have watched it for a reason, and it costs nothing to press play.",
    url: "https://www.ted.com/talks/julian_treasure_how_to_speak_so_that_people_want_to_listen",
    color: "bg-paper",
    kind: "article",
  },
  {
    title: "The “R is for Repair” Research",
    source: "The Gottman Institute",
    blurb:
      "Gottman's lab found repair attempts — any move that stops negativity escalating — predict relationship survival. The Skill exists; it can be practiced.",
    url: "https://www.gottman.com/blog/r-is-for-repair/",
    color: "bg-sun",
    kind: "research",
  },
  {
    title: "Communication Skills Guides",
    source: "HelpGuide · nonprofit, Harvard-reviewed",
    blurb:
      "A nonprofit mental-health resource with Harvard Medical School advisors. Free practical guides on listening, conflict, and saying what you mean without the blame.",
    url: "https://www.helpguide.org/",
    color: "bg-mint",
    kind: "article",
  },
  {
    title: "Visual essays on how we connect",
    source: "The Pudding",
    blurb:
      "A cultural observatory that explains human behavior with interactive data essays — voice, language, and connection, told in charts you can play with. Free, endlessly browsable.",
    url: "https://pudding.cool/",
    color: "bg-coral",
    kind: "tool",
  },
];
