"use client";
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Itinerary, buildTripContext } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TripChatbotProps {
  destination: string;
  itinerary: Itinerary;
}

const SUGGESTED_QUESTIONS = [
  "What should I pack?",
  "How much will food cost per day?",
  "Any local tips for this trip?",
];

export default function TripChatbot({ destination, itinerary }: TripChatbotProps) {
  const chatWithTrip = useAction(api.ai.chatWithTrip);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    try {
      const tripContext = buildTripContext(destination, itinerary);
      const { reply } = await chatWithTrip({
        tripContext,
        history: messages,
        message: text,
      });
      setMessages([...updatedMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-black text-white rounded-full w-14 h-14 shadow-lg text-xl"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white text-black rounded-lg shadow-2xl flex flex-col border">
      <div className="flex justify-between items-center p-3 border-b bg-black text-white rounded-t-lg">
        <span className="font-semibold">Trip Assistant</span>
        <button onClick={() => setOpen(false)}>✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Ask me anything about your {destination} trip.</p>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="block w-full text-left text-sm border rounded p-2 hover:bg-gray-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm p-2 rounded max-w-[85%] ${
              m.role === "user" ? "bg-black text-white ml-auto" : "bg-gray-100 text-black"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-sm text-gray-400">Thinking...</div>}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          className="flex-1 border rounded p-2 text-sm"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
        />
        <button onClick={() => sendMessage(input)} className="bg-black text-white px-3 rounded text-sm">
          Send
        </button>
      </div>
    </div>
  );
}