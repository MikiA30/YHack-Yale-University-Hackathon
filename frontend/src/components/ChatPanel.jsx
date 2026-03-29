import { useState, useRef, useEffect } from "react";
import AuraLogo from "./AuraLogo";

const MODELS = [{ id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" }];

const SUGGESTIONS = [
  "How is my business doing?",
  "What should I reorder?",
  "Generate report",
  "What's my best margin item?",
];

export default function ChatPanel({ onOpenReport }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = (overrideText) => {
    const userMsg = (overrideText ?? input).trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg, model }),
    })
      .then((r) => r.json())
      .then((data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.response, model: data.model },
        ]);
        setLoading(false);
        if (data.action === "open_report" || data.action === "show_forecast") {
          onOpenReport?.(data.action === "show_forecast" ? "forecast" : null);
        }
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Something went wrong. Please try again.",
          },
        ]);
        setLoading(false);
      });
  };

  // Floating button (closed state)
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-gray-900 hover:bg-black text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 active:scale-95 overflow-hidden"
        aria-label="Open chat"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[34rem] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2.5">
          <AuraLogo size={28} />
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">
              A.U.R.A.
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Store advisor</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 focus:outline-none focus:border-gray-400 transition-all duration-150"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-150"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/40">
        {messages.length === 0 && (
          <div className="py-4 space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 w-10 h-10 flex items-center justify-center">
                <AuraLogo size={40} />
              </div>
              <p className="text-sm font-medium text-gray-700">
                How can I help you today?
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ask anything about your store.
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-600 font-medium transition-all duration-150 active:scale-[0.97]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 mt-0.5 mr-2">
                <AuraLogo size={24} />
              </div>
            )}
            <div
              className={`
                max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                ${
                  msg.role === "user"
                    ? "bg-gray-900 text-white rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                }
              `}
            >
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="shrink-0 mt-0.5 mr-2">
              <AuraLogo size={24} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="px-3 py-3 border-t border-gray-100 bg-white">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-gray-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-gray-900/10 transition-all duration-150">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about your store…"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none py-0.5"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-900 hover:bg-black text-white transition-all duration-150 disabled:opacity-30 active:scale-[0.94] shrink-0"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
