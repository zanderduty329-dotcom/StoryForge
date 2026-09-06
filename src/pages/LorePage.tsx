import { useState, useEffect } from "react";

export function LorePage({ worldId }: { worldId: string }) {
  const [lore, setLore] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "history", title: "", content: "" });

  const fetchLore = async () => {
    try {
      const res = await fetch(`/api/worlds/${worldId}/lore`);
      if (res.ok) setLore(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLore(); }, [worldId]);

  const createLore = async () => {
    try {
      await fetch(`/api/worlds/${worldId}/lore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ category: "history", title: "", content: "" });
      setShowForm(false);
      fetchLore();
    } catch {}
  };

  const categories = [...new Set(lore.map((l) => l.category))];

  if (loading) return <div className="loading">Loading lore...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Lore Entry"}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <div className="form-group">
            <label>Category</label>
            <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="history">History</option>
              <option value="religion">Religion</option>
              <option value="magic">Magic System</option>
              <option value="technology">Technology</option>
              <option value="faction">Faction</option>
              <option value="language">Language</option>
              <option value="culture">Culture</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Title</label>
            <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., The Great Schism" />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea className="form-input" rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Describe this lore entry..." />
          </div>
          <button className="btn btn-primary" onClick={createLore}>Save Lore</button>
        </div>
      )}

      {lore.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <h3>No lore entries yet</h3>
          <p>Build the mythology, history, and rules of your world.</p>
        </div>
      ) : (
        <div>
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <h3 className="section-header">{cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
              <div className="card-grid">
                {lore.filter((l) => l.category === cat).map((entry) => (
                  <div key={entry.id} className="card">
                    <h4>{entry.title}</h4>
                    <p className="text-secondary">{entry.content?.substring(0, 200)}{entry.content?.length > 200 ? "..." : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
