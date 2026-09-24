import React, { useState, useEffect, useRef } from 'react';
import { Room, User } from '../types';
import {
  RoomChatMessage,
  sendRoomChatMessage,
  subscribeToRoomChat,
} from '../firebase';
import { Send, MessageSquare } from 'lucide-react';

interface RoomChatProps {
  room: Room;
  currentUser: User;
  onSendVibe?: (emoji: string, text: string) => void;
}

export const RoomChat: React.FC<RoomChatProps> = ({
  room,
  currentUser,
}) => {
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time chat messages via Firestore
  useEffect(() => {
    if (!room?.code) return;
    const unsubscribe = subscribeToRoomChat(room.code, (newMessages) => {
      setMessages(newMessages);
    });
    return () => unsubscribe();
  }, [room?.code]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputVal('');

    try {
      await sendRoomChatMessage(room.code, {
        roomCode: room.code,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text,
      });
    } catch (err) {
      console.warn('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const quickReactions = ['🍿 Ready!', '😂 Hilarious', '🔥 Love it', '😱 Scary!', '👍 I vote Yes!'];

  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Room Chat & Activity</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <span className="text-[10px] text-slate-400">Live synced with room #{room.code}</span>
          </div>
        </div>

        <div className="flex items-center -space-x-1.5">
          {room.users.slice(0, 4).map((u) => (
            <img
              key={u.id}
              src={u.avatar}
              alt={u.name}
              title={u.name}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-black"
            />
          ))}
          {room.users.length > 4 && (
            <div className="w-6 h-6 rounded-full bg-white/10 text-[9px] font-bold text-slate-300 flex items-center justify-center ring-1 ring-black">
              +{room.users.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-3.5 space-y-2.5 overflow-y-auto max-h-64 min-h-[160px] text-xs"
      >
        {messages.length === 0 ? (
          <div className="h-full py-8 flex flex-col items-center justify-center text-slate-500 text-center">
            <MessageSquare className="w-6 h-6 mb-1 opacity-40" />
            <p className="text-xs">No chat messages yet in #{room.code}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Say hello or tap a quick reaction below!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderName}
                  className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-rose-600 text-white rounded-tr-none shadow-md shadow-rose-950/40'
                      : 'bg-white/10 text-slate-200 rounded-tl-none border border-white/10'
                  }`}
                >
                  {!isMe && (
                    <span className="block text-[10px] font-bold text-slate-400 mb-0.5">
                      {msg.senderName}
                    </span>
                  )}
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Reaction Buttons */}
      <div className="px-3 py-1.5 bg-black/40 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickReactions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setInputVal(q);
            }}
            className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-medium text-slate-300 whitespace-nowrap transition cursor-pointer border border-white/10"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-black/40 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type message to your crew..."
          className="flex-1 h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-rose-500 transition"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isSending}
          className="h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
