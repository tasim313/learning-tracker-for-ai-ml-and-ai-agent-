import type { Metadata } from "next";
import { GameCentre } from "@/components/games/game-centre";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Game and Challenge Centre" };

export default function GamesPage() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Active learning" title="Game and Challenge Centre" description="Concept matching, workflow reconstruction, code reading, debugging, safety decisions, and maths sprints. Each game has a learning objective, clear rules, server-checked answers, and feedback you can revisit." />
      <GameCentre />
    </div>
  );
}
