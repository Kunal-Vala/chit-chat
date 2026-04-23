import React, { useState, useEffect, useRef } from 'react';
import { useSecretChat } from '../context/SecretChatContext';
import { X, Lock, Send, ShieldAlert } from 'lucide-react';

const formatTime = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const SecretChatUI: React.FC = () => {
    const { 
        isActive, 
        recipientUsername, 
        messages, 
        sendMessage, 
        endSecretChat, 
        markAsRead 
    } = useSecretChat();

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark messages as read when they appear
    useEffect(() => {
        messages.forEach(msg => {
            if (msg.senderId !== 'me' && msg.deliveryStatus !== 'read') {
                markAsRead(msg._id);
            }
        });
    }, [messages, markAsRead]);

    if (!isActive) return null;

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input.trim());
        setInput('');
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 border-l border-slate-700 shadow-2xl relative z-50">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-slate-700 bg-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                            Secret Chat
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                E2EE Active
                            </span>
                        </h2>
                        <p className="text-sm text-slate-400">with {recipientUsername}</p>
                    </div>
                </div>
                <button 
                    onClick={endSecretChat}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"
                    title="End Secret Chat"
                >
                    <X className="w-5 h-5" />
                </button>
            </header>

            {/* Warning Banner */}
            <div className="bg-slate-800/50 p-3 text-xs text-slate-400 flex items-start gap-3 border-b border-slate-700/50">
                <ShieldAlert className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <p>
                    Messages in this chat are end-to-end encrypted. They will self-destruct 1 minute after being read. 
                    If you close this window or refresh the page, the encryption keys will be permanently destroyed and this chat will be lost forever.
                </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        No messages yet. Send a secure message to start.
                    </div>
                )}
                {messages.map((msg, idx) => {
                    const isOwn = msg.senderId === 'me';
                    
                    // calculate time left if expiresAt is set
                    let timeLeft = '';
                    if (msg.expiresAt) {
                        const msLeft = new Date(msg.expiresAt).getTime() - Date.now();
                        if (msLeft > 0) {
                            timeLeft = `${Math.ceil(msLeft / 1000)}s`;
                        } else {
                            timeLeft = '0s';
                        }
                    }

                    return (
                        <div key={msg._id || idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl p-3 ${isOwn ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'}`}>
                                <p className="whitespace-pre-wrap text-[15px]">{msg.content}</p>
                                <div className={`flex items-center justify-end gap-2 mt-1 text-[11px] ${isOwn ? 'text-emerald-200' : 'text-slate-400'}`}>
                                    {timeLeft && <span className="flex items-center gap-1"><Lock className="w-3 h-3"/> {timeLeft}</span>}
                                    <span>{formatTime(msg.sentAt)}</span>
                                    {isOwn && (
                                        <span>
                                            {msg.deliveryStatus === 'read' ? '••' : msg.deliveryStatus === 'delivered' ? '✓✓' : '✓'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800 border-t border-slate-700">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a secure message..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition text-slate-100 placeholder:text-slate-500"
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim()}
                        className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center shrink-0 w-12 h-12"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};
