import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  User, 
  ShieldCheck, 
  Edit3, 
  Search, 
  UserPlus, 
  MessageSquare, 
  LogOut, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const RAILWAY_BACKEND = "https://fulltg-production.up.railway.app";

/**
 * Safe wrapper around fetch that rewrites /api/... calls
 */
async function safeFetch(input: string | Request, init?: RequestInit) {
  if (typeof input === "string" && input.startsWith("/api/")) {
    input = RAILWAY_BACKEND + input;
  } else if (input instanceof Request && input.url.startsWith("/api/")) {
    input = new Request(RAILWAY_BACKEND + input.url, input);
  }
  return fetch(input, init);
}

type LogEntry = {
  id: string;
  type: "info" | "success" | "error" | "command";
  message: string;
  timestamp: Date;
};

type MenuOption = {
  id: number;
  label: string;
  category: string;
  icon: React.ReactNode;
};

const MENU_OPTIONS: MenuOption[] = [
  { id: 1, label: "LOGIN ACCOUNTS", category: "LOGIN MENU", icon: <User size={16} /> },
  { id: 2, label: "LOGOUT ACCOUNTS", category: "LOGIN MENU", icon: <LogOut size={16} /> },
  { id: 4, label: "SPAM-CHECKER", category: "CHECKER MENU", icon: <ShieldCheck size={16} /> },
  { id: 14, label: "SCRAPE MEMBERS", category: "SCRAPER MENU", icon: <Search size={16} /> },
  { id: 18, label: "ADD MEMBERS", category: "ADDER MENU", icon: <UserPlus size={16} /> },
  { id: 19, label: "SEND MESSAGES", category: "MESSAGE MENU", icon: <MessageSquare size={16} /> },
];

