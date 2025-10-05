// File: api/proxy.js

export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { history } = request.body;
  
  // Get the API key from a secure environment variable on Vercel
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return response.status(500).json({ error: 'API key not configured on the server.' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    
   // The only change is in the model name right after /models/
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents: history }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      // Forward the error from Google's API to your frontend for better debugging
      return response.status(apiResponse.status).json({ error: `Google API Error: ${errorText}` });
    }

    const data = await apiResponse.json();
    
    // Safely get the response text
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a valid response.";
    
    response.status(200).json({ response: aiText });

  } catch (error) {
    response.status(500).json({ error: error.message });
  }

}

