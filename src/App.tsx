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
  { id: 15, label: "SAVED LISTS", category: "SCRAPER MENU", icon: <Edit3 size={16} /> },
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
  const [apiId, setApiId] = useState(localStorage.getItem("apiId") || "33332903");
  const [apiHash, setApiHash] = useState(localStorage.getItem("apiHash") || "b68b8ee906d4a38a5f153a047b5d4bcc");

  useEffect(() => {
    localStorage.setItem("apiId", apiId);
    localStorage.setItem("apiHash", apiHash);
  }, [apiId, apiHash]);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  
  const [sourceGroup, setSourceGroup] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [scrapedMembers, setScrapedMembers] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [isTurboMode, setIsTurboMode] = useState(false);
  const [isFastMode, setIsFastMode] = useState(false);
  const [isUnstoppable, setIsUnstoppable] = useState(true);
  const [scrapeLimit, setScrapeLimit] = useState("5000");
  const [addDelay, setAddDelay] = useState("25000"); // Safe default delay to prevent bans
  const [spamStatus, setSpamStatus] = useState("");
  const [messageTarget, setMessageTarget] = useState("");
  const [messageContent, setMessageContent] = useState("");
  
  // Archive states
  const [archives, setArchives] = useState<any[]>([]);
  const [archiveName, setArchiveName] = useState("");
  
  // Progress states
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isStopping, setIsStopping] = useState(false);
  const stopRef = useRef(false);

  // Social states
  const [socialLink, setSocialLink] = useState("");
  const [targetProfile, setTargetProfile] = useState("");
  const [socialLimit, setSocialLimit] = useState("100");
  const [socialMode, setSocialMode] = useState<"scrape" | "add" | "connect">("connect");
  const [socialSessions, setSocialSessions] = useState<any[]>([]);
  const [socialUsername, setSocialUsername] = useState("Oil_aramco9699");
  const [socialAuthData, setSocialAuthData] = useState("2027741697304846336-TUDztC4ZRTQoI0K7uiU96tK0tHVJme:ZDn6gxCofl5vHmkgHv7mrdVflp1NguoubV9qOKedhjwBN");

  useEffect(() => {
    fetchSessions();
    fetchArchives();
    restoreSessionsFromBackup();
    addLog("info", "FULL-TG Web v2.5 initialized. Ready for commands.");
  }, []);

  const restoreSessionsFromBackup = async () => {
    const backup = localStorage.getItem("tg_sessions_backup");
    if (!backup) return;
    try {
      const sessionsToRestore = JSON.parse(backup);
      if (sessionsToRestore.length > 0) {
        addLog("info", `Checking session backup (${sessionsToRestore.length} accounts)...`);
        const res = await safeFetch("/api/sessions/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessions: sessionsToRestore })
        });
        const data = await res.json();
        if (data.restored > 0) {
          addLog("success", `Restored ${data.restored} sessions from backup.`);
          fetchSessions();
        }
      }
    } catch (e) {
      console.error("Backup restore failed:", e);
    }
  };

  const backupSessions = (sessionsList: any[]) => {
    const backupData = sessionsList.map(s => ({
      phone: s.phone,
      api_id: s.api_id,
      api_hash: s.api_hash,
      session_string: s.session_string
    }));
    localStorage.setItem("tg_sessions_backup", JSON.stringify(backupData));
  };

  const fetchArchives = async () => {
    try {
      const res = await safeFetch("/api/archive/list");
      const data = await res.json();
      setArchives(data);
    } catch (e: any) {
      console.error("Failed to fetch archives:", e);
    }
  };

  const saveToArchive = async () => {
    if (!archiveName || scrapedMembers.length === 0) return addLog("error", "Name and members required");
    try {
      const res = await safeFetch("/api/archive/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: archiveName, members: scrapedMembers })
      });
      const data = await res.json();
      if (data.success) {
        addLog("success", `List saved to archives: ${archiveName}`);
        setArchiveName("");
        fetchArchives();
      }
    } catch (e: any) {
      addLog("error", e.message);
    }
  };

  const loadArchive = async (id: number) => {
    setLoading(true);
    try {
      const res = await safeFetch(`/api/archive/${id}`);
      const data = await res.json();
      setScrapedMembers(data.members);
      addLog("success", `Loaded ${data.members.length} members from archive: ${data.name}`);
      setSelectedOption(18); // Switch to Adder
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteArchive = async (id: number) => {
    try {
      await safeFetch(`/api/archive/${id}`, { method: "DELETE" });
      fetchArchives();
      addLog("info", "Archive deleted.");
    } catch (e: any) {
      addLog("error", e.message);
    }
  };

  useEffect(() => {
    if ([20, 21, 22, 23, 24].includes(selectedOption || 0)) {
      fetchSocialSessions();
    }
  }, [selectedOption]);

  const fetchSocialSessions = async () => {
    const platform = 
      selectedOption === 20 ? 'twitter' : 
      selectedOption === 21 ? 'facebook' : 
      selectedOption === 22 ? 'tiktok' : 
      selectedOption === 24 ? 'telegram' : 'instagram';
    try {
      const res = await safeFetch(`/api/social/sessions?platform=${platform}`);
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server Error: ${res.status} - ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      setSocialSessions(data);
    } catch (e: any) {
      addLog("error", `Failed to fetch social sessions: ${e.message}`);
    }
  };

  const handleSocialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const platform = 
      selectedOption === 20 ? 'twitter' : 
      selectedOption === 21 ? 'facebook' : 
      selectedOption === 22 ? 'tiktok' : 
      selectedOption === 24 ? 'telegram' : 'instagram';
    setLoading(true);
    try {
      const res = await safeFetch("/api/social/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username: socialUsername, authData: socialAuthData })
      });
      const data = await res.json();
      if (data.success) {
        addLog("success", data.message);
        fetchSocialSessions();
        setSocialMode("scrape");
      } else {
        addLog("error", data.error);
      }
    } catch (e: any) {
      addLog("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogout = async (username: string) => {
    const platform = 
      selectedOption === 20 ? 'twitter' : 
      selectedOption === 21 ? 'facebook' : 
      selectedOption === 22 ? 'tiktok' : 
      selectedOption === 24 ? 'telegram' : 'instagram';
    try {
      await safeFetch("/api/social/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username })
      });
      addLog("info", `Logged out ${platform} account: ${username}`);
      fetchSocialSessions();
    } catch (e: any) {
      addLog("error", e.message);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const fetchSessions = async () => {
    try {
      const res = await safeFetch("/api/sessions");
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server Error: ${res.status} - ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      setSessions(data || []);
      if (data && data.length > 0) {
        backupSessions(data);
      }
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
    const activeSessions = isTurboMode ? selectedSessions : [selectedSession];
    if (activeSessions.length === 0 || !targetGroup || scrapedMembers.length === 0) {
      return addLog("error", "Missing session(s), target group, or scraped members");
    }

    setLoading(true);
    setIsStopping(false);
    stopRef.current = false;
    
    const membersToTarget = scrapedMembers.map(m => m.username);
    const retiredSessions = new Set<string>();
    
    // Check for existing progress
    let startIndex = 0;
    try {
      const res = await safeFetch(`/api/progress/get?phone=${activeSessions[0]}&targetGroup=${targetGroup}`);
      const data = await res.json();
      if (data && data.current_index < data.total_count) {
        startIndex = data.current_index;
        addLog("info", `Resuming from member #${startIndex + 1}...`);
      }
    } catch (e) {
      console.error("Failed to check progress:", e);
    }

    setProgress({ current: startIndex, total: membersToTarget.length });
    addLog("command", `${isTurboMode ? "[TURBO MODE] " : ""}Adding ${membersToTarget.length - startIndex} members to ${targetGroup}...`);
    
    try {
      // Parallel processing for Turbo Mode
      const processBatch = async (sessionPhone: string, startIdx: number, step: number) => {
        let currentSession = sessionPhone;
        
        for (let i = startIdx; i < membersToTarget.length; i += step) {
          if (stopRef.current) break;
          
          // Immediate Account Rotation Logic
          if (retiredSessions.has(currentSession)) {
            const available = activeSessions.find(s => !retiredSessions.has(s));
            if (available) {
              currentSession = available;
            } else {
              addLog("error", "❌ All selected accounts have reached their limits. Process complete.");
              stopRef.current = true;
              break;
            }
          }

          const username = membersToTarget[i];
          try {
            const res = await safeFetch("/api/add-members", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                phone: currentSession, 
                targetGroup, 
                members: [username],
                delay: isFastMode ? 50 : Math.max(parseInt(addDelay), 15000),
                fastMode: isFastMode
              })
            });

            const data = await res.json();
            if (data.success && (data.results[0].status === "success" || data.results[0].status === "skipped")) {
              const statusMsg = data.results[0].status === "skipped" ? `Skipped @${username}` : `Added @${username}`;
              addLog("success", `[${currentSession}] ${statusMsg}`);
            } else {
              const error = data.results?.[0]?.error || data.error || "Unknown error";
              
              if (error.includes("PEER_FLOOD") || error.includes("FLOOD_WAIT")) {
                addLog("error", `[${currentSession}] Restricted. Switching account...`);
                retiredSessions.add(currentSession);
                i -= step; // Retry this member immediately with the next account
                continue;
              }

              // Skip invalid/private members instantly
              addLog("info", `[${currentSession}] Skipping @${username} (Privacy/Invalid)`);
            }
          } catch (e) {
            // Network error or timeout - skip and continue
          }

          // Update progress tracking
          if (currentSession === activeSessions[0]) {
            try {
              await safeFetch("/api/progress/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phone: currentSession,
                  targetGroup,
                  currentIndex: i + 1,
                  totalCount: membersToTarget.length,
                  members: scrapedMembers,
                  status: stopRef.current ? 'stopped' : 'running'
                })
              });
            } catch (e) {}
            setProgress(prev => ({ ...prev, current: i + 1 }));
          }
          
          // Minimal delay for high performance
          const actualDelay = isFastMode ? 10 : (Math.max(parseInt(addDelay), 15000));
          if (actualDelay > 0) await new Promise(r => setTimeout(r, actualDelay));
        }
      };

      // Start parallel workers
      const workers = activeSessions.map((phone, idx) => processBatch(phone, startIndex + idx, activeSessions.length));
      await Promise.all(workers);

      if (!stopRef.current) {
        addLog("success", "Member adding process finished.");
        // Mark progress as completed
        await safeFetch("/api/progress/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: activeSessions[0],
            targetGroup,
            currentIndex: membersToTarget.length,
            totalCount: membersToTarget.length,
            members: scrapedMembers,
            status: 'completed'
          })
        });
      }
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
    
    addLog("command", `[GROWTH ENGINE] Initiating Human-Mimicry Expansion on ${platform}...`);
    addLog("info", `Targeting Profile: ${targetProfile} 🎯`);
    addLog("info", "Activating stealth protocols... 🕶️");
    
    const delayVal = parseInt(addDelay);
    if (delayVal < 15000) {
      addLog("error", "CRITICAL: Delay is too low! Minimum safe delay is 15000ms. Adjusting for safety.");
    }
    const safeDelay = Math.max(delayVal, 15000);

    try {
      if (socialSessions.length === 0) {
        addLog("error", "No connected account found. Please connect your account first.");
        setSocialMode("connect");
        return;
      }

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
            delay: Math.max(parseInt(addDelay), 15000),
            username: socialSessions[0].username
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
        const actualDelay = Math.max(parseInt(addDelay), 15000) + Math.floor(Math.random() * 5000);
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
    if (socialSessions.length === 0) {
      setSocialMode("connect");
      return addLog("error", "CRITICAL: You must CONNECT an account before performing Deep Discovery.");
    }
    
    setLoading(true);
    addLog("command", `[DEEP DISCOVERY] Initiating multi-threaded scrape on ${platform}: ${socialLink}...`);
    addLog("info", "Bypassing anti-bot filters... 🛡️");
    
    try {
      const res = await safeFetch("/api/social/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          platform, 
          link: socialLink,
          limit: parseInt(socialLimit),
          username: socialSessions[0].username
        })
      });
      const data = await res.json();
      if (data.success) {
        setScrapedMembers(data.members);
        addLog("success", `DEEP DISCOVERY COMPLETE: Successfully extracted ${data.members.length} high-value targets from ${platform}.`);
        addLog("info", `Targets are now synchronized with the growth engine. Switch to 'ADD' to begin expansion.`);
        setSocialMode("add");
      } else {
        addLog("error", `Scrape Failed: ${data.error}`);
      }
    } catch (e: any) {
      addLog("error", `System Error: ${e.message}`);
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
                            onClick={fetchSessions}
                            className="w-full border border-[#00ff00]/30 text-[#00ff00] py-2 rounded text-[10px] hover:bg-[#00ff00]/5"
                          >
                            REFRESH SESSIONS
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
                        <div className="mt-6 space-y-4">
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder="Archive Name (e.g. Crypto Group 1)"
                              value={archiveName}
                              onChange={e => setArchiveName(e.target.value)}
                              className="flex-1 bg-black border border-[#00ff00]/30 p-2 rounded text-sm outline-none"
                            />
                            <button 
                              onClick={saveToArchive}
                              className="px-4 py-2 bg-[#00ff00]/20 text-[#00ff00] border border-[#00ff00]/30 rounded text-xs font-bold hover:bg-[#00ff00] hover:text-black transition-all"
                            >
                              SAVE LIST
                            </button>
                          </div>
                          <div className="border border-[#00ff00]/20 rounded p-4">
                            <h3 className="text-sm font-bold mb-2">SCRAPED MEMBERS ({scrapedMembers.length})</h3>
                            <div className="max-h-40 overflow-y-auto text-[10px] space-y-1 opacity-60">
                              {scrapedMembers.map((m, i) => (
                                <div key={i}>@{m.username} - {m.firstName} {m.lastName}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Saved Lists */}
                {selectedOption === 15 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <Edit3 /> SAVED LISTS
                    </h2>
                    <div className="space-y-4">
                      {archives.length === 0 ? (
                        <p className="opacity-50 italic">No saved lists found. Scrape some members first!</p>
                      ) : (
                        archives.map(archive => (
                          <div key={archive.id} className="p-4 bg-black border border-[#00ff00]/20 rounded flex items-center justify-between">
                            <div>
                              <p className="font-bold text-[#00ff00]">{archive.name}</p>
                              <p className="text-[10px] opacity-50">{new Date(archive.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => loadArchive(archive.id)}
                                className="px-3 py-1 bg-[#00ff00]/10 text-[#00ff00] border border-[#00ff00]/30 rounded text-[10px] hover:bg-[#00ff00] hover:text-black transition-all"
                              >
                                LOAD
                              </button>
                              <button 
                                onClick={() => deleteArchive(archive.id)}
                                className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/30 rounded text-[10px] hover:bg-red-500 hover:text-white transition-all"
                              >
                                DELETE
                              </button>
                            </div>
                          </div>
                        ))
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
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between p-3 bg-[#00ff00]/5 border border-[#00ff00]/20 rounded">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isTurboMode ? 'bg-[#00ff00] animate-pulse' : 'bg-gray-600'}`} />
                            <span className="text-xs font-bold">TURBO MULTI-ACCOUNT MODE</span>
                          </div>
                          <button 
                            onClick={() => setIsTurboMode(!isTurboMode)}
                            className={`px-4 py-1 rounded text-[10px] font-black transition-all ${isTurboMode ? 'bg-[#00ff00] text-black' : 'bg-black text-[#00ff00] border border-[#00ff00]/30'}`}
                          >
                            {isTurboMode ? 'ON' : 'OFF'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isFastMode ? 'bg-red-500 animate-ping' : 'bg-gray-600'}`} />
                            <span className="text-xs font-bold text-red-500">ULTRA FAST MODE (HIGH RISK)</span>
                          </div>
                          <button 
                            onClick={() => {
                              if (!isFastMode) {
                                if (window.confirm("WARNING: Ultra Fast Mode adds members instantly (0.5s delay). This is extremely likely to get your accounts BANNED or RESTRICTED. Use only with multiple backup accounts. Continue?")) {
                                  setIsFastMode(true);
                                }
                              } else {
                                setIsFastMode(false);
                              }
                            }}
                            className={`px-4 py-1 rounded text-[10px] font-black transition-all ${isFastMode ? 'bg-red-500 text-white' : 'bg-black text-red-500 border border-red-500/30'}`}
                          >
                            {isFastMode ? 'ON' : 'OFF'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isUnstoppable ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'}`} />
                            <span className="text-xs font-bold text-blue-400">CONTINUOUS OPERATION MODE</span>
                          </div>
                          <button 
                            onClick={() => setIsUnstoppable(!isUnstoppable)}
                            className={`px-4 py-1 rounded text-[10px] font-black transition-all ${isUnstoppable ? 'bg-blue-500 text-white' : 'bg-black text-blue-500 border border-blue-500/30'}`}
                          >
                            {isUnstoppable ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs opacity-50">
                            {isTurboMode ? 'SELECT MULTIPLE ACCOUNTS' : 'SELECT ACCOUNT'}
                          </label>
                          {isTurboMode && (
                            <button 
                              onClick={() => {
                                if (selectedSessions.length === sessions.length) setSelectedSessions([]);
                                else setSelectedSessions(sessions.map(s => s.phone));
                              }}
                              className="text-[10px] text-[#00ff00] hover:underline"
                            >
                              {selectedSessions.length === sessions.length ? 'DESELECT ALL' : 'SELECT ALL'}
                            </button>
                          )}
                        </div>
                        {isTurboMode ? (
                          <div className="max-h-32 overflow-y-auto border border-[#00ff00]/30 rounded bg-black p-2 space-y-1">
                            {sessions.map(s => (
                              <label key={s.phone} className="flex items-center gap-2 p-2 hover:bg-[#00ff00]/10 rounded cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={selectedSessions.includes(s.phone)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedSessions([...selectedSessions, s.phone]);
                                    else setSelectedSessions(selectedSessions.filter(p => p !== s.phone));
                                  }}
                                  className="accent-[#00ff00]"
                                />
                                <span className="text-xs">{s.phone}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
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
                        )}
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
                          <label className="text-xs opacity-50">DELAY PER ADD (MS) - MIN 15000</label>
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
                    <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-lg border border-[#00ff00]/10">
                      <button
                        onClick={() => setSocialMode("connect")}
                        className={`py-2 rounded-md text-[10px] font-bold transition-all ${socialMode === "connect" ? "bg-[#00ff00] text-black" : "hover:bg-[#00ff00]/10"}`}
                      >
                        1. CONNECT
                      </button>
                      <button
                        onClick={() => setSocialMode("scrape")}
                        className={`py-2 rounded-md text-[10px] font-bold transition-all ${socialMode === "scrape" ? "bg-[#00ff00] text-black" : "hover:bg-[#00ff00]/10"}`}
                      >
                        2. SCRAPE
                      </button>
                      <button
                        onClick={() => setSocialMode("add")}
                        className={`py-2 rounded-md text-[10px] font-bold transition-all ${socialMode === "add" ? "bg-[#00ff00] text-black" : "hover:bg-[#00ff00]/10"}`}
                      >
                        3. ADD
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-2 bg-black/40 rounded border border-[#00ff00]/10">
                        <span className="text-[10px] opacity-50">ENGINE STATUS:</span>
                        <span className="text-[10px] font-bold text-[#00ff00] flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-[#00ff00] rounded-full animate-pulse" />
                          READY FOR {socialMode.toUpperCase()}
                        </span>
                      </div>

                      {socialMode === "connect" ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-[#00ff00]/5 border border-[#00ff00]/20 rounded">
                            <p className="text-xs opacity-70">
                              Connect your <span className="text-[#00ff00] font-bold uppercase">{MENU_OPTIONS.find(o => o.id === selectedOption)?.label.split(' ')[0]}</span> account to enable high-level scraping and growth.
                            </p>
                          </div>

                          {socialSessions.length > 0 ? (
                            <div className="space-y-2">
                              <label className="text-xs opacity-50">CONNECTED ACCOUNTS</label>
                              {socialSessions.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-black/60 border border-[#00ff00]/20 rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-[#00ff00] rounded-full animate-pulse" />
                                    <span className="text-sm font-bold">@{s.username}</span>
                                  </div>
                                  <button 
                                    onClick={() => handleSocialLogout(s.username)}
                                    className="text-[10px] text-red-500 hover:underline"
                                  >
                                    DISCONNECT
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <form onSubmit={handleSocialLogin} className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-xs opacity-50 uppercase">USERNAME</label>
                                <input
                                  type="text"
                                  value={socialUsername}
                                  onChange={e => setSocialUsername(e.target.value)}
                                  placeholder="@your_username"
                                  className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs opacity-50 uppercase">
                                  {selectedOption === 20 ? "ACCESS TOKEN : ACCESS SECRET" : "AUTH TOKEN / SESSION COOKIE"}
                                </label>
                                <input
                                  type="password"
                                  value={socialAuthData}
                                  onChange={e => setSocialAuthData(e.target.value)}
                                  placeholder={selectedOption === 20 ? "token:secret" : "Paste your auth token or session cookie here..."}
                                  className="w-full bg-black border border-[#00ff00]/30 p-3 rounded focus:border-[#00ff00] outline-none"
                                  required
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#00ff00] text-black font-bold py-3 rounded hover:bg-[#00ff00]/90 disabled:opacity-50 flex justify-center items-center gap-2"
                              >
                                {loading ? <Loader2 className="animate-spin" /> : "CONNECT ACCOUNT"}
                              </button>
                            </form>
                          )}
                        </div>
                      ) : socialMode === "scrape" ? (
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
