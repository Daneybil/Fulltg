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
  Loader2,
  Twitter,
  Facebook,
  Instagram,
  Music2,
  Globe
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
  { id: 14, label: "TELEGRAM SCRAPER", category: "SCRAPER MENU", icon: <Search size={16} /> },
  { id: 18, label: "TELEGRAM ADDER", category: "ADDER MENU", icon: <UserPlus size={16} /> },
  { id: 19, label: "SEND MESSAGES", category: "MESSAGE MENU", icon: <MessageSquare size={16} /> },
  { id: 24, label: "TELEGRAM TOOLS", category: "SOCIAL GROWTH", icon: <Globe size={16} /> },
  { id: 20, label: "TWITTER TOOLS", category: "SOCIAL GROWTH", icon: <Twitter size={16} /> },
  { id: 21, label: "FACEBOOK TOOLS", category: "SOCIAL GROWTH", icon: <Facebook size={16} /> },
  { id: 22, label: "TIKTOK TOOLS", category: "SOCIAL GROWTH", icon: <Music2 size={16} /> },
  { id: 23, label: "INSTAGRAM TOOLS", category: "SOCIAL GROWTH", icon: <Instagram size={16} /> },
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
  
  // Progress states
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isStopping, setIsStopping] = useState(false);
  const stopRef = useRef(false);

  // Social states
  const [socialLink, setSocialLink] = useState("");
  const [targetProfile, setTargetProfile] = useState("");
  const [socialLimit, setSocialLimit] = useState("100");
  const [socialMode, setSocialMode] = useState<"scrape" | "add">("scrape");

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
    setIsStopping(false);
    stopRef.current = false;
    const membersToTarget = scrapedMembers.map(m => m.username);
    setProgress({ current: 0, total: membersToTarget.length });
    
    addLog("command", `Adding ${membersToTarget.length} members to ${targetGroup} (Delay: ${addDelay}ms)...`);
    
    try {
      // We process in small batches on the frontend to allow for "Stop" functionality
      // and real-time progress updates.
      for (let i = 0; i < membersToTarget.length; i++) {
        if (stopRef.current) {
          addLog("info", "Adding process stopped by user.");
          break;
        }

        const username = membersToTarget[i];
        const res = await safeFetch("/api/add-members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            phone: selectedSession, 
            targetGroup, 
            members: [username],
            delay: parseInt(addDelay)
          })
        });

        const data = await res.json();
        if (data.success && data.results[0].status === "success") {
          addLog("success", `[${i+1}/${membersToTarget.length}] Added @${username}`);
        } else {
          const error = data.results?.[0]?.error || data.error || "Unknown error";
          addLog("error", `[${i+1}/${membersToTarget.length}] Failed @${username}: ${error}`);
          
          if (error.includes("FLOOD_WAIT")) {
            const waitTime = parseInt(error.match(/\d+/)?.[0] || "60");
            addLog("info", `Sleeping for ${waitTime}s due to flood wait...`);
            await new Promise(r => setTimeout(r, waitTime * 1000));
          }
        }

        setProgress({ current: i + 1, total: membersToTarget.length });
        
        // Human-like delay
        const actualDelay = parseInt(addDelay) + Math.floor(Math.random() * 2000);
        await new Promise(r => setTimeout(r, actualDelay));
      }

      addLog("success", "Member adding process finished.");
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
      setIsStopping(false);
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

  const handleSocialAdd = async (platform: string) => {
    if (!targetProfile || scrapedMembers.length === 0) {
      return addLog("error", "Missing target profile or scraped followers");
    }
    setLoading(true);
    setIsStopping(false);
    stopRef.current = false;
    setProgress({ current: 0, total: scrapedMembers.length });
    
    addLog("command", `Starting Human-Mimicry Growth on ${platform}...`);
    addLog("info", `Target Profile: ${targetProfile}`);
    
    try {
      for (let i = 0; i < scrapedMembers.length; i++) {
        if (stopRef.current) {
          addLog("info", "Growth process stopped by user.");
          break;
        }

        const member = scrapedMembers[i];
        const res = await safeFetch("/api/social/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            platform, 
            targetProfile, 
            follower: member.username,
            delay: parseInt(addDelay)
          })
        });

        const data = await res.json();
        if (data.success) {
          addLog("success", `[${i+1}/${scrapedMembers.length}] @${member.username} is now following your ${platform} profile.`);
        } else {
          addLog("error", `[${i+1}/${scrapedMembers.length}] Failed to add @${member.username}: ${data.error}`);
        }

        setProgress({ current: i + 1, total: scrapedMembers.length });
        
        // Human-like delay
        const actualDelay = parseInt(addDelay) + Math.floor(Math.random() * 3000);
        await new Promise(r => setTimeout(r, actualDelay));
      }

      if (!stopRef.current) {
        addLog("success", `Growth mission accomplished. Your ${platform} profile has been boosted.`);
      }
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
      setIsStopping(false);
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

  const handleSocialScrape = async (platform: string) => {
    if (!socialLink) return addLog("error", "Enter a profile link first");
    setLoading(true);
    addLog("command", `Deep Scraping ${platform} profile: ${socialLink}...`);
    try {
      const res = await safeFetch("/api/social/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          platform, 
          link: socialLink,
          limit: parseInt(socialLimit)
        })
      });
      const data = await res.json();
      if (data.success) {
        setScrapedMembers(data.members);
        addLog("success", `Successfully discovered ${data.members.length} potential targets from ${platform}.`);
        addLog("info", "You can now use 'ADD MEMBERS' to target these users on Telegram.");
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
      <header className="p-6 border-b border-[#00ff00]/20 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,0,0.05),transparent_70%)]" />
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-black tracking-tighter mb-2 select-none text-transparent bg-clip-text bg-gradient-to-b from-[#00ff00] to-[#008800] drop-shadow-[0_0_15px_rgba(0,255,0,0.3)]"
        >
          FULL-TG
        </motion.h1>
        <div className="text-[10px] opacity-60 uppercase tracking-widest flex gap-4 relative z-10">
          <span className="flex items-center gap-1"><div className="w-1 h-1 bg-[#00ff00] rounded-full animate-pulse" /> Premium Edition</span>
          <span>Version: 2.5</span>
          <span className="text-[#00ff00]/40">System: Operational</span>
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
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0d0d] relative">
          <div className="flex-1 p-8 overflow-y-auto relative custom-scrollbar">
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

                      {loading && progress.total > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] opacity-60">
                            <span>PROGRESS: {progress.current} / {progress.total}</span>
                            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                          </div>
                          <div className="h-1 bg-black rounded-full overflow-hidden border border-[#00ff00]/10">
                            <motion.div 
                              className="h-full bg-[#00ff00] shadow-[0_0_10px_rgba(0,255,0,0.5)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <button
                          onClick={handleAddMembers}
                          disabled={loading || !targetGroup || scrapedMembers.length === 0}
                          className="flex-1 bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                          {loading ? <Loader2 className="animate-spin" /> : "START ADDING"}
                        </button>
                        {loading && (
                          <button
                            onClick={() => {
                              stopRef.current = true;
                              setIsStopping(true);
                            }}
                            disabled={isStopping}
                            className="px-6 bg-red-500/20 text-red-500 border border-red-500/30 font-bold rounded hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                          >
                            {isStopping ? "STOPPING..." : "STOP"}
                          </button>
                        )}
                      </div>
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

                {/* Social Tools */}
                {[20, 21, 22, 23, 24].includes(selectedOption) && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3 uppercase">
                      {selectedOption === 20 && <Twitter />}
                      {selectedOption === 21 && <Facebook />}
                      {selectedOption === 22 && <Music2 />}
                      {selectedOption === 23 && <Instagram />}
                      {selectedOption === 24 && <Globe />}
                      {MENU_OPTIONS.find(o => o.id === selectedOption)?.label}
                    </h2>

                    {/* Mode Selector */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-lg border border-[#00ff00]/10">
                      <button
                        onClick={() => setSocialMode("scrape")}
                        className={`py-2 rounded-md text-xs font-bold transition-all ${socialMode === "scrape" ? "bg-[#00ff00] text-black" : "hover:bg-[#00ff00]/10"}`}
                      >
                        1. SCRAPE FOLLOWERS
                      </button>
                      <button
                        onClick={() => setSocialMode("add")}
                        className={`py-2 rounded-md text-xs font-bold transition-all ${socialMode === "add" ? "bg-[#00ff00] text-black" : "hover:bg-[#00ff00]/10"}`}
                      >
                        2. ADD TO PROFILE
                      </button>
                    </div>

                    <div className="space-y-4">
                      {socialMode === "scrape" ? (
                        <>
                          <div className="p-4 bg-[#00ff00]/5 border border-[#00ff00]/20 rounded">
                            <p className="text-xs opacity-70">
                              Enter a <span className="text-[#00ff00] font-bold">Target Profile</span> to scrape its followers. 
                              These followers will be loaded into the queue for your growth.
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-xs opacity-50 uppercase">TARGET PROFILE LINK (SOURCE)</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={socialLink}
                                onChange={e => setSocialLink(e.target.value)}
                                placeholder={`https://${selectedOption === 20 ? 'twitter.com' : selectedOption === 21 ? 'facebook.com' : selectedOption === 22 ? 'tiktok.com' : selectedOption === 24 ? 't.me' : 'instagram.com'}/username`}
                                className="w-full bg-black border border-[#00ff00]/30 p-3 pl-10 rounded focus:border-[#00ff00] outline-none"
                              />
                              <Globe className="absolute left-3 top-3.5 opacity-30" size={18} />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs opacity-50 uppercase">SCRAPE LIMIT (UNLIMITED)</label>
                            <input
                              type="number"
                              value={socialLimit}
                              onChange={e => setSocialLimit(e.target.value)}
                              className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                            />
                          </div>

                          <button
                            onClick={() => handleSocialScrape(
                              selectedOption === 20 ? 'twitter' : 
                              selectedOption === 21 ? 'facebook' : 
                              selectedOption === 22 ? 'tiktok' : 
                              selectedOption === 24 ? 'telegram' : 'instagram'
                            )}
                            disabled={loading || !socialLink}
                            className="w-full bg-[#00ff00] text-black font-bold py-4 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(0,255,0,0.2)]"
                          >
                            {loading ? <Loader2 className="animate-spin" /> : "START SCRAPING FOLLOWERS"}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="p-4 bg-[#00ff00]/5 border border-[#00ff00]/20 rounded">
                            <p className="text-xs opacity-70">
                              Enter <span className="text-[#00ff00] font-bold">YOUR Profile Link</span>. 
                              The scraped followers will be added to your account using our human-mimicry engine.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs opacity-50 uppercase">YOUR PROFILE LINK (TARGET)</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={targetProfile}
                                onChange={e => setTargetProfile(e.target.value)}
                                placeholder={`https://${selectedOption === 20 ? 'twitter.com' : selectedOption === 21 ? 'facebook.com' : selectedOption === 22 ? 'tiktok.com' : selectedOption === 24 ? 't.me' : 'instagram.com'}/my_account`}
                                className="w-full bg-black border border-[#00ff00]/30 p-3 pl-10 rounded focus:border-[#00ff00] outline-none"
                              />
                              <Globe className="absolute left-3 top-3.5 opacity-30" size={18} />
                            </div>
                          </div>

                          <div className="p-4 bg-black/40 border border-[#00ff00]/10 rounded">
                            <p className="text-xs opacity-70">
                              READY TO ADD <span className="text-[#00ff00] font-bold">{scrapedMembers.length}</span> FOLLOWERS TO YOUR PROFILE.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs opacity-50">DELAY PER FOLLOW (MS)</label>
                            <input
                              type="number"
                              value={addDelay}
                              onChange={e => setAddDelay(e.target.value)}
                              className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                            />
                          </div>

                          {loading && progress.total > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] opacity-60">
                                <span>PROGRESS: {progress.current} / {progress.total}</span>
                                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                              </div>
                              <div className="h-1 bg-black rounded-full overflow-hidden border border-[#00ff00]/10">
                                <motion.div 
                                  className="h-full bg-[#00ff00] shadow-[0_0_10px_rgba(0,255,0,0.5)]"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-4">
                            <button
                              onClick={() => handleSocialAdd(
                                selectedOption === 20 ? 'twitter' : 
                                selectedOption === 21 ? 'facebook' : 
                                selectedOption === 22 ? 'tiktok' : 
                                selectedOption === 24 ? 'telegram' : 'instagram'
                              )}
                              disabled={loading || !targetProfile || scrapedMembers.length === 0}
                              className="flex-1 bg-[#00ff00] text-black font-bold py-4 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(0,255,0,0.2)]"
                            >
                              {loading ? <Loader2 className="animate-spin" /> : "START ADDING FOLLOWERS"}
                            </button>
                            {loading && (
                              <button
                                onClick={() => {
                                  stopRef.current = true;
                                  setIsStopping(true);
                                }}
                                disabled={isStopping}
                                className="px-6 bg-red-500/20 text-red-500 border border-red-500/30 font-bold rounded hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                              >
                                {isStopping ? "STOPPING..." : "STOP"}
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {scrapedMembers.length > 0 && socialMode === "scrape" && (
                        <div className="mt-6 border border-[#00ff00]/20 rounded p-4 bg-black/40">
                          <h3 className="text-sm font-bold mb-2 flex items-center justify-between">
                            <span>DISCOVERED FOLLOWERS ({scrapedMembers.length})</span>
                            <span className="text-[10px] bg-[#00ff00]/20 px-2 py-0.5 rounded">READY FOR ADDING</span>
                          </h3>
                          <div className="max-h-60 overflow-y-auto text-[10px] space-y-1 opacity-60 custom-scrollbar">
                            {scrapedMembers.map((m, i) => (
                              <div key={i} className="flex items-center gap-2 border-b border-[#00ff00]/5 py-1">
                                <span className="opacity-30">{i+1}.</span>
                                <span className="text-[#00ff00]">@{m.username}</span>
                                <span className="opacity-30 ml-auto">{m.discoveredAt.split('T')[0]}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Other menus placeholder */}
                {![1, 2, 4, 14, 18, 19, 20, 21, 22, 23].includes(selectedOption) && (
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
