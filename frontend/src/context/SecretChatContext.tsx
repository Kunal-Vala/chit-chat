import React, { createContext, useContext, useState, useEffect } from 'react';
import { getChatSocket } from '../socket/chatSocket';
import * as cryptoLib from '../utils/crypto';
import { toast } from 'react-toastify';

export interface SecretMessage {
    _id: string;
    conversationId: string;
    senderId: string | { _id: string; username: string };
    content: string; // Plaintext when decrypted, base64 when received
    rawContent?: string; // The original ciphertext
    iv?: string; // Base64 IV
    messageType: 'text';
    deliveryStatus: 'sent' | 'delivered' | 'read';
    sentAt: string;
    expiresAt?: string;
    decrypted?: boolean;
}

interface SecretChatContextState {
    isActive: boolean;
    activeConversationId: string | null;
    recipientId: string | null;
    recipientUsername: string | null;
    messages: SecretMessage[];
    isKeyExchangePending: boolean;
    pendingRequests: {requesterId: string; requesterUsername: string; publicKey: string}[];
    startSecretChat: (recipientId: string, username: string) => Promise<void>;
    acceptSecretChat: (requesterId: string) => Promise<void>;
    declineSecretChat: (requesterId: string) => void;
    sendMessage: (text: string) => Promise<void>;
    markAsRead: (messageId: string) => void;
    endSecretChat: () => void;
}

const SecretChatContext = createContext<SecretChatContextState | null>(null);

export const useSecretChat = () => {
    const ctx = useContext(SecretChatContext);
    if (!ctx) throw new Error('useSecretChat must be used within SecretChatProvider');
    return ctx;
};

