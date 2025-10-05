// CORRECTED File: api/proxy.js

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
    // This is the correct Vertex AI endpoint for API key-based requests
    const apiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagegeneration@006:predict`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            // For this specific endpoint, the API key is passed in the URL, not as a Bearer token
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instances: [{ prompt: prompt }],
            parameters: { sampleCount: 1 }
        }),
    // We append the API key here for this type of request
    }, { headers: { 'X-Goog-Api-Key': apiKey } });

     // This is a more complex way to call fetch that is sometimes needed for Google Cloud auth.
     // We will try a simpler way first. The above code is commented out as it is more complex.
     // The following is a simpler, more direct way.
     const directApiResponse = await fetch(`${apiUrl}?key=${apiKey}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
             instances: [{ prompt: prompt }],
             parameters: { sampleCount: 1 }
         }),
     });


    if (!directApiResponse.ok) {
        const errorText = await directApiResponse.text();
        // Log the detailed error to Vercel for debugging
        console.error("Image Generation Failed:", errorText);
        throw new Error(`Image API Error: ${errorText}`);
    }

    const data = await directApiResponse.json();
    if (!data.predictions || data.predictions.length === 0) {
        throw new Error('API returned no predictions.');
    }
    return data.predictions[0]?.bytesBase64Encoded;
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

        } else { // Default to 'chat'
            if (!history) return response.status(400).json({ error: 'Chat history is missing.' });

            result = { response: await handleChat(apiKey, history), type: 'chat' };
        }
        response.status(200).json(result);

    } catch (error) {
        // This will now send the real error back to the user's screen
        console.error("Proxy Error:", error.message);
        response.status(500).json({ error: error.message });
    }
}
