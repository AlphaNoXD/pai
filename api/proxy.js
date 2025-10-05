// Reverted to Text-Only: api/proxy.js

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const { history } = request.body;

    if (!apiKey) {
        return response.status(500).json({ error: 'API key not configured.' });
    }
    if (!history) {
        return response.status(400).json({ error: 'Chat history is missing.' });
    }

    try {
        const fetch = (await import('node-fetch')).default;
        // Using the reliable gemini-1.5-pro model
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: history }),
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`Google API Error: ${errorText}`);
        }

        const data = await apiResponse.json();
        const chatText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response.";

        response.status(200).json({ response: chatText });

    } catch (error) {
        console.error("Proxy Error:", error.message);
        response.status(500).json({ error: error.message });
    }
}
