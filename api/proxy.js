// NEW File: api/proxy.js - Handles both Chat and Image Generation

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
        throw new Error(`Google API Error: ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a valid response.";
}

// Helper function for Image Generation
async function handleImageGeneration(apiKey, projectId, prompt) {
    const fetch = (await import('node-fetch')).default;
    // This is the Vertex AI API endpoint for Imagen
    const apiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagegeneration@006:predict`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`, // Imagen uses the API key as a Bearer token
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instances: [{ prompt: prompt }],
            parameters: { sampleCount: 1 } // Generate one image
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Image API Error: ${errorText}`);
    }

    const data = await response.json();
    // The image is returned as a base64 encoded string
    return data.predictions?.[0]?.bytesBase64Encoded;
}


// Main handler for all requests
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID; // Get Project ID from Vercel settings
    const { type, history, prompt } = request.body;

    if (!apiKey) return response.status(500).json({ error: 'API key not configured.' });

    try {
        if (type === 'image') {
            if (!projectId) return response.status(500).json({ error: 'Project ID not configured.' });
            if (!prompt) return response.status(400).json({ error: 'Image prompt is missing.' });
            
            const imageBase64 = await handleImageGeneration(apiKey, projectId, prompt);
            response.status(200).json({ response: imageBase64, type: 'image' });

        } else { // Default to 'chat'
            if (!history) return response.status(400).json({ error: 'Chat history is missing.' });

            const chatText = await handleChat(apiKey, history);
            response.status(200).json({ response: chatText, type: 'chat' });
        }
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
}
