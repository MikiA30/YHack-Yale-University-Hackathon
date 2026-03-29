import { useState, useRef, useEffect } from 'react'

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
]

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState(MODELS[0].id)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg, model }),
    })
      .then(r => r.json())
      .then(data => {
        setMessages(prev => [...prev, { role: 'assistant', text: data.response, model: data.model }])
        setLoading(false)
      })
      .catch(() => {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Try again.' }])
        setLoading(false)
      })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[32rem] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">A</div>
          <span className="text-sm font-semibold text-white">A.U.R.A. Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="text-xs px-2 py-1 rounded bg-slate-700 border border-slate-600 text-slate-300 focus:outline-none"
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-lg leading-none">&times;</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-8 space-y-2">
            <p>Ask me anything about your store.</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p>"What's running low?"</p>
              <p>"Where's the Red Bull?"</p>
              <p>"How's revenue looking?"</p>
              <p>"What should I reorder this week?"</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm break-words overflow-hidden ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-700 text-slate-200'
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-400 px-3 py-2 rounded-xl text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about your store..."
            className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm transition-colors disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
