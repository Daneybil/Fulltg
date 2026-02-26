import express from "express";
import { createServer as createViteServer } from "vite";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("sessions.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    session_string TEXT,
    api_id INTEGER,
    api_hash TEXT
  )
`);

const app = express();
app.use(express.json());

// In-memory storage for temporary login states
const loginStates = new Map<string, { client: TelegramClient; phoneCodeHash: string }>();

app.post("/api/auth/send-code", async (req, res) => {
  const { phone, apiId, apiHash } = req.body;
  
  if (!phone || !apiId || !apiHash) {
    return res.status(400).json({ error: "Phone, API ID, and API Hash are required" });
  }

  try {
    const client = new TelegramClient(new StringSession(""), parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });
    await client.connect();
    
    const { phoneCodeHash } = await client.sendCode(
      { apiId: parseInt(apiId), apiHash },
      phone
    );
    
    loginStates.set(phone, { client, phoneCodeHash });
    res.json({ success: true, message: "Code sent" });
  } catch (error: any) {
    console.error("Error sending code:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/sign-in", async (req, res) => {
  const { phone, code, apiId, apiHash } = req.body;
  const state = loginStates.get(phone);

  if (!state) {
    return res.status(400).json({ error: "Session not found. Send code first." });
  }

  try {
    await state.client.invoke(new (await import("telegram/tl/index.js")).Api.auth.SignIn({
      phoneNumber: phone,
      phoneCodeHash: state.phoneCodeHash,
      phoneCode: code,
    }));

    const sessionString = state.client.session.save() as unknown as string;
    
    db.prepare("INSERT OR REPLACE INTO sessions (phone, session_string, api_id, api_hash) VALUES (?, ?, ?, ?)")
      .run(phone, sessionString, apiId, apiHash);

    res.json({ success: true, message: "Signed in successfully" });
  } catch (error: any) {
    console.error("Error signing in:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sessions", (req, res) => {
  const sessions = db.prepare("SELECT phone, api_id FROM sessions").all();
  res.json(sessions);
});

app.post("/api/scrape", async (req, res) => {
  const { phone, groupLink } = req.body;
  const session = db.prepare("SELECT * FROM sessions WHERE phone = ?").get(phone) as any;

  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    const client = new TelegramClient(new StringSession(session.session_string), session.api_id, session.api_hash, {});
    await client.connect();

    const group = await client.getEntity(groupLink);
    const participants = await client.getParticipants(group);
    
    const members = participants.map((p: any) => ({
      id: p.id.toString(),
      username: p.username,
      firstName: p.firstName,
      lastName: p.lastName,
    })).filter(m => m.username); // Only keep members with usernames for easier adding

    res.json({ success: true, members });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/add-members", async (req, res) => {
  const { phone, targetGroup, members } = req.body;
  const session = db.prepare("SELECT * FROM sessions WHERE phone = ?").get(phone) as any;

  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    const client = new TelegramClient(new StringSession(session.session_string), session.api_id, session.api_hash, {});
    await client.connect();

    const target = await client.getEntity(targetGroup);
    const results = [];

    for (const username of members) {
      try {
        // Telegram has strict limits. We should add delays here in a real app.
        await client.invoke(new (await import("telegram/tl/index.js")).Api.channels.InviteToChannel({
          channel: target,
          users: [username]
        }));
        results.push({ username, status: "success" });
        // Add a small delay to avoid instant ban
        await new Promise(r => setTimeout(r, 2000));
      } catch (e: any) {
        results.push({ username, status: "failed", error: e.message });
      }
    }

    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export for Vercel
export default app;

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  // Only listen if not running as a serverless function
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
