// FINAL STABLE VERSION: api/proxy.js

// Helper function for Chat
async function handleChat(apiKey, history) {
    const fetch = (await import('node-fetch')).default;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: history }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat API Error: ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a valid chat response.";
}

// Helper function for Image Generation
async function handleImageGeneration(apiKey, projectId, prompt) {
    const fetch = (await import('node-fetch')).default;
    // This is the Vertex AI API endpoint
    const apiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagegeneration@006:predict`;

    // The Vertex AI API often prefers the key as a Bearer token. This is more reliable.
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instances: [{ "prompt": prompt }],
            parameters: { "sampleCount": 1 }
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.predictions || data.predictions.length === 0 || !data.predictions[0].bytesBase64Encoded) {
        throw new Error('Image API response was successful but contained no image data.');
    }

    return data.predictions[0].bytesBase64Encoded;
}


// Main handler for all requests
export default async function handler(request, response) {
    console.log(`[LOG] Function started for type: ${request.body.type || 'chat'}`);

    const apiKey = process.env.GEMINI_API_KEY;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const { type, history, prompt } = request.body;

    if (!apiKey) return response.status(500).json({ error: 'API key not configured.' });

    try {
        let result;
        if (type === 'image') {
            if (!projectId) return response.status(500).json({ error: 'Project ID not configured.' });
            if (!prompt) return response.status(400).json({ error: 'Image prompt is missing.' });
            
            result = { response: await handleImageGeneration(apiKey, projectId, prompt), type: 'image' };
        } else {
            if (!history) return response.status(400).json({ error: 'Chat history is missing.' });
            result = { response: await handleChat(apiKey, history), type: 'chat' };
        }
        console.log(`[LOG] Function completed successfully for type: ${type || 'chat'}`);
        response.status(200).json(result);
    } catch (error) {
        console.error(`[ERROR] An error occurred: ${error.message}`);
        response.status(500).json({ error: error.message });
    }
}
