# 📖 StoryForge

**An AI-powered storytelling & world-building platform where everything is connected, remembered, and reusable.**

> The AI provides the foundation. The human creates the story. The world belongs to its creator.

## Architecture

StoryForge is built entirely on Cloudflare's developer platform:

| Component | Cloudflare Product | Role |
|-----------|-------------------|------|
| **API Backend** | [Workers](https://developers.cloudflare.com/workers/) + Hono | All `/api/*` routes, AI orchestration, asset CRUD |
| **Story Bible Database** | [D1](https://developers.cloudflare.com/d1/) | SQL storage for worlds, characters, monsters, locations, lore, events, campaigns, player knowledge, version history |
| **Semantic Memory** | [Vectorize](https://developers.cloudflare.com/vectorize/) | Vector embeddings of all assets for semantic search & RAG — the AI "remembers" your world |
| **AI Generation** | [Workers AI](https://developers.cloudflare.com/workers-ai/) | Text generation (stories, characters, monsters), image generation (portraits, maps, scenes), embeddings |
| **Live Multiplayer** | [Durable Objects](https://developers.cloudflare.com/durable-objects/) + WebSockets | Real-time campaign sessions, DM overrides, dice rolls, shared state |
| **Asset Storage** | [R2](https://developers.cloudflare.com/r2/) | Generated images, maps, artwork |
| **Frontend** | React + Vite + `@cloudflare/vite-plugin` | Creative studio UI, served as static assets by the Worker |

## Features Implemented

### ✅ Story Bible / World Engine
- Central source of truth per world with genre, tone, sliders (darkness, realism, humor, violence, romance, complexity, fantasy/sci-fi level)
- Auto-generated Master Prompt
- Timeline / events tracking

### ✅ Character Archive
- Full character sheets (appearance, personality, backstory, goals, fears, abilities, weaknesses, equipment)
- Persistent health, status, knowledge, secrets
- AI generation grounded in Story Bible context
- Image generation hook

### ✅ Monster / Creature Archive
- Detailed creature records (stats, abilities, weaknesses, resistances, loot, behavior)
- Persistent condition tracking (injuries remembered across encounters)
- AI generation

### ✅ Location & World Archive
- Cities, dungeons, castles, forests, kingdoms, planets
- Connected to characters, monsters, factions

### ✅ Lore Archive
- Religions, magic systems, technology, factions, languages, cultures, history

### ✅ Inspiration Dice (Random Generator)
- Character, World, Monster, and Story dice
- Lock individual results, reroll others
- Build ideas gradually

### ✅ "What If?" Creative Tools
- Make it darker, funnier, higher stakes, add twist, villain, romance, mystery, betrayal, monster, surprise me

### ✅ AI Assistant Panel
- Always-accessible chat grounded in Story Bible context
- References established canon before generating

### ✅ RPG / DM Mode
- Live WebSocket sessions via Durable Objects
- DM override system — DM has final authority, logged
- Dice rolls (d20, d12, d100)
- Real-time chat (in-character and out-of-character)
- Role selection (DM, Player, Spectator)

### ✅ AI Permission System
- Per-world toggle: Story Bible, Character Archive, Monster Archive, World Archive, Player Knowledge, Private DM Notes, Community Library, External Knowledge, Other Players' Notes

### ✅ Semantic Search
- All assets indexed in Vectorize via embeddings
- Search across your entire world by meaning, not just keywords

### ✅ Version History
- Asset version snapshots with change descriptions
- View or restore previous versions

### ✅ Player Knowledge System
- Track what each player has discovered vs. DM-only information
- Knowledge boundaries per campaign

## Getting Started

### Prerequisites
- Node.js 18+
- A Cloudflare account

### Setup

```bash
# Install dependencies
npm install

# Create D1 database
npm run db:create
# Copy the database_id from the output into wrangler.jsonc

# Run database migrations
npm run db:migrate:local

# Create Vectorize index
npm run vector:create

# Create R2 bucket
npm run r2:create

# Generate Cloudflare types
npm run cf-typegen

# Start dev server
npm run dev
```

### Deploy

```bash
# Run migrations on production D1
npm run db:migrate

# Deploy to Cloudflare
npm run deploy
```

## Project Structure

```
storyforge/
├── src/
│   ├── worker.ts                    # Hono API — all /api/* routes
│   ├── durable-objects/
│   │   └── world-session.ts         # Live multiplayer session DO
│   ├── db/
│   │   └── schema.sql               # Full D1 schema (Story Bible + all archives)
│   ├── pages/
│   │   ├── HomePage.tsx             # World selection & creation
│   │   ├── WorldPage.tsx            # Story Bible overview, timeline, settings, AI permissions
│   │   ├── CharacterPage.tsx        # Character archive with AI generation
│   │   ├── MonsterPage.tsx          # Monster archive with AI generation
│   │   ├── LocationPage.tsx         # Location archive
│   │   ├── LorePage.tsx             # Lore archive
│   │   ├── MapPage.tsx              # AI map generation
│   │   ├── InspirationPage.tsx      # Story dice with lock/reroll
│   │   └── SessionPage.tsx          # Live campaign session (WebSocket)
│   ├── components/
│   │   └── AIAssistant.tsx          # Persistent AI chat + What If tools
│   ├── App.tsx                      # Main layout & navigation
│   ├── main.tsx                     # React entry
│   └── styles.css                   # Global styles
├── wrangler.jsonc                   # Cloudflare config (D1, AI, Vectorize, R2, DO bindings)
├── vite.config.ts                   # Vite + Cloudflare plugin
├── tsconfig.json
└── package.json
```

## Design Principles

1. **Everything is interconnected** — Characters link to stories, stories to scenes, scenes to locations, locations to monsters, monsters to maps, maps to images.

2. **The Story Bible is the central nervous system** — Every AI generation references it for continuity and consistency.

3. **The AI assists, the human decides** — The DM override system enforces this. The AI never has final authority.

4. **Memory is persistent** — Vectorize + D1 ensure the AI remembers what has happened instead of starting from scratch.

5. **The world belongs to its creator** — AI permissions, visibility settings, and community sharing controls put the creator in charge.

## License

MIT
