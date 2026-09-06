import { useState, useRef, useEffect } from "react";
import type { World } from "../App";

interface AIAssistantProps {
  world: World | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant({ world }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          worldId: world?.id,
          type: "assistant",
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "I couldn't generate a response." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect to the AI service." },
      ]);
    }
    setLoading(false);
  };

  const whatIfActions = [
    { action: "darker", label: "🌑 Darker", icon: "🌑" },
    { action: "funnier", label: "😄 Funnier", icon: "😄" },
    { action: "stakes", label: "⚡ Higher Stakes", icon: "⚡" },
    { action: "twist", label: "🔄 Plot Twist", icon: "🔄" },
    { action: "villain", label: "😈 New Villain", icon: "😈" },
    { action: "romance", label: "❤️ Romance", icon: "❤️" },
    { action: "mystery", label: "🔍 Mystery", icon: "🔍" },
    { action: "betrayal", label: "🗡️ Betrayal", icon: "🗡️" },
    { action: "monster", label: "🐉 New Monster", icon: "🐉" },
    { action: "surprise", label: "✨ Surprise Me", icon: "✨" },
  ];

  const runWhatIf = async (action: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, worldId: world?.id, currentContent: "" }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "user", content: `What if... ${action}?` },
        { role: "assistant", content: data.response || "No response generated." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Couldn't process that request." },
      ]);
    }
    setLoading(false);
    setWhatIfOpen(false);
  };

  if (!open) {
    return (
      <button className="ai-toggle-btn" onClick={() => setOpen(true)} title="AI Assistant">
        🤖
      </button>
    );
  }

  return (
    <aside className="ai-panel">
      <div className="ai-panel-header">
        <span>🤖 AI Assistant</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={() => setWhatIfOpen(!whatIfOpen)}>
            ✨ What If?
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
      </div>

      {whatIfOpen && (
        <div className="what-if-grid">
          {whatIfActions.map((w) => (
            <button
              key={w.action}
              className="what-if-btn"
              onClick={() => runWhatIf(w.action)}
              disabled={loading}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}

      <div className="ai-chat" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="ai-placeholder">
            Ask me anything about your world, or use "What If?" to explore creative directions.
            {world ? ` I'm grounded in your Story Bible for "${world.name}".` : " Select a world to ground me in your Story Bible."}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div className="chat-msg-role">{msg.role === "user" ? "You" : "AI"}</div>
            <div className="chat-msg-content">{msg.content}</div>
          </div>
        ))}
        {loading && <div className="chat-msg assistant"><div className="chat-msg-content">Thinking...</div></div>}
      </div>

      <div className="ai-input-row">
        <input
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask the AI..."
          disabled={loading}
        />
        <button className="btn btn-primary btn-sm" onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </aside>
  );
}
