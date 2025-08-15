/**
 * background.js: Service worker for the Chrome Extension.
 * - Listens for messages, communicates with the Gemini API, and manages the API key.
 *
 * Final Version: 2.1 - Added specific handling for 503 server errors.
 */

console.log("Background service worker started (v2.2).");

// --- Settings & API Key Management ---
async function getSettings() {
    try {
        const result = await chrome.storage.sync.get(['aiProvider', 'geminiApiKey', 'openaiApiKey', 'geminiModel', 'openaiModel']);
        if (chrome.runtime.lastError) {
            console.error("Storage Error:", chrome.runtime.lastError.message);
            return { aiProvider: 'gemini', geminiApiKey: undefined, openaiApiKey: undefined, geminiModel: undefined, openaiModel: undefined };
        }
        return {
            aiProvider: result.aiProvider || 'gemini',
            geminiApiKey: result.geminiApiKey,
            openaiApiKey: result.openaiApiKey,
            geminiModel: result.geminiModel || 'gemini-1.5-flash-latest',
            openaiModel: result.openaiModel || 'gpt-4o-mini',
        };
    } catch (error) {
        console.error("Exception retrieving settings:", error);
        return { aiProvider: 'gemini', geminiApiKey: undefined, openaiApiKey: undefined, geminiModel: 'gemini-1.5-flash-latest', openaiModel: 'gpt-4o-mini' };
    }
}

// --- Utility: Infer specialization from job text ---
function inferSpecialization(text) {
    if (!text) return "full-stack";
    const lower = text.toLowerCase();
    const checks = [
        { key: /\b(ai|machine learning|ml|bert|llm|generative ai|deep learning|artificial intelligence|chatbot|gpt|text generation|computer vision|opencv|nlp|natural language processing)\b/, label: "AI/ML specialist" },
        { key: /\b(firebase|google cloud|gcp|aws|azure|cloud|serverless|vercel|cloud functions|hosting|deployment)\b/, label: "cloud solutions" },
        { key: /\b(scrap|crawler|scraping|selenium|beautifulsoup|data extraction|web scraping|automation|bot)\b/, label: "web scraping and automation" },
        { key: /\b(react|next\.js|vue|angular|tailwind|frontend|javascript|typescript|html|css|ui|ux)\b/, label: "frontend" },
        { key: /\b(python|django|flask|fastapi|node\.js|express|php|backend|api|rest|graphql|database|postgresql|mysql)\b/, label: "backend" },
        { key: /\b(chrome extension|browser extension|extension development)\b/, label: "browser extension" },
        { key: /\b(matlab|algorithm|optimization|mathematical modeling|simulation|data analysis|statistics)\b/, label: "algorithm and data science" },
        { key: /\b(mobile|android|ios|react native|flutter|app development)\b/, label: "mobile development" },
        { key: /\b(docker|kubernetes|ci\/cd|devops|linux|system administration)\b/, label: "DevOps" },
    ];
    for (const c of checks) {
        if (c.key.test(lower)) return c.label;
    }
    return "full-stack";
}