export const SecretChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [recipientId, setRecipientId] = useState<string | null>(null);
    const [recipientUsername, setRecipientUsername] = useState<string | null>(null);
    const [messages, setMessages] = useState<SecretMessage[]>([]);
    
    const [localPrivateKey, setLocalPrivateKey] = useState<CryptoKey | null>(null);
    const [sharedSecret, setSharedSecret] = useState<CryptoKey | null>(null);
    const [isKeyExchangePending, setIsKeyExchangePending] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<{requesterId: string; requesterUsername: string; publicKey: string}[]>([]);

    // Handshake Receivers
    useEffect(() => {
        const socket = getChatSocket();
        if (!socket) return;

        const handleRequest = async (data: { requesterId: string; requesterUsername: string; publicKey: string }) => {
            toast.info(`${data.requesterUsername} invited you to a Secret Chat!`);
            setPendingRequests(prev => [...prev, data]);
        };

        const handleAccepted = async (data: { recipientId: string; recipientUsername: string; publicKey: string; conversationId: string }) => {
            try {
                if (!localPrivateKey) throw new Error("No private key found");
                const foreignKey = await cryptoLib.importPublicKey(data.publicKey);
                const derivedKey = await cryptoLib.deriveSecretKey(localPrivateKey, foreignKey);
                
                setSharedSecret(derivedKey);
                setActiveConversationId(data.conversationId);
                setIsActive(true);
                setIsKeyExchangePending(false);
                setRecipientId(data.recipientId);
                setRecipientUsername(data.recipientUsername);

                socket.emit('join-secret-conversation', data.conversationId);
                toast.success(`Secret chat established with ${data.recipientUsername}`);
            } catch (err) {
                console.error("Handshake accept error", err);
                toast.error("Failed to establish secure connection.");
            }
        };

        const handleDeclined = () => {
            toast.info("Secret chat request declined.");
            setIsKeyExchangePending(false);
            setLocalPrivateKey(null);
        };

        const handleReady = (data: { conversationId: string }) => {
             // We've accepted and the server confirmed
             setActiveConversationId(data.conversationId);
             setIsActive(true);
             socket.emit('join-secret-conversation', data.conversationId);
             toast.success("Secret chat session active");
        };

        const handleNewMessage = async (msg: any) => {
            if (activeConversationId !== msg.conversationId) return;

            let plainText = "[Encrypted Message]";
            let decrypted = false;
            
            if (sharedSecret && msg.content && msg.iv) {
                try {
                    plainText = await cryptoLib.decryptMessage(msg.content, msg.iv, sharedSecret);
                    decrypted = true;
                } catch (e) {
                    plainText = "[Decryption Failed]";
                }
            }

            setMessages(prev => [...prev, { ...msg, rawContent: msg.content, content: plainText, decrypted }]);
        };

        const handleSentAck = (data: { tempId: string, realId: string }) => {
            setMessages(prev => prev.map(m => 
                m._id === data.tempId ? { ...m, _id: data.realId } : m
            ));
        };

        const handleStatusUpdate = (data: { messageId: string, status: string, expiresAt: string }) => {
            setMessages(prev => prev.map(m => 
                m._id === data.messageId 
                    ? { ...m, deliveryStatus: data.status as any, expiresAt: data.expiresAt }
                    : m
            ));
        };

        let disconnectTimeout: ReturnType<typeof setTimeout> | null = null;
        
        const handlePartnerDisconnected = (data: { conversationId: string }) => {
            if (data.conversationId === activeConversationId) {
                toast.warning("Partner disconnected. This chat will terminate in 10 seconds unless they rejoin.");
                disconnectTimeout = setTimeout(() => {
                    toast.error("Secret Chat security protocol: Terminated due to participant exiting.");
                    setIsActive(false);
                    setActiveConversationId(null);
                    setLocalPrivateKey(null);
                    setSharedSecret(null);
                    setMessages([]);
                    setRecipientId(null);
                    setRecipientUsername(null);
                }, 10000);
            }
        };

        socket.on('secret-chat-request-received', handleRequest);
        socket.on('secret-chat-accepted', handleAccepted);
        socket.on('secret-chat-declined', handleDeclined);
        socket.on('secret-chat-ready', handleReady);
        socket.on('new-secret-message', handleNewMessage);
        socket.on('secret-message-sent-ack', handleSentAck);
        socket.on('secret-message-status-updated', handleStatusUpdate);
        socket.on('secret-chat-partner-disconnected', handlePartnerDisconnected);

        return () => {
            if (disconnectTimeout) clearTimeout(disconnectTimeout);
            socket.off('secret-chat-request-received', handleRequest);
            socket.off('secret-chat-accepted', handleAccepted);
            socket.off('secret-chat-declined', handleDeclined);
            socket.off('secret-chat-ready', handleReady);
            socket.off('new-secret-message', handleNewMessage);
            socket.off('secret-message-sent-ack', handleSentAck);
            socket.off('secret-message-status-updated', handleStatusUpdate);
            socket.off('secret-chat-partner-disconnected', handlePartnerDisconnected);
        };
    }, [localPrivateKey, sharedSecret, activeConversationId]);

    // Timer check for auto-deletion
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            setMessages(prev => prev.filter(m => {
                if (!m.expiresAt) return true;
                return new Date(m.expiresAt).getTime() > now;
            }));
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, []);

    const startSecretChat = async (targetId: string, targetUsername: string) => {
        const keys = await cryptoLib.generateEphemeralKeys();
        setLocalPrivateKey(keys.privateKey);
        
        const publicKeyBase64 = await cryptoLib.exportPublicKey(keys.publicKey);
        setIsKeyExchangePending(true);
        setRecipientId(targetId);
        setRecipientUsername(targetUsername);

        const socket = getChatSocket();
        socket?.emit('secret-chat-request', { recipientId: targetId, publicKey: publicKeyBase64 });
    };

    const acceptSecretChat = async (requesterId: string) => {
        const request = pendingRequests.find(r => r.requesterId === requesterId);
        if (!request) return;

        try {
            const keys = await cryptoLib.generateEphemeralKeys();
            const foreignKey = await cryptoLib.importPublicKey(request.publicKey);
            const derivedKey = await cryptoLib.deriveSecretKey(keys.privateKey, foreignKey);
            
            setLocalPrivateKey(keys.privateKey);
            setSharedSecret(derivedKey);
            setRecipientId(request.requesterId);
            setRecipientUsername(request.requesterUsername);

            const myPublicKeyBase64 = await cryptoLib.exportPublicKey(keys.publicKey);
            
            const socket = getChatSocket();
            socket?.emit('secret-chat-accept', { requesterId: request.requesterId, publicKey: myPublicKeyBase64 });
            
            setPendingRequests(prev => prev.filter(r => r.requesterId !== requesterId));
        } catch (err) {
            console.error(err);
            toast.error("Handshake failed.");
        }
    };

    const declineSecretChat = (requesterId: string) => {
        const socket = getChatSocket();
        socket?.emit('secret-chat-decline', { requesterId });
        setPendingRequests(prev => prev.filter(r => r.requesterId !== requesterId));
    };

    const sendMessage = async (text: string) => {
        if (!sharedSecret || !activeConversationId) return;

        try {
            const encryptedData = await cryptoLib.encryptMessage(text, sharedSecret);
            const socket = getChatSocket();
            const tempId = Math.random().toString();
            socket?.emit('send-secret-message', {
                conversationId: activeConversationId,
                content: encryptedData.ciphertext,
                iv: encryptedData.iv,
                tempId: tempId
            });

            // Optimistic rendering
            const tempMsg: SecretMessage = {
                _id: tempId,
                conversationId: activeConversationId,
                senderId: 'me', // handled by UI
                content: text,
                messageType: 'text',
                deliveryStatus: 'sent',
                sentAt: new Date().toISOString(),
                decrypted: true
            };
            setMessages(prev => [...prev, tempMsg]);

        } catch (err) {
            console.error("Encryption failed", err);
            toast.error("Failed to encrypt message.");
        }
    };

    const markAsRead = (messageId: string) => {
        const socket = getChatSocket();
        socket?.emit('secret-message-read', messageId);
    };

    const endSecretChat = () => {
        if (activeConversationId) {
            getChatSocket()?.emit('leave-secret-conversation', activeConversationId);
        }
        setIsActive(false);
        setActiveConversationId(null);
        setLocalPrivateKey(null);
        setSharedSecret(null);
        setMessages([]);
        setRecipientId(null);
        setRecipientUsername(null);
    };

    return (
        <SecretChatContext.Provider value={{
            isActive,
            activeConversationId,
            recipientId,
            recipientUsername,
            messages,
            isKeyExchangePending,
            pendingRequests,
            startSecretChat,
            acceptSecretChat,
            declineSecretChat,
            sendMessage,
            markAsRead,
            endSecretChat
        }}>
            {children}
        </SecretChatContext.Provider>
    );
};
