JavaScript
const express = require('express');
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

// ==========================================
// 1. DYNAMIC CONFIGURATION HELPERS
// ==========================================

// Mock function: In reality, this queries your admin database for the current API keys
async function getAdminConfig() {
    return {
        openaiApiKey: "sk-your-dynamic-key-from-db", 
        smtpHost: "smtp.yourmail.com",
        smtpUser: "alerts@yourdomain.com",
        smtpPass: "your-smtp-password"
    };
}

// ==========================================
// 2. AI AGENT GENERATION 
// ==========================================

async function generateEmailWithAgent(promptState, userData) {
    const config = await getAdminConfig();
    
    // Initialize OpenAI with the dynamically fetched key
    const openai = new OpenAI({ apiKey: config.openaiApiKey });

    const systemPrompt = `
    You are the Onboarding & Operations Agent for the "Verum the Thinkovt Engine".
    Generate an email based on the exact workflow state provided.
    Always return valid JSON: {"subject": "...", "body": "..."}
    `;

    const userPrompt = `
    Current State: ${promptState}
    User Data: ${JSON.stringify(userData)}
    Generate the email.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]
    });

    return JSON.parse(response.choices[0].message.content);
}

// ==========================================
// 3. EMAIL DISPATCHER
// ==========================================

async function sendEmail(to, subject, body) {
    const config = await getAdminConfig();
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: 587,
        secure: false,
        auth: {
            user: config.smtpUser,
            pass: config.smtpPass
        }
    });

    await transporter.sendMail({
        from: `"Verum Engine" <${config.smtpUser}>`,
        to: to,
        subject: subject,
        text: body, // Or html: body if you want rich formatting
    });
}

// ==========================================
// 4. WORKFLOW ENDPOINTS
// ==========================================

// Endpoint: User Registration
app.post('/api/users/register', async (req, res) => {
    const { email, name } = req.body;
    
    try {
        // 1. Save user to DB (logic omitted)
        
        // 2. Generate and send State 1 email
        const emailContent = await generateEmailWithAgent("NEW_REGISTRATION", { name });
        await sendEmail(email, emailContent.subject, emailContent.body);
        
        res.status(200).json({ message: "User registered. Verum evaluation initiated." });
    } catch (error) {
        console.error(error);
        res.status(500).send("Registration error");
    }
});

// Endpoint: Admin Decides Blueprint Status (Webhook/Backend trigger)
app.post('/api/admin/blueprint-decision', async (req, res) => {
    const { userId, email, name, status, quoteAmount } = req.body; 
    // status = "ACCEPTED" or "DENIED"

    try {
        const state = status === "ACCEPTED" ? "BLUEPRINT_DECISION_ACCEPTED" : "BLUEPRINT_DECISION_DENIED";
        const emailContent = await generateEmailWithAgent(state, { name, quoteAmount });
        
        await sendEmail(email, emailContent.subject, emailContent.body);
        res.status(200).json({ message: `Decision processed and email sent to ${email}` });
    } catch (error) {
        res.status(500).send("Decision processing error");
    }
});

// Endpoint: User Accepts/Denies Quote from Dashboard
app.post('/api/users/quote-response', async (req, res) => {
    const { userId, email, name, response } = req.body;
    // response = "ACCEPTED" or "DENIED"

    try {
        // 1. Update backend dashboard/DB that quote was accepted/denied
        console.log(`Backend Notified: User ${userId} ${response} the quote.`);

        // 2. Generate and send confirmation email to the user
        const state = response === "ACCEPTED" ? "QUOTE_ACCEPTED" : "QUOTE_DENIED";
        const emailContent = await generateEmailWithAgent(state, { name });
        
        await sendEmail(email, emailContent.subject, emailContent.body);
        
        res.status(200).json({ message: "Dashboard updated. Confirmation email sent." });
    } catch (error) {
        res.status(500).send("Error processing quote response");
    }
});

app.listen(3000, () => console.log('Verum Engine backend running on port 3000'));