// --- Prompt helpers ---
function buildPrompt(description) {
    const specialization = inferSpecialization(description);

    const REVIEW_HIGHLIGHTS = [
        "Reda E is very talented and a great communicator; highly recommended by clients worldwide.",
        "Delivered exactly what was needed on time and on budget with 5.0 rating across 48+ projects.",
        "Professional work with excellent communication; knows his stuff and gets the job done efficiently.",
        "Finished ahead of schedule and provided ongoing support; very accommodating and helpful.",
        "Outstanding job with quick responses and immediate feedback implementation.",
        "Exceeded expectations with accurate work and clear documentation throughout the project.",
        "Intelligent, quick, responsible developer with great vision and technical knowledge.",
    ].join("\n- ");

    return `You write concise, human-sounding bids that showcase proven expertise without feeling AI-generated.

Professional Context: 
- 5.0-star rated full-stack developer with 48+ successful projects
- Expertise spans AI/ML, cloud platforms (Firebase, AWS, GCP), web development, automation, and data solutions
- Strong track record with international clients from US, UK, Australia, Germany, and more
- Known for delivering on-time, professional communication, and going above expectations

Constraints:
- Write 3 to 6 lines total (no bullets, no headings, no emojis, no signature).
- Use first person, confident but professional tone. Reference relevant past experience naturally.
- Start with: "I'm a ${specialization} developer with 5+ years of experience and a 5.0 rating on similar projects."
- Add 2–3 lines mentioning specific technical approach and relevant technologies from your expertise.
- Close with: "Please review my portfolio and client feedback - I'd be happy to discuss your requirements."

Project details:
${description}

Professional reputation (use to shape tone, don't quote directly):
- ${REVIEW_HIGHLIGHTS}
`;
}

// --- Prompt for clarifying questions ---
function buildQuestionsPrompt(description) {
    const specialization = inferSpecialization(description);
    return `You are an experienced ${specialization} developer with a 5.0 rating and proven track record of delivering successful projects.

Write 3 to 5 professional clarifying questions that demonstrate technical understanding and help ensure project success.

Guidelines:
- Questions should show expertise in the relevant technology stack
- Focus on technical implementation details, scope boundaries, and success criteria
- Avoid generic questions - be specific to the project type and requirements
- Keep each question concise and professional
- No numbering or bullets - just separate lines

Project details:
${description}`;
}

// --- Gemini API Call ---
async function generateBidWithGemini(description) {
    const { geminiApiKey, geminiModel } = await getSettings();
    if (!geminiApiKey) {
        throw new Error("Gemini API Key not set. Please configure it in the extension options.");
    }

    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`;

    const prompt = buildPrompt(description);

    console.log("Background: Sending request to Gemini API...");

    try {
        const response = await fetch(`${API_ENDPOINT}?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            }),
        });

        // --- **IMPROVED ERROR HANDLING** ---
        if (!response.ok) {
            // **Specifically check for the 503 Service Unavailable error.**
            if (response.status === 503) {
                console.error("Background: Gemini API Error Response: 503 Service Unavailable.");
                throw new Error("The model is overloaded or temporarily unavailable. Please try again in a few moments.");
            }
            
            const responseBody = await response.json();
            const errorDetails = responseBody?.error?.message || `API request failed with status ${response.status}.`;
            console.error("Background: Gemini API Error:", response.status, responseBody);
            throw new Error(errorDetails);
        }

        const responseBody = await response.json();

        // Check for content blocking due to safety filters.
        if (responseBody.promptFeedback?.blockReason) {
            const blockReason = responseBody.promptFeedback.blockReason;
            console.error(`Background: Prompt blocked by API safety filters: ${blockReason}`);
            throw new Error(`Content blocked by safety filters: ${blockReason}.`);
        }

        // Safely access the generated text.
        const generatedText = responseBody.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
            console.log("Background: Successfully received response from Gemini.");
            return generatedText.trim();
        } else {
            console.error("Background: Invalid response format from Gemini:", responseBody);
            throw new Error("Could not parse a valid bid from the API response.");
        }

    } catch (error) {
        // Re-throw the error with a consistent prefix for the popup to display.
        // This will catch both our custom 503 error and any other errors.
        console.error("Background: Error during API call processing:", error);
        throw new Error(`Gemini API Error: ${error.message}`);
    }
}

