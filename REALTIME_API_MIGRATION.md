# Azure OpenAI Realtime API Migration Guide

## Changes Made

This project has been updated to use the new Azure OpenAI Realtime API with ephemeral keys and regional WebRTC endpoints.

### Key Updates

1. **API Version**: Upgraded from `2024-10-01-preview` (retired) to `2025-04-01-preview`

2. **Authentication Flow**:
   - **Old**: Direct connection with API key to `/openai/deployments/{deployment}/realtime`
   - **New**: Two-step process:
     1. Create session and mint ephemeral key via `/openai/realtimeapi/sessions`
     2. Connect to regional WebRTC endpoint with ephemeral Bearer token

3. **Endpoint Changes**:
   - **Session API**: `{endpoint}/openai/realtimeapi/sessions?api-version=2025-04-01-preview`
   - **WebRTC Endpoint**: `https://{region}.realtimeapi-preview.ai.azure.com/v1/realtimertc?model={deployment}`

### Configuration Required

Add to your `.env` file:

```env
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview
AZURE_REGION=eastus2  # or swedencentral
```

**Important**: 
- Your deployment must be in `eastus2` or `swedencentral` (the only regions supporting Realtime API)
- The deployment must use one of the supported Realtime models

### Files Modified

1. **app.py**: 
   - Added session creation endpoint
   - Mints ephemeral keys from Azure
   - Returns regional WebRTC endpoint to frontend

2. **static/realtime.js**:
   - Updated to use ephemeral Bearer token instead of api-key header
   - Changed URL format to regional WebRTC endpoint with `?model=` query parameter

3. **requirements.txt**:
   - Added `requests` package for session API calls

4. **.env**:
   - Added `AZURE_REGION` configuration

### How It Works

1. Frontend calls `/api/config`
2. Backend creates a session with Azure OpenAI Sessions API using the main API key
3. Azure returns an ephemeral token (short-lived, session-specific)
4. Backend returns the ephemeral token and regional WebRTC URL to frontend
5. Frontend uses the ephemeral token to connect to the regional WebRTC endpoint
6. WebRTC connection is established with SDP offer/answer exchange

### Security Benefits

- Ephemeral tokens are short-lived and session-specific
- Main API key never exposed to frontend
- Regional endpoints provide better performance and isolation

### Testing

1. Ensure your `.env` file has all required variables
2. Make sure your deployment is in eastus2 or swedencentral
3. Run the Flask app: `python app.py`
4. Open browser and click "Start Conversation"
5. Check browser console for connection logs

### Troubleshooting

**404 Error**: 
- Verify deployment name matches exactly in Azure portal
- Confirm region is eastus2 or swedencentral
- Check that deployment uses a supported Realtime model

**401 Error**:
- Verify API key is correct
- Check that API key has access to the Realtime API

**Session Creation Failed**:
- Verify endpoint URL format (should be https://your-resource.openai.azure.com)
- Check API version is 2025-04-01-preview

