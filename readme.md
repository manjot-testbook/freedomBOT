# FreedomBOT - Azure Realtime Speech-to-Speech

A real-time speech-to-speech AI application powered by Azure OpenAI GPT-4 Realtime API with WebRTC.

## Features

- 🎤 **Real-time Speech Recognition**: Speak naturally and get instant responses
- 🔊 **Voice Responses**: AI responds with natural voice using Azure's text-to-speech
- 🌐 **WebRTC Integration**: Low-latency audio streaming
- 💬 **Conversation Logging**: See transcripts of your conversation in real-time
- 🎨 **Modern UI**: Beautiful, responsive interface

## Prerequisites

- Python 3.8+
- Azure OpenAI account with GPT-4 Realtime API access
- Modern web browser with WebRTC support (Chrome, Firefox, Edge, Safari)

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Azure OpenAI

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Azure OpenAI credentials:

```
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview
```

### 3. Run the Application

```bash
python app.py
```

The application will start on `http://localhost:5000`

### 4. Use the Application

1. Open your browser and navigate to `http://localhost:5000`
2. Click **"Start Conversation"** button
3. Allow microphone access when prompted
4. Start speaking naturally - the AI will respond in real-time
5. Click **"Stop Conversation"** when done

## How It Works

1. **WebRTC Connection**: The application establishes a WebRTC peer connection with Azure OpenAI Realtime API
2. **Audio Streaming**: Your microphone input is streamed to Azure in real-time
3. **Voice Activity Detection**: Azure detects when you start and stop speaking
4. **AI Processing**: GPT-4 processes your speech and generates a response
5. **Audio Playback**: The AI's voice response is streamed back and played automatically

## Troubleshooting

### Connection Issues
- Verify your Azure OpenAI credentials are correct in `.env`
- Ensure your Azure resource has access to the Realtime API
- Check browser console for detailed error messages

### Audio Issues
- Make sure you've granted microphone permissions
- Check your system audio settings
- Try using Chrome or Edge for best compatibility

### API Errors
- Verify your deployment name matches your Azure configuration
- Ensure your API key has appropriate permissions
- Check Azure OpenAI service status

## Technology Stack

- **Backend**: Flask, Python
- **Frontend**: HTML5, CSS3, JavaScript
- **AI**: Azure OpenAI GPT-4 Realtime API
- **Communication**: WebRTC, Data Channels

## License

MIT License