// --- OpenAI API Call ---
async function generateBidWithOpenAI(description) {
    const { openaiApiKey, openaiModel } = await getSettings();
    if (!openaiApiKey) {
        throw new Error("OpenAI API Key not set. Please configure it in the extension options.");
    }
    const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
    const model = openaiModel || 'gpt-4o-mini';
    const prompt = buildPrompt(description);
    console.log("Background: Sending request to OpenAI API...");
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that writes concise, human-sounding freelance bids.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            let errMsg = `API request failed with status ${response.status}.`;
            try {
                const body = await response.json();
                errMsg = body?.error?.message || errMsg;
                console.error("Background: OpenAI API Error:", response.status, body);
            } catch (_) { /* ignore */ }
            throw new Error(errMsg);
        }

        const body = await response.json();
        const text = body?.choices?.[0]?.message?.content;
        if (text) {
            console.log("Background: Successfully received response from OpenAI.");
            return String(text).trim();
        }
        console.error("Background: Invalid response format from OpenAI:", body);
        throw new Error("Could not parse a valid bid from the OpenAI response.");
    } catch (error) {
        console.error("Background: Error during OpenAI API call:", error);
        throw new Error(`OpenAI API Error: ${error.message}`);
    }
}

// --- Generate Questions using selected provider ---
async function generateQuestions(description) {
    const { aiProvider, geminiApiKey, openaiApiKey, geminiModel, openaiModel } = await getSettings();
    const prompt = buildQuestionsPrompt(description);
    if (aiProvider === 'openai') {
        if (!openaiApiKey) throw new Error("OpenAI API Key not set. Please configure it in the extension options.");
        const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
        const model = openaiModel || 'gpt-4o-mini';
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: 'You help craft short, smart clarifying questions for freelance projects.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.6,
            }),
        });
        if (!response.ok) {
            let errMsg = `API request failed with status ${response.status}.`;
            try {
                const body = await response.json();
                errMsg = body?.error?.message || errMsg;
                console.error("Background: OpenAI Questions Error:", response.status, body);
            } catch (_) {}
            throw new Error(errMsg);
        }
        const body = await response.json();
        const text = body?.choices?.[0]?.message?.content;
        if (!text) throw new Error('No questions generated.');
        return String(text).trim();
    } else {
        if (!geminiApiKey) throw new Error("Gemini API Key not set. Please configure it in the extension options.");
        const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel || 'gemini-1.5-flash-latest')}:generateContent`;
        const response = await fetch(`${API_ENDPOINT}?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            const msg = body?.error?.message || `API request failed with status ${response.status}.`;
            console.error('Background: Gemini Questions Error:', response.status, body);
            throw new Error(msg);
        }
        const body = await response.json();
        const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No questions generated.');
        return String(text).trim();
    }
}

// --- Unified entry point ---
async function generateBid(description) {
    const { aiProvider } = await getSettings();
    if (aiProvider === 'openai') {
        return await generateBidWithOpenAI(description);
    }
    return await generateBidWithGemini(description);
}


// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "callGemini") {
        console.log("Background: Received 'callGemini' request.");
        const { description } = request;

        if (!description) {
            sendResponse({ status: "error", message: "Job description was missing." });
            return false;
        }

        generateBid(description)
            .then(bidText => {
                // Also pass back any other data that was forwarded from the content script
                sendResponse({ 
                    status: "success", 
                    bid: bidText,
                    // Use the fields extracted by the content script
                    bidAmount: request.bidAmount,
                    deliveryTime: request.deliveryTime,
                    // Map content script's projectBudget to the popup's expected extractedProjectBudget
                    extractedProjectBudget: request.projectBudget
                });
            })
            .catch(error => {
                sendResponse({ status: "error", message: error.message });
            });

        return true; // Indicates an asynchronous response.
    }
    if (request.action === 'generateQuestions') {
        const { description } = request;
        if (!description) {
            sendResponse({ status: 'error', message: 'Job description was missing.' });
            return false;
        }
        generateQuestions(description)
            .then(q => sendResponse({ status: 'success', questions: q }))
            .catch(err => sendResponse({ status: 'error', message: err.message }));
        return true;
    }
    return false;
});


// --- Extension Lifecycle Events ---
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === "install") {
        console.log("Background: Extension installed. Opening options page.");
        chrome.runtime.openOptionsPage();
    }
});