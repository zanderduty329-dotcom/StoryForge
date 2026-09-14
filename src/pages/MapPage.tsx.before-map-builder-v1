import { useState } from "react";

export function MapPage({ worldId }: { worldId: string }) {
  const [mapType, setMapType] = useState<"world" | "region" | "dungeon" | "city">("world");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  const generateMap = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt || `${mapType} map, fantasy cartography, detailed, top-down view`,
          worldId,
          type: "map",
        }),
      });
      const data = await res.json();
      if (data.r2Key) {
        setMapUrl(`/api/assets/${data.r2Key}`);
      }
    } catch {}
    setGenerating(false);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>AI Map Generator</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {(["world", "region", "dungeon", "city"] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${mapType === t ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMapType(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="form-group">
          <label>Map Description (optional)</label>
          <input
            className="form-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe your ${mapType} map...`}
          />
        </div>
        <button className="btn btn-primary" onClick={generateMap} disabled={generating}>
          {generating ? "Generating map..." : "🗺️ Generate Map"}
        </button>
      </div>

      {mapUrl && (
        <div className="card">
          <h3>Generated Map</h3>
          <img src={mapUrl} alt="Generated map" style={{ width: "100%", borderRadius: 8, marginTop: 12 }} />
        </div>
      )}

      {!mapUrl && !generating && (
        <div className="empty-state">
          <div className="empty-icon">🧭</div>
          <h3>No maps generated yet</h3>
          <p>Use AI to generate world maps, region maps, dungeon layouts, and city plans.</p>
        </div>
      )}
    </div>
  );
}
