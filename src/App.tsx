import { DicePage } from "./pages/DicePage";
import { StoryBiblePage } from "./pages/StoryBiblePage";
import { useState, useEffect, useCallback } from "react";
import { HomePage } from "./pages/HomePage";
import { WorldPage } from "./pages/WorldPage";
import { CharacterPage } from "./pages/CharacterPage";
import { MonsterPage } from "./pages/MonsterPage";
import { LocationPage } from "./pages/LocationPage";
import { LorePage } from "./pages/LorePage";
import { MapPage } from "./pages/MapPage";
import { InspirationPage } from "./pages/InspirationPage";
import { SessionPage } from "./pages/SessionPage";
import { AIAssistant } from "./components/AIAssistant";
import { CampaignProvider } from "./context/CampaignContext";

export type Page =
  | "home"
  | "world"
  | "storyBible"
  | "characters"
  | "monsters"
  | "locations"
  | "lore"
  | "maps"
  | "dice"
  | "inspiration"
  | "session";

export interface World {
  id: string;
  name: string;
  premise: string;
  genre: string;
  tone: string;
  visibility: string;
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [worlds, setWorlds] = useState<World[]>([]);
  const [activeWorld, setActiveWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(true);

const fetchWorlds = useCallback(() => {
  try {
    const saved = localStorage.getItem("storyforge-worlds");
    setWorlds(saved ? JSON.parse(saved) : []);
  } catch {
    setWorlds([]);
  }

  setLoading(false);
}, []);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  const openWorld = (world: World) => {
    setActiveWorld(world);
    setPage("world");
  };

  const navItems: { key: Page; icon: string; label: string; needsWorld: boolean }[] = [
    { key: "home", icon: "🏠", label: "Home", needsWorld: false },
    { key: "world", icon: "🌍", label: "Story Bible", needsWorld: true },
    { key: "characters", icon: "🎭", label: "Characters", needsWorld: true },
    { key: "monsters", icon: "🐉", label: "Monsters", needsWorld: true },
    { key: "locations", icon: "🗺️", label: "Locations", needsWorld: true },
    { key: "lore", icon: "📜", label: "Lore", needsWorld: true },
    { key: "maps", icon: "🧭", label: "Maps", needsWorld: true },
    { key: "dice", icon: "🎲", label: "Dice", needsWorld: false },
    { key: "inspiration", icon: "🎲", label: "Inspiration", needsWorld: false },
    { key: "session", icon: "⚔️", label: "Live Session", needsWorld: true },
  ];

  return (
    <CampaignProvider
      campaignId={activeWorld?.id ?? null}
    >
      <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">📖 StoryForge</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const disabled = item.needsWorld && !activeWorld;
            return (
              <button
                key={item.key}
                className={`nav-item ${page === item.key ? "active" : ""}`}
                onClick={() => !disabled && setPage(item.key)}
                style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                title={disabled ? "Select a world first" : item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        {activeWorld && (
          <div style={{ marginTop: "auto", padding: "16px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>ACTIVE WORLD</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{activeWorld.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{activeWorld.genre}</div>
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="top-bar">
          <h1>
            {page === "home" && "What are we building today?"}
            {page === "monsters" && "Monster & Creature Archive"}
            {page === "locations" && "Location & World Archive"}
            {page === "lore" && "Lore Archive"}
            {page === "maps" && "Map System"}
            {page === "dice" && "Dice Roller"}
            {page === "inspiration" && "Inspiration Mode — Story Dice"}
            {page === "session" && "Live Campaign Session"}
          </h1>
          {activeWorld && page !== "home" && (
            <button className="btn btn-secondary btn-sm" onClick={() => setPage("home")}>
              ← Switch World
            </button>
          )}
        </div>

        <div className="content-area">
          {page === "home" && (
            <HomePage worlds={worlds} loading={loading} onOpenWorld={openWorld} onWorldCreated={fetchWorlds} />
          )}
{page === "world" && activeWorld && (
  <WorldPage world={activeWorld} onNavigate={setPage} />
)}          {page === "characters" && activeWorld && <CharacterPage worldId={activeWorld.id} />}
{page === "storyBible" && activeWorld && (
  <StoryBiblePage world={activeWorld} />
)}          {page === "monsters" && activeWorld && <MonsterPage worldId={activeWorld.id} />}
          {page === "locations" && activeWorld && <LocationPage worldId={activeWorld.id} />}
          {page === "lore" && activeWorld && <LorePage worldId={activeWorld.id} />}
          {page === "maps" && activeWorld && <MapPage worldId={activeWorld.id} />}
          {page === "dice" && <DicePage worldId={activeWorld?.id} />}
          {page === "inspiration" && <InspirationPage />}
          {page === "session" && activeWorld && <SessionPage worldId={activeWorld.id} />}
        </div>
      </main>

      {/* ── AI Assistant Panel ── */}
      <AIAssistant world={activeWorld} />
      </div>
    </CampaignProvider>
  );
}
