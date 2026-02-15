const io = require('socket.io-client');

// Replace with actual JWT token from your login
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTZiYjZjYWNjN2YwZWZjN2QxY2NmM2IiLCJlbWFpbCI6InRlc3R1c2VyMkBleGFtcGxlLmNvbSIsInVzZXJuYW1lIjoidGVzdHVzZXIyIiwidG9rZW5WZXJzaW9uIjoxLCJpYXQiOjE3NjkyNjYxMTgsImV4cCI6MTc2OTM1MjUxOH0.ftakky16jZK-YOdU7AsTbDxTYAIGAquBse_X2Y6pAxw';
const CONVERSATION_ID = '6973a1fc311be40f68538f6a';

const socket = io('http://localhost:5000', {
    auth: { token: TOKEN }
});

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Join conversation
    socket.emit('join-conversation', CONVERSATION_ID);
    console.log('📝 Joined conversation:', CONVERSATION_ID);
    
    // Send a test message
    setTimeout(() => {
        socket.emit('send-message', {
            conversationId: CONVERSATION_ID,
            content: 'Hello from test script!',
            messageType: 'text'
        });
        console.log('📤 Message sent');
    }, 1000);
});

socket.on('new-message', (message) => {
    console.log('📨 New message received:', message);
});

socket.on('message-status-updated', (data) => {
    console.log('✔️ Message status updated:', data);
});

socket.on('user-typing', (data) => {
    console.log('⌨️ User typing:', data.username);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});

// Keep the script running
process.on('SIGINT', () => {
    socket.disconnect();
    process.exit();
});