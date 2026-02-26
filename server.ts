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

    return res.json({ success: true, members });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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
    const results: any[] = [];
    
    // Batch adding to increase speed and "limit"
    const batchSize = 15; // Telegram allows multiple users per call
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      try {
        await client.invoke(new (await import("telegram/tl/index.js")).Api.channels.InviteToChannel({
          channel: target,
          users: batch
        }));
        
        batch.forEach((username: string) => {
          results.push({ username, status: "success" });
        });
        
        // Small delay between batches to avoid flood wait
        if (i + batchSize < members.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (e: any) {
        batch.forEach((username: string) => {
          results.push({ username, status: "failed", error: e.message });
        });
        // If we hit a flood wait, we should probably stop
        if (e.message.includes("FLOOD_WAIT")) break;
      }
    }

    return res.json({ success: true, results });
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
