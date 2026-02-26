import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resilient Database Initialization for Vercel
let db: any;
try {
  const Database = (await import("better-sqlite3")).default;
  const dbPath = "sessions.db";
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE,
      session_string TEXT,
      api_id INTEGER,
      api_hash TEXT
    )
  `);
  console.log("Database initialized successfully at:", dbPath);
} catch (e) {
  console.error("Native Database failed, using in-memory fallback:", e);
  // Simple Mock DB for Vercel/Serverless environments where native modules might fail
  const memoryStore = new Map();
  db = {
    prepare: (sql: string) => ({
      run: (...args: any[]) => {
        if (sql.includes("INSERT")) {
          memoryStore.set(args[0], { phone: args[0], session_string: args[1], api_id: args[2], api_hash: args[3] });
        }
        return { changes: 1 };
      },
      all: () => Array.from(memoryStore.values()),
      get: (phone: string) => memoryStore.get(phone)
    }),
    exec: () => {}
  };
}

const app = express();
app.use(cors());
app.use(express.json());

// Health check for debugging
app.get("/api/health", (req, res) => {
  return res.json({ 
    status: "ok", 
    isVercel: !!process.env.VERCEL,
    nodeVersion: process.version
  });
});

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
    return res.json({ success: true, message: "Code sent" });
  } catch (error: any) {
    console.error("Error sending code:", error);
    return res.status(500).json({ error: error.message });
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

    return res.json({ success: true, message: "Signed in successfully" });
  } catch (error: any) {
    console.error("Error signing in:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/sessions", (req, res) => {
  const sessions = db.prepare("SELECT phone, api_id FROM sessions").all();
  return res.json(sessions);
});

app.post("/api/scrape", async (req, res) => {
  const { phone, groupLink, limit = 0 } = req.body;
  const session = db.prepare("SELECT * FROM sessions WHERE phone = ?").get(phone) as any;

  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    const client = new TelegramClient(new StringSession(session.session_string), session.api_id, session.api_hash, {
      connectionRetries: 5,
    });
    await client.connect();

    const group = await client.getEntity(groupLink);
    let allParticipants: any[] = [];
    
    // If limit is 0, we try to get as many as possible (Telegram usually caps at 10k for non-admins)
    const fetchLimit = limit > 0 ? limit : 5000; 
    
    // Using iterParticipants for better performance and "unlimited" feel
    for await (const participant of client.iterParticipants(group, { limit: fetchLimit })) {
      if (participant.username) {
        allParticipants.push({
          id: participant.id.toString(),
          username: participant.username,
          firstName: participant.firstName,
          lastName: participant.lastName,
        });
      }
    }

    return res.json({ success: true, members: allParticipants });
  } catch (error: any) {
    console.error("Scrape error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/add-members", async (req, res) => {
  const { phone, targetGroup, members, delay = 5000 } = req.body;
  const session = db.prepare("SELECT * FROM sessions WHERE phone = ?").get(phone) as any;

  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    const client = new TelegramClient(new StringSession(session.session_string), session.api_id, session.api_hash, {
      connectionRetries: 5,
    });
    await client.connect();

    const target = await client.getEntity(targetGroup);
    const results: any[] = [];
    
    // Professional "Gentle" adding: smaller batches, longer random delays
    const batchSize = 1; // 1 by 1 is safest to avoid bot detection
    for (let i = 0; i < members.length; i++) {
      const username = members[i];
      try {
        await client.invoke(new (await import("telegram/tl/index.js")).Api.channels.InviteToChannel({
          channel: target,
          users: [username]
        }));
        
        results.push({ username, status: "success" });
        
        // Random delay between 5-15 seconds (or user defined) to mimic human behavior
        const actualDelay = delay + Math.floor(Math.random() * 5000);
        await new Promise(r => setTimeout(r, actualDelay));
        
      } catch (e: any) {
        results.push({ username, status: "failed", error: e.message });
        
        if (e.message.includes("FLOOD_WAIT")) {
          const waitTime = parseInt(e.message.match(/\d+/)?.[0] || "60");
          results.push({ system: true, message: `Flood wait detected. Sleeping for ${waitTime} seconds.` });
          await new Promise(r => setTimeout(r, waitTime * 1000));
        }
        
        if (e.message.includes("PEER_FLOOD") || e.message.includes("USER_PRIVACY_RESTRICTED")) {
          // Skip these users but continue
          continue;
        }
        
        // If too many failures, stop to protect account
        const recentFailures = results.slice(-5).filter(r => r.status === "failed").length;
        if (recentFailures >= 5) {
          results.push({ system: true, message: "Too many consecutive failures. Stopping to protect account." });
          break;
        }
      }
    }

    return res.json({ success: true, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/spam-check", async (req, res) => {
  const { phone } = req.body;
  const session = db.prepare("SELECT * FROM sessions WHERE phone = ?").get(phone) as any;

  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    const client = new TelegramClient(new StringSession(session.session_string), session.api_id, session.api_hash, {});
    await client.connect();
    
    // Sending a message to @SpamBot is the standard way to check
    const spamBot = await client.getEntity("SpamBot");
    await client.sendMessage(spamBot, { message: "/start" });
    
    // Wait a bit for reply
    await new Promise(r => setTimeout(r, 2000));
    
    const messages = await client.getMessages(spamBot, { limit: 1 });
    const status = messages[0]?.message || "No response from SpamBot";
    
    return res.json({ success: true, status });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/send-message", async (req, res) => {
  const { phone, target, message, delay = 2000 } = req.body;
  const session = db.prepare("SELECT * FROM sessions WHERE phone = ?").get(phone) as any;

  if (!session) return res.status(404).json({ error: "Session not found" });

  try {
    const client = new TelegramClient(new StringSession(session.session_string), session.api_id, session.api_hash, {});
    await client.connect();
    
    if (Array.isArray(target)) {
      const results = [];
      for (const t of target) {
        try {
          await client.sendMessage(t, { message });
          results.push({ target: t, status: "success" });
          await new Promise(r => setTimeout(r, delay + Math.floor(Math.random() * 2000)));
        } catch (e: any) {
          results.push({ target: t, status: "failed", error: e.message });
          if (e.message.includes("FLOOD_WAIT")) break;
        }
      }
      return res.json({ success: true, results });
    } else {
      await client.sendMessage(target, { message });
      return res.json({ success: true, message: "Message sent" });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const { phone } = req.body;
  try {
    db.prepare("DELETE FROM sessions WHERE phone = ?").run(phone);
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Export for Vercel
export default app;

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    const fallbackDistPath = __dirname; // If server.js is inside dist/
    
    if (fs.existsSync(path.join(distPath, "index.html"))) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      app.use(express.static(fallbackDistPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(fallbackDistPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
