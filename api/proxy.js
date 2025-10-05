// FINAL CORRECTED File: api/proxy.js

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
    const apiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagegeneration@006:predict`;
    
    // We construct the full URL with the API key as a query parameter.
    const fullApiUrlWithKey = `${apiUrl}?key=${apiKey}`;

    const response = await fetch(fullApiUrlWithKey, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instances: [{ "prompt": prompt }],
            parameters: { "sampleCount": 1 }
        }),
    });

    // This block will now catch any non-successful response and prevent hanging.
    if (!response.ok) {
        const errorText = await response.text();
        // This makes the real error from Google visible on your website.
        throw new Error(`Image API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.predictions || data.predictions.length === 0 || !data.predictions[0].bytesBase64Encoded) {
        // This handles cases where Google says "OK" but sends no image.
        throw new Error('Image API response was successful but contained no image data.');
    }

    return data.predictions[0].bytesBase64Encoded;
}

// Main handler for all requests
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

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
        response.status(200).json(result);
    } catch (error) {
        // The detailed error from the functions above will now be sent to the frontend.
        response.status(500).json({ error: error.message });
    }
}
