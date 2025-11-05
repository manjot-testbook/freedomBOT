from flask import Flask, render_template, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env (if present)
load_dotenv()

app = Flask(__name__)
CORS(app)

# Azure OpenAI Configuration
# Use environment variables (preferred). If you previously had hardcoded values,
# move them into a .env file or export them in your shell and remove them from source.
AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o-realtime-preview')
AZURE_REGION = os.getenv('AZURE_REGION', 'eastus2')  # or 'swedencentral'

# Normalize endpoint (remove trailing slash if present)
if AZURE_OPENAI_ENDPOINT:
    AZURE_OPENAI_ENDPOINT = AZURE_OPENAI_ENDPOINT.rstrip('/')

@app.route('/')
def index():
    """Root route that renders the main page"""
    return render_template('index.html')

@app.route('/api/config', methods=['GET'])
def get_config():
    """Mint ephemeral key from Azure OpenAI Sessions API and provide WebRTC configuration"""
    if not AZURE_OPENAI_API_KEY or not AZURE_OPENAI_ENDPOINT:
        return jsonify({
            'error': 'Azure OpenAI credentials not configured. Please set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT in .env file or environment'
        }), 500

    try:
        # Step 1: Create session and mint ephemeral key
        session_url = f"{AZURE_OPENAI_ENDPOINT}/openai/realtimeapi/sessions?api-version=2025-04-01-preview"

        session_response = requests.post(
            session_url,
            headers={
                'api-key': AZURE_OPENAI_API_KEY,
                'Content-Type': 'application/json'
            },
            json={
                'model': AZURE_OPENAI_DEPLOYMENT
            }
        )

        if not session_response.ok:
            error_text = session_response.text
            return jsonify({
                'error': f'Failed to create session: {session_response.status_code} - {error_text}'
            }), 500

        session_data = session_response.json()
        print(f"Session API Response: {session_data}")  # Debug logging

        # Extract the ephemeral token from client_secret.value
        client_secret = session_data.get('client_secret', {})
        ephemeral_key = client_secret.get('value') if isinstance(client_secret, dict) else None

        if not ephemeral_key:
            return jsonify({
                'error': f'No ephemeral token returned from session API. Response: {session_data}'
            }), 500

        # Step 2: Return the regional WebRTC endpoint and ephemeral key
        webrtc_endpoint = f"https://{AZURE_REGION}.realtimeapi-preview.ai.azure.com/v1/realtimertc"

        return jsonify({
            'webrtcEndpoint': webrtc_endpoint,
            'ephemeralKey': ephemeral_key,
            'deployment': AZURE_OPENAI_DEPLOYMENT,
            'region': AZURE_REGION
        })

    except Exception as e:
        return jsonify({
            'error': f'Failed to initialize session: {str(e)}'
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
