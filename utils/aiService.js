const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load keys from .env directly into memory
let apiKeys = [];
for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('GEMINI_API_KEY') && v) {
        apiKeys.push({ alias: k, key: v, isExhausted: false });
    }
}

/**
 * Execute a Gemini AI model with fallback logic using environment keys in memory.
 * Auto-flags exhausted keys and switches to the next available one.
 */
async function generateWithFallback(prompt, responseMimeType = "text/plain") {
    // If no keys were loaded initially, check process.env one last time (e.g. if loaded late)
    if (apiKeys.length === 0 && process.env.GEMINI_API_KEY) {
        apiKeys.push({ alias: 'GEMINI_API_KEY', key: process.env.GEMINI_API_KEY, isExhausted: false });
    }

    const availableKeys = apiKeys.filter(k => !k.isExhausted);

    if (availableKeys.length === 0) {
        console.error("No active API keys available. All might be exhausted.");
        return null;
    }

    for (let currentKey of availableKeys) {
        try {
            const genAI = new GoogleGenerativeAI(currentKey.key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error(`AI Execution Error on key ${currentKey.alias}:`, error.message);
            // 429 implies Too Many Requests / Exhausted Quota
            if (error.status === 429) {
                console.warn(`Key ${currentKey.alias} seems exhausted. Disabling it automatically in memory.`);
                currentKey.isExhausted = true;
            }
            // Proceed to next key in loop
        }
    }
    
    // If we reach here, all keys failed
    return null;
}

// Function to Grade Essay
exports.gradeEssayWithAI = async (topic, essayContent) => {
    const prompt = `
    You are an expert English teacher. Grade the following essay written by a student.
    Topic: "${topic}"
    Essay: "${essayContent}"
    
    Provide the evaluation strictly in JSON format with exactly these keys:
    {
        "score": <a number between 0 and 10 (can be decimals like 7.5)>,
        "feedback": "<A concise 2-3 sentence feedback discussing grammar, vocabulary, and structure>",
        "highlightedText": "<The original essay text, but wrap spelling mistakes, tense errors, grammar errors, or wrong word choices in <span class='error-highlight'>...</span> so it can be highlighted in red. Fix them or explain them in feedback, but here just wrap the bad parts of the text in spans. Preserve the rest of the text.>"
    }
    Return ONLY the valid JSON without any markdown formatting or extra text.
    `;

    try {
        const text = await generateWithFallback(prompt);
        if(!text) return null;
        const jsonStr = text.replace(/```json/i, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Parse error", e);
        return null;
    }
};

// Function to Generate Reading Comprehension Questions
exports.generateQuestionsFromPassage = async (passage, questionCount = 5) => {
    const prompt = `
    You are an expert curriculum designer. Based on the following passage, generate EXACTLY ${questionCount} multiple-choice questions.

    Passage:
    "${passage}"
    
    Format your response EXACTLY as the system expects, like this:
    # User Generated Title Based on Passage
    [The exact original passage text here]
    
    Q1. [Question Text]?
    a) [Option A]
    b) [Option B]
    c) [Option C]
    d) [Option D]
    Ans: [a, b, c, or d]
    Exp: [Brief 1-line explanation of the answer]
    
    Q[Number]. ... (continue for ${questionCount} questions total)
    
    Make sure the answers and explanations are accurate. Do not add any extra text outside this format.
    `;

    try {
        let text = await generateWithFallback(prompt);
        if(!text) return null;
        if (text.startsWith('```')) {
            const lines = text.split('\n');
            if (lines.length > 2) {
                text = lines.slice(1, -1).join('\n').trim();
            }
        }
        return text;
    } catch(e) {
        console.error(e);
        return null;
    }
};

// Flexible Action for Post-Submission Essay Analysis
exports.processEssayAIAction = async (action, essayText) => {
    let prompt = "";
    if (action === 'translate') {
        prompt = `Translate the following English essay into simple, readable Hindi.\n\nEssay:\n"${essayText}"\n\nReturn ONLY the Hindi translation.`;
    } else if (action === 'words') {
        prompt = `Extract the 5-10 most difficult words from the following essay and provide their meanings in Hindi. Format strictly as a bulleted list: \n- **Word**: Meaning in Hindi (Meaning in English)\n\nEssay:\n"${essayText}"`;
    } else if (action === 'grammar') {
        prompt = `Explain the major grammatical strengths and weaknesses of the following essay in simple terms. Provide clear suggestions for improvement along with examples from the text.\n\nEssay:\n"${essayText}"`;
    } else {
        return null;
    }

    return await generateWithFallback(prompt);
};

// Live Edit Helper (Selected Text)
exports.liveAnalyzeText = async (text) => {
    const prompt = `Analyze the following student essay text excerpt. Provide the result strictly in JSON format with these exact keys:
    {
        "correctedSentence": "<The improved, corrected text>",
        "grammarMistakes": "<A brief one-line explanation of grammar mistakes found, or 'None'>",
        "spellingCorrections": "<A brief list of spelling mistakes corrected, or 'None'>",
        "improvementSuggestion": "<One short sentence on how to make this sound more professional or clear>"
    }
    
    Text to analyze:
    "${text}"`;
    
    try {
        let responseText = await generateWithFallback(prompt);
        if(!responseText) return null;
        responseText = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
        return JSON.parse(responseText);
    } catch (err) {
        console.error("Live Check AI Error:", err);
        return null;
    }
};

// Function for general AI Chat
exports.chatWithAI = async (message) => {
    const prompt = `You are a helpful teaching assistant. Answer the user's question clearly and accurately in any subject.
    
    Question: "${message}"`;
    return await generateWithFallback(prompt);
};

// Flexible Action for Reading Passages Analysis
exports.processReadingAIAction = async (action, passageText, questionData = null) => {
    let prompt = "";
    if (action === 'translate') {
        prompt = `Translate the following English passage into simple, readable Hindi.\n\nPassage:\n"${passageText}"\n\nReturn ONLY the Hindi translation.`;
    } else if (action === 'summarize') {
        prompt = `Summarize the following passage in 3-4 bullet points emphasizing the core message.\n\nPassage:\n"${passageText}"`;
    } else if (action === 'explain_answer') {
        prompt = `Given this passage:\n"${passageText}"\n\nAnd this question with its options:\n${questionData}\n\nExplain in detail why the correct answer is right and why the other options are wrong based on the passage text. Also quote exactly where the answer is found in the passage.`;
    } else if (action === 'highlight_answers') {
        prompt = `Given the following passage, extract 3-5 key sentences that contain the most important facts generally asked in questions, and return the passage text but wrap those highly important sentences in <span class='ai-highlight' style='background-color: rgba(255, 215, 0, 0.3); border-radius: 3px;'>...</span>. Return ONLY the HTML formatted passage back.\n\nPassage:\n"${passageText}"`;
    } else if (action === 'difficult_words') {
        prompt = `Extract the 5 most difficult words from the following passage. For each word, provide: 1) Its English meaning, 2) Its Hindi meaning, 3) An example sentence. Format strictly as a clear list.\n\nPassage:\n"${passageText}"`;
    } else {
        return null;
    }
    return await generateWithFallback(prompt);
};