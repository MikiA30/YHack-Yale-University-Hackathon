import { useEffect, useRef, useState } from "react";

const MODELS = [{ id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" }];
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

function sanitizeAnalysis(analysis) {
  if (!analysis) {
    return null;
  }
  return JSON.parse(JSON.stringify(analysis));
}

export default function ChatPanel({ analysis }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if (!input.trim() || loading) {
      return;
    }

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    fetch(`${API_BASE}/domains/omnicrop/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMsg,
        model,
        analysis: sanitizeAnalysis(analysis),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.response, model: data.model },
        ]);
        setLoading(false);
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Something went wrong. Try again.",
          },
        ]);
        setLoading(false);
      });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg transition-shadow hover:shadow-xl"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-96 flex-col rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-semibold text-white">A.U.R.A. Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-300 focus:outline-none"
          >
            {MODELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setOpen(false)}
            className="text-lg leading-none text-slate-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="mt-8 space-y-2 text-center text-sm text-slate-500">
            <p>Ask me about the current harvest recommendation.</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p>"Should I plant now or wait?"</p>
              <p>"What is the biggest harvest risk?"</p>
              <p>"Why is corn ahead of soybeans?"</p>
              <p>"What would change the recommendation?"</p>
            </div>
          </div>
        ) : null}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] overflow-hidden rounded-xl px-3 py-2 text-sm break-words ${
                msg.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-slate-700 text-slate-200"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-slate-400">
              Thinking...
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-700 px-3 py-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about your harvest..."
            className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