export default function App() {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Form states
  const [phone, setPhone] = useState("");
  const [apiId, setApiId] = useState("33332903");
  const [apiHash, setApiHash] = useState("b68b8ee906d4a38a5f153a047b5d4bcc");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  
  const [sourceGroup, setSourceGroup] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [scrapedMembers, setScrapedMembers] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [scrapeLimit, setScrapeLimit] = useState("5000");
  const [addDelay, setAddDelay] = useState("5000");
  const [spamStatus, setSpamStatus] = useState("");
  const [messageTarget, setMessageTarget] = useState("");
  const [messageContent, setMessageContent] = useState("");

  useEffect(() => {
    fetchSessions();
    addLog("info", "FULL-TG Web v2.1 initialized. Ready for commands.");
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const fetchSessions = async () => {
    try {
      const res = await safeFetch("/api/sessions");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server Error: ${res.status} - ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      setSessions(data);
    } catch (e: any) {
      addLog("error", `Failed to fetch sessions: ${e.message}`);
    }
  };

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date()
    }].slice(-50)); // Keep last 50 logs
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    addLog("command", `Sending code to ${phone}...`);
    try {
      const res = await safeFetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, apiId, apiHash })
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server Error: ${res.status} - ${text.slice(0, 100)}`);
      }

      const data = await res.json();
      if (data.success) {
        setStep("code");
        addLog("success", "Code sent successfully. Please enter it below.");
      } else {
        addLog("error", data.error);
      }
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    addLog("command", "Signing in...");
    try {
      const res = await safeFetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, apiId, apiHash })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server Error: ${res.status} - ${text.slice(0, 100)}`);
      }

      const data = await res.json();
      if (data.success) {
        addLog("success", "Successfully logged in and session saved.");
        setStep("phone");
        setPhone("");
        setCode("");
        fetchSessions();
      } else {
        addLog("error", data.error);
      }
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return addLog("error", "Select a session first");
    setLoading(true);
    addLog("command", `Scraping members from ${sourceGroup} (Limit: ${scrapeLimit})...`);
    try {
      const res = await safeFetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: selectedSession, 
          groupLink: sourceGroup,
          limit: parseInt(scrapeLimit)
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server Error: ${res.status} - ${text.slice(0, 100)}`);
      }

      const data = await res.json();
      if (data.success) {
        setScrapedMembers(data.members);
        addLog("success", `Successfully scraped ${data.members.length} members.`);
      } else {
        addLog("error", data.error);
      }
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedSession || !targetGroup || scrapedMembers.length === 0) {
      return addLog("error", "Missing session, target group, or scraped members");
    }
    setLoading(true);
    addLog("command", `Adding ${scrapedMembers.length} members to ${targetGroup} (Delay: ${addDelay}ms)...`);
    try {
      const res = await safeFetch("/api/add-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: selectedSession, 
          targetGroup, 
          members: scrapedMembers.map(m => m.username),
          delay: parseInt(addDelay)
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server Error: ${res.status} - ${text.slice(0, 100)}`);
      }

      const data = await res.json();
      if (data.success) {
        const successCount = data.results.filter((r: any) => r.status === "success").length;
        addLog("success", `Operation complete. Added ${successCount}/${data.results.length} members.`);
        
        // Log system messages from backend (like flood waits)
        data.results.filter((r: any) => r.system).forEach((r: any) => addLog("info", r.message));
      } else {
        addLog("error", data.error);
      }
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpamCheck = async () => {
    if (!selectedSession) return addLog("error", "Select a session first");
    setLoading(true);
    addLog("command", "Checking account spam status...");
    try {
      const res = await safeFetch("/api/spam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedSession })
      });
      const data = await res.json();
      if (data.success) {
        setSpamStatus(data.status);
        addLog("success", `SpamBot Response: ${data.status.slice(0, 50)}...`);
      } else {
        addLog("error", data.error);
      }
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return addLog("error", "Select a session first");
    setLoading(true);
    addLog("command", `Sending message to ${messageTarget}...`);
    try {
      const res = await safeFetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: selectedSession, 
          target: messageTarget, 
          message: messageContent 
        })
      });
      const data = await res.json();
      if (data.success) {
        addLog("success", "Message sent successfully.");
        setMessageContent("");
      } else {
        addLog("error", data.error);
      }
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (phoneToLogout: string) => {
    if (!window.confirm(`Are you sure you want to logout ${phoneToLogout}?`)) return;
    setLoading(true);
    addLog("command", `Logging out ${phoneToLogout}...`);
    try {
      const res = await safeFetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneToLogout })
      });
      const data = await res.json();
      if (data.success) {
        addLog("success", "Logged out successfully.");
        fetchSessions();
        if (selectedSession === phoneToLogout) setSelectedSession("");
      } else {
        addLog("error", data.error);
      }
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#00ff00] font-mono flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-6 border-b border-[#00ff00]/20 flex flex-col items-center">
        <h1 className="text-6xl font-black tracking-tighter mb-2 select-none">
          FULL-TG
        </h1>
        <div className="text-[10px] opacity-60 uppercase tracking-widest flex gap-4">
          <span>Premium Edition</span>
          <span>Version: 2.1</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-[#00ff00]/20 overflow-y-auto p-4 custom-scrollbar">
          {Object.entries(
            MENU_OPTIONS.reduce((acc, opt) => {
              if (!acc[opt.category]) acc[opt.category] = [];
              acc[opt.category].push(opt);
              return acc;
            }, {} as Record<string, MenuOption[]>)
          ).map(([category, options]) => (
            <div key={category} className="mb-6">
              <h3 className="text-[11px] opacity-40 mb-3 flex items-center gap-2">
                <div className="h-[1px] w-4 bg-[#00ff00]/40" />
                {category}
              </h3>
              <div className="space-y-1">
                {options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOption(opt.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 transition-colors rounded
                      ${selectedOption === opt.id ? "bg-[#00ff00] text-black" : "hover:bg-[#00ff00]/10"}`}
                  >
                    <span className="opacity-40 text-[10px]">[{opt.id}]</span>
                    <span className="flex-1">{opt.label}</span>
                    {opt.icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-[#0d0d0d] relative">
          <AnimatePresence mode="wait">
            {!selectedOption ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center opacity-20"
              >
                <Terminal size={64} className="mb-4" />
                <p>SELECT AN OPTION FROM THE MENU TO BEGIN</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedOption}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto"
              >
                {/* Login Form */}
                {selectedOption === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <User /> LOGIN ACCOUNTS
                    </h2>
                    <form onSubmit={step === "phone" ? handleSendCode : handleSignIn} className="space-y-4">
                      {step === "phone" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-xs opacity-50">PHONE NUMBER (WITH COUNTRY CODE)</label>
                            <input
                              type="text"
                              value={phone}
                              onChange={e => setPhone(e.target.value)}
                              placeholder="+1234567890"
                              className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs opacity-50">API ID</label>
                              <input
                                type="text"
                                value={apiId}
                                onChange={e => setApiId(e.target.value)}
                                placeholder="123456"
                                className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs opacity-50">API HASH</label>
                              <input
                                type="text"
                                value={apiHash}
                                onChange={e => setApiHash(e.target.value)}
                                placeholder="abcdef123456..."
                                className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                                required
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                          >
                            {loading ? <Loader2 className="animate-spin" /> : "SEND CODE"}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label className="text-xs opacity-50">VERIFICATION CODE</label>
                            <input
                              type="text"
                              value={code}
                              onChange={e => setCode(e.target.value)}
                              placeholder="12345"
                              className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                          >
                            {loading ? <Loader2 className="animate-spin" /> : "SIGN IN"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep("phone")}
                            className="w-full text-xs opacity-50 hover:opacity-100"
                          >
                            BACK TO PHONE
                          </button>
                        </>
                      )}
                    </form>
                  </div>
                )}

                {/* Scraper Form */}
                {selectedOption === 14 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <Search /> SCRAPE MEMBERS
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">SELECT ACCOUNT</label>
                        <select 
                          value={selectedSession}
                          onChange={e => setSelectedSession(e.target.value)}
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                        >
                          <option value="">-- SELECT SESSION --</option>
                          {sessions.map(s => (
                            <option key={s.phone} value={s.phone}>{s.phone} (API: {s.api_id})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">TARGET GROUP LINK / USERNAME</label>
                        <input
                          type="text"
                          value={sourceGroup}
                          onChange={e => setSourceGroup(e.target.value)}
                          placeholder="https://t.me/examplegroup"
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                        />
                      </div>
                      <button
                        onClick={handleScrape}
                        disabled={loading || !sourceGroup}
                        className="w-full bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : "START SCRAPING"}
                      </button>

                      {scrapedMembers.length > 0 && (
                        <div className="mt-6 border border-[#00ff00]/20 rounded p-4">
                          <h3 className="text-sm font-bold mb-2">SCRAPED MEMBERS ({scrapedMembers.length})</h3>
                          <div className="max-h-40 overflow-y-auto text-[10px] space-y-1 opacity-60">
                            {scrapedMembers.map((m, i) => (
                              <div key={i}>@{m.username} - {m.firstName} {m.lastName}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Adder Form */}
                {selectedOption === 18 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <UserPlus /> ADD MEMBERS
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">SELECT ACCOUNT</label>
                        <select 
                          value={selectedSession}
                          onChange={e => setSelectedSession(e.target.value)}
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                        >
                          <option value="">-- SELECT SESSION --</option>
                          {sessions.map(s => (
                            <option key={s.phone} value={s.phone}>{s.phone}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">YOUR GROUP LINK / USERNAME</label>
                        <input
                          type="text"
                          value={targetGroup}
                          onChange={e => setTargetGroup(e.target.value)}
                          placeholder="https://t.me/mygroup"
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                        />
                      </div>
                      <div className="p-4 bg-[#00ff00]/5 border border-[#00ff00]/20 rounded">
                        <p className="text-xs opacity-70">
                          READY TO ADD <span className="text-[#00ff00] font-bold">{scrapedMembers.length}</span> MEMBERS FROM THE SCRAPER LIST.
                        </p>
                      </div>
                      <button
                        onClick={handleAddMembers}
                        disabled={loading || !targetGroup || scrapedMembers.length === 0}
                        className="w-full bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : "START ADDING"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Logout Accounts */}
                {selectedOption === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <LogOut /> LOGOUT ACCOUNTS
                    </h2>
                    <div className="space-y-4">
                      {sessions.length === 0 ? (
                        <p className="opacity-50 italic">No active sessions found.</p>
                      ) : (
                        sessions.map(s => (
                          <div key={s.phone} className="flex items-center justify-between p-4 bg-black border border-[#00ff00]/20 rounded">
                            <div>
                              <p className="font-bold">{s.phone}</p>
                              <p className="text-[10px] opacity-50">API ID: {s.api_id}</p>
                            </div>
                            <button
                              onClick={() => handleLogout(s.phone)}
                              className="px-4 py-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded text-xs font-bold transition-colors"
                            >
                              LOGOUT
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Spam Checker */}
                {selectedOption === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <ShieldCheck /> SPAM-CHECKER
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">SELECT ACCOUNT</label>
                        <select 
                          value={selectedSession}
                          onChange={e => setSelectedSession(e.target.value)}
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                        >
                          <option value="">-- SELECT SESSION --</option>
                          {sessions.map(s => (
                            <option key={s.phone} value={s.phone}>{s.phone}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleSpamCheck}
                        disabled={loading || !selectedSession}
                        className="w-full bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : "CHECK SPAM STATUS"}
                      </button>
                      
                      {spamStatus && (
                        <div className="p-4 bg-black border border-[#00ff00]/30 rounded whitespace-pre-wrap text-sm leading-relaxed">
                          <p className="text-[#00ff00] font-bold mb-2">SPAMBOT RESPONSE:</p>
                          {spamStatus}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scraper Form */}
                {selectedOption === 14 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <Search /> SCRAPE MEMBERS
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">SELECT ACCOUNT</label>
                        <select 
                          value={selectedSession}
                          onChange={e => setSelectedSession(e.target.value)}
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                        >
                          <option value="">-- SELECT SESSION --</option>
                          {sessions.map(s => (
                            <option key={s.phone} value={s.phone}>{s.phone} (API: {s.api_id})</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs opacity-50">TARGET GROUP LINK / USERNAME</label>
                          <input
                            type="text"
                            value={sourceGroup}
                            onChange={e => setSourceGroup(e.target.value)}
                            placeholder="https://t.me/examplegroup"
                            className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs opacity-50">SCRAPE LIMIT (0 = MAX)</label>
                          <input
                            type="number"
                            value={scrapeLimit}
                            onChange={e => setScrapeLimit(e.target.value)}
                            className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleScrape}
                        disabled={loading || !sourceGroup}
                        className="w-full bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : "START SCRAPING"}
                      </button>

                      {scrapedMembers.length > 0 && (
                        <div className="mt-6 border border-[#00ff00]/20 rounded p-4">
                          <h3 className="text-sm font-bold mb-2">SCRAPED MEMBERS ({scrapedMembers.length})</h3>
                          <div className="max-h-40 overflow-y-auto text-[10px] space-y-1 opacity-60">
                            {scrapedMembers.map((m, i) => (
                              <div key={i}>@{m.username} - {m.firstName} {m.lastName}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Adder Form */}
                {selectedOption === 18 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <UserPlus /> ADD MEMBERS
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">SELECT ACCOUNT</label>
                        <select 
                          value={selectedSession}
                          onChange={e => setSelectedSession(e.target.value)}
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                        >
                          <option value="">-- SELECT SESSION --</option>
                          {sessions.map(s => (
                            <option key={s.phone} value={s.phone}>{s.phone}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs opacity-50">YOUR GROUP LINK / USERNAME</label>
                          <input
                            type="text"
                            value={targetGroup}
                            onChange={e => setTargetGroup(e.target.value)}
                            placeholder="https://t.me/mygroup"
                            className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs opacity-50">DELAY PER ADD (MS)</label>
                          <input
                            type="number"
                            value={addDelay}
                            onChange={e => setAddDelay(e.target.value)}
                            className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-[#00ff00]/5 border border-[#00ff00]/20 rounded">
                        <p className="text-xs opacity-70">
                          READY TO ADD <span className="text-[#00ff00] font-bold">{scrapedMembers.length}</span> MEMBERS FROM THE SCRAPER LIST.
                        </p>
                        <p className="text-[10px] opacity-40 mt-1 italic">Professional Mode: Adding 1 by 1 with random human-like delays.</p>
                      </div>
                      <button
                        onClick={handleAddMembers}
                        disabled={loading || !targetGroup || scrapedMembers.length === 0}
                        className="w-full bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : "START ADDING"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Send Messages */}
                {selectedOption === 19 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <MessageSquare /> SEND MESSAGES
                    </h2>
                    <form onSubmit={handleSendMessage} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">SELECT ACCOUNT</label>
                        <select 
                          value={selectedSession}
                          onChange={e => setSelectedSession(e.target.value)}
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                        >
                          <option value="">-- SELECT SESSION --</option>
                          {sessions.map(s => (
                            <option key={s.phone} value={s.phone}>{s.phone}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">TARGET USERNAME / GROUP</label>
                        <input
                          type="text"
                          value={messageTarget}
                          onChange={e => setMessageTarget(e.target.value)}
                          placeholder="@username or group_link"
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs opacity-50">MESSAGE CONTENT</label>
                        <textarea
                          value={messageContent}
                          onChange={e => setMessageContent(e.target.value)}
                          placeholder="Type your message here..."
                          className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none h-32 resize-none"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || !selectedSession}
                        className="w-full bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : "SEND MESSAGE"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Other menus placeholder */}
                {![1, 2, 4, 14, 18, 19].includes(selectedOption) && (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
                    <AlertCircle size={48} className="mb-4" />
                    <p className="text-xl font-bold">MODULE NOT IMPLEMENTED</p>
                    <p className="text-sm">THIS FEATURE IS COMING SOON IN V2.2</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Terminal Footer */}
      <footer className="h-48 border-t border-[#00ff00]/20 bg-black flex flex-col">
        <div className="px-4 py-1 border-b border-[#00ff00]/10 flex justify-between items-center bg-[#050505]">
          <span className="text-[10px] opacity-50 flex items-center gap-2">
            <Terminal size={10} /> TERMINAL OUTPUT
          </span>
          <span className="text-[10px] opacity-30">UTF-8 | SESSION: {selectedSession || "NONE"}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-[11px] leading-relaxed custom-scrollbar">
          {logs.map(log => (
            <div key={log.id} className="flex gap-3 mb-1 group">
              <span className="opacity-20 select-none">[{log.timestamp.toLocaleTimeString()}]</span>
              <span className={`
                ${log.type === "info" ? "text-blue-400" : ""}
                ${log.type === "success" ? "text-emerald-400" : ""}
                ${log.type === "error" ? "text-red-400" : ""}
                ${log.type === "command" ? "text-yellow-400" : ""}
              `}>
                {log.type === "command" && <span className="mr-2 opacity-50">➜</span>}
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
