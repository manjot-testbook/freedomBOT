// Azure OpenAI Realtime API Client with WebRTC
class RealtimeClient {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.audioElement = document.getElementById('audioPlayer');
        this.config = null;
        this.isConnected = false;
    }

    async initialize() {
        try {
            // Fetch Azure OpenAI configuration from backend
            const response = await fetch('/api/config');
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch configuration');
            }
            this.config = await response.json();
            console.log('Configuration loaded successfully');
        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }
    }

    async connect() {
        if (this.isConnected) {
            console.log('Already connected');
            return;
        }

        try {
            updateStatus('connecting', 'Connecting to Azure OpenAI...');

            // Create RTCPeerConnection
            this.peerConnection = new RTCPeerConnection();

            // Set up audio element for remote stream
            this.peerConnection.ontrack = (event) => {
                console.log('Received remote track:', event.track.kind);
                if (event.track.kind === 'audio') {
                    this.audioElement.srcObject = event.streams[0];
                }
            };

            // Add local audio track (microphone)
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            stream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, stream);
            });

            // Create data channel for sending/receiving messages
            this.dataChannel = this.peerConnection.createDataChannel('oai-events');

            this.dataChannel.onopen = () => {
                console.log('Data channel opened');
                this.isConnected = true;
                updateStatus('connected', 'Connected - Speak now!');

                // Send session configuration
                this.sendMessage({
                    type: 'session.update',
                    session: {
                        modalities: ['text', 'audio'],
                        instructions: 'You are a helpful AI assistant. Respond naturally and conversationally. Use English as first choice, swtich to hindi if user speaks hindi with an Indian Accent,
                        voice: 'alloy',
                        input_audio_format: 'pcm16',
                        output_audio_format: 'pcm16',
                        turn_detection: {
                            type: 'server_vad',
                            threshold: 0.8,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 500
                        }
                    }
                });
            };

            this.dataChannel.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            this.dataChannel.onerror = (error) => {
                console.error('Data channel error:', error);
                updateStatus('error', 'Connection error');
            };

            this.dataChannel.onclose = () => {
                console.log('Data channel closed');
                this.isConnected = false;
                updateStatus('disconnected', 'Disconnected');
            };

            // Create and set local description
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            // Use regional WebRTC endpoint with model (deployment) query parameter
            const url = `${this.config.webrtcEndpoint}?model=${encodeURIComponent(this.config.deployment)}`;

            console.log('Connecting to:', url);

            // Send offer to Azure OpenAI regional WebRTC endpoint with ephemeral Bearer token
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.ephemeralKey}`,
                    'Content-Type': 'application/sdp'
                },
                body: offer.sdp
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to connect: ${response.status} - ${errorText}`);
            }

            const answerSdp = await response.text();
            await this.peerConnection.setRemoteDescription({
                type: 'answer',
                sdp: answerSdp
            });

            console.log('Connection established');

        } catch (error) {
            console.error('Connection error:', error);
            updateStatus('error', `Error: ${error.message}`);
            addMessage('system', `Connection failed: ${error.message}`);
            this.disconnect();
            throw error;
        }
    }

    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(message));
        }
    }

    handleServerMessage(message) {
        console.log('Received message:', message.type);

        switch (message.type) {
            case 'session.created':
                addMessage('system', 'Session created successfully');
                break;

            case 'session.updated':
                addMessage('system', 'Session configured');
                break;

            case 'input_audio_buffer.speech_started':
                updateStatus('speaking', 'Listening to you...');
                addMessage('system', '🎤 Listening...');
                break;

            case 'input_audio_buffer.speech_stopped':
                updateStatus('connected', 'Processing...');
                break;

            case 'conversation.item.created':
                if (message.item && message.item.type === 'message') {
                    console.log('Message created:', message.item);
                }
                break;

            case 'response.text.delta':
                if (message.delta) {
                    appendToLastMessage('assistant', message.delta);
                }
                break;

            case 'response.text.done':
                if (message.text) {
                    addMessage('assistant', message.text);
                }
                break;

            case 'response.audio_transcript.delta':
                if (message.delta) {
                    appendToLastMessage('assistant', message.delta);
                }
                break;

            case 'response.audio_transcript.done':
                if (message.transcript) {
                    addMessage('assistant', message.transcript);
                }
                break;

            case 'response.audio.delta':
                // Audio is played automatically via WebRTC
                updateStatus('speaking', '🔊 AI is speaking...');
                break;

            case 'response.audio.done':
                updateStatus('connected', 'Connected - Speak now!');
                break;

            case 'response.done':
                updateStatus('connected', 'Connected - Speak now!');
                break;

            case 'error':
                console.error('Server error:', message);
                addMessage('system', `Error: ${message.error?.message || 'Unknown error'}`);
                updateStatus('error', 'Error occurred');
                break;

            case 'input_audio_buffer.committed':
            case 'conversation.item.input_audio_transcription.completed':
                if (message.transcript) {
                    addMessage('user', message.transcript);
                }
                break;

            default:
                console.log('Unhandled message type:', message.type);
        }
    }

    disconnect() {
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        if (this.audioElement.srcObject) {
            this.audioElement.srcObject.getTracks().forEach(track => track.stop());
            this.audioElement.srcObject = null;
        }

        this.isConnected = false;
        updateStatus('disconnected', 'Disconnected');
        addMessage('system', 'Disconnected from Azure OpenAI');
    }
}

// UI Management
let client = null;
let lastMessageElement = null;
let lastMessageType = null;

function updateStatus(state, text) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const infoText = document.getElementById('infoText');

    indicator.className = `status-indicator ${state}`;
    statusText.textContent = text;

    switch (state) {
        case 'connected':
            infoText.textContent = 'Speak naturally - the AI will respond in real-time';
            break;
        case 'speaking':
            infoText.textContent = 'Keep speaking or pause when done';
            break;
        case 'error':
            infoText.textContent = 'Please check your configuration and try again';
            break;
        default:
            infoText.textContent = 'Click "Start Conversation" to begin';
    }
}

function addMessage(type, content) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = type === 'user' ? '👤 You' : type === 'assistant' ? '🤖 Assistant' : '📋 System';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(label);
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);

    // Scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Store reference for potential appending
    lastMessageElement = contentDiv;
    lastMessageType = type;
}

function appendToLastMessage(type, content) {
    if (lastMessageElement && lastMessageType === type) {
        lastMessageElement.textContent += content;
        const messagesDiv = document.getElementById('messages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } else {
        addMessage(type, content);
    }
}

// Button handlers
document.getElementById('startBtn').addEventListener('click', async () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    try {
        startBtn.disabled = true;

        if (!client) {
            client = new RealtimeClient();
            await client.initialize();
        }

        await client.connect();

        stopBtn.disabled = false;
        addMessage('system', 'Connection established. Start speaking!');
    } catch (error) {
        console.error('Failed to start:', error);
        startBtn.disabled = false;
        addMessage('system', `Failed to start: ${error.message}`);
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (client) {
        client.disconnect();
    }

    startBtn.disabled = false;
    stopBtn.disabled = true;
});

// Initialize on load
window.addEventListener('load', () => {
    addMessage('system', 'Configuring .env');
});

