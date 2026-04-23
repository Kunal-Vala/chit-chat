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
        <div className="flex flex-col h-full min-h-0">
            {/* Header matches app-panel-header */}
            <header className="app-panel-header px-6 py-4 flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            Secret Chat
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">E2EE</span>
                        </h3>
                        <p className="text-xs app-muted">Private connection with {recipientUsername}</p>
                    </div>
                </div>
                <button 
                    onClick={endSecretChat}
                    className="app-icon-button hover:bg-red-50 hover:text-red-600"
                    title="Close Connection"
                >
                    <X className="w-5 h-5" />
                </button>
            </header>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-3 shadow-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>
                        This chat is completely end-to-end encrypted. Messages self-destruct 1 minute after reading. <strong>Refreshing or leaving the page permanently wipes the keys and destroys this chat.</strong>
                    </p>
                </div>

                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="flex items-center justify-center py-10 text-[color:var(--app-muted)] text-sm">
                            Ready. Say something safely.
                        </div>
                    )}
                    {messages.map((msg, idx) => {
                        const isOwn = msg.senderId === 'me';
                        
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
                                <div className={`group max-w-[600px] break-words whitespace-pre-wrap app-bubble ${isOwn ? 'app-bubble-own' : 'app-bubble-other'}`}>
                                    <p className="text-[15px]">{msg.content}</p>
                                    <div className="flex items-center justify-end gap-1.5 mt-1 text-[11px] opacity-70">
                                        {timeLeft && (
                                            <span className="flex items-center gap-1 font-medium bg-[color:var(--app-text)] text-[color:var(--app-surface)] px-1 rounded">
                                                <Lock className="w-3 h-3" /> {timeLeft}
                                            </span>
                                        )}
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
            </div>

            {/* Input matching app style */}
            <footer className="px-6 py-4 border-t app-border shrink-0">
                <form onSubmit={handleSend} className="relative flex items-center">
                    <input 
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a secure message..."
                        className="w-full rounded-full border app-border bg-[color:var(--app-surface-elev)] pl-4 pr-14 py-3 text-[15px] text-[color:var(--app-text)] placeholder:text-[color:var(--app-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--app-ring)] shadow-sm"
                    />
                    <div className="absolute right-2 flex items-center">
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </div>
                </form>
            </footer>
        </div>
    );
};
