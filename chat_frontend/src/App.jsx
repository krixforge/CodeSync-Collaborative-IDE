import Home from "./pages/Home";
import "./App.css";
import { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import Editor from "@monaco-editor/react";
import {
  Code2, Play, LogOut, Terminal, MessageSquare, Sparkles,
  ChevronDown, FileCode, Users, Copy, Check, Send,
  BookOpen, Bug, Zap, FlaskConical, Columns, X
} from "lucide-react";

// Avatar colors for users
const AVATAR_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"
];

function getInitials(name) {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

const LANG_EXT = { java: "java", python: "py", javascript: "js", cpp: "cpp" };

function App() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [joined, setJoined] = useState(false);
  const [language, setLanguage] = useState("java");
  const [output, setOutput] = useState("");
  const [stompClient, setStompClient] = useState(null);
  const messagesEndRef = useRef(null);
  const [code, setCode] = useState(`public class Main {\n\n}`);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);

  // Right panel tab: "console" | "output" | "chat" | "copilot"
  const [rightTab, setRightTab] = useState("console");

  // ── AI Copilot ──
  const [copilotMessages, setCopilotMessages] = useState([
    {
      role: "ai",
      content: "Hi! I'm your AI Copilot. Ask me to explain, debug, optimize, or write tests for your code.",
    },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotTyping, setCopilotTyping] = useState(false);
  const [codeAnalysis, setCodeAnalysis] = useState(null);
  const copilotEndRef = useRef(null);

  useEffect(() => {
    copilotEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilotMessages, copilotTyping]);

  function pushCopilotMessage(role, content) {
    setCopilotMessages(prev => [...prev, { role, content }]);
  }

  function simulateCopilotReply(userText) {
    pushCopilotMessage("user", userText);
    setCopilotTyping(true);
    setTimeout(() => {
      setCopilotTyping(false);
      pushCopilotMessage(
        "ai",
        "This is a placeholder response. Connect an AI API to generate real answers based on your code."
      );
    }, 1200);
  }

  function sendCopilotMessage() {
    if (!copilotInput.trim()) return;
    simulateCopilotReply(copilotInput.trim());
    setCopilotInput("");
  }

  const handleJoinRoom = (room, user) => {
    setRoomId(room);
    setUsername(user);
    setShowEditor(true);
  };

  async function runQuickAction(action) {
    const labels = {
      explain: "Explain Code",
      bugs: "Find Bugs",
      optimize: "Optimize Code",
      tests: "Generate Test Cases",
    };

    const endpoints = {
      explain: "http://localhost:8080/api/ai/explain",
      bugs: "http://localhost:8080/api/ai/bugs",
      optimize: "http://localhost:8080/api/ai/optimize",
      tests: "http://localhost:8080/api/ai/tests",
    };

    pushCopilotMessage("user", labels[action]);
    setLoadingAI(true);
    setCopilotTyping(true);

    try {
      const response = await fetch(endpoints[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const text = await response.text();
      const result = JSON.parse(text);
      const resultText = result.output ?? result.response ?? text;

      setAiResponse(resultText);
      pushCopilotMessage("ai", resultText);

    } catch (error) {
      console.error("AI REQUEST ERROR:", error);
      const errorText = "ERROR: " + error.message;
      setAiResponse(errorText);
      pushCopilotMessage("ai", errorText);

    } finally {
      setLoadingAI(false);
      setCopilotTyping(false);
    }
  }

  function handleCodeChange(value) {
    setCode(value);
    if (!stompClient) return;
    stompClient.publish({
      destination: "/app/code",
      body: JSON.stringify({ roomId, code: value, language })
    });
  }

  function joinRoom() {
    if (!roomId) { alert("Enter Room ID"); return; }
    if (!username) { alert("Enter Username"); return; }
    if (joined) { alert("Already joined"); return; }

    const socket = new SockJS("http://localhost:8080/chat");
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: async () => {

        client.subscribe("/topic/" + roomId, (msg) => {
          const received = JSON.parse(msg.body);
          setMessages(prev => [...prev, received]);
        });

        client.subscribe("/topic/language/" + roomId, (msg) => {
          const data = JSON.parse(msg.body);
          setLanguage(data.language);
        });

        client.subscribe("/topic/code/" + roomId, (msg) => {
          const data = JSON.parse(msg.body);
          setCode(data.code);
        });

        client.subscribe("/topic/users/" + roomId, (msg) => {
          const data = JSON.parse(msg.body);
          setUsers(data.users);
        });

        client.publish({
          destination: "/app/join",
          body: JSON.stringify({ sender: username, roomId: roomId })
        });

        try {
          const response = await fetch(`http://localhost:8080/api/rooms/${roomId}`);
          if (response.ok) {
            const room = await response.json();
            if (room) {
              if (room.code) setCode(room.code);
              if (room.language) setLanguage(room.language);
            }
          }
        } catch (error) {
          console.error("Failed to load room", error);
        }

        setStompClient(client);
        setJoined(true);
        alert("Joined Room " + roomId);
      },
      onStompError: (frame) => {
        console.error("Broker Error", frame);
      }
    });
    client.activate();
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    if (!stompClient) { alert("Join a room first"); return; }
    if (!message.trim()) return;
    stompClient.publish({
      destination: "/app/send",
      body: JSON.stringify({ sender: username, content: message, roomId: roomId })
    });
    setMessage("");
  }

  function leaveRoom() {
    if (!stompClient) return;
    stompClient.publish({
      destination: "/app/leave",
      body: JSON.stringify({ sender: username, roomId: roomId })
    });
    stompClient.deactivate();
    setJoined(false);
    setUsers([]);
    setMessages([]);
  }

  function changeLanguage(newLanguage) {
    setLanguage(newLanguage);
    setLangMenuOpen(false);
    if (!stompClient) return;
    stompClient.publish({
      destination: "/app/language",
      body: JSON.stringify({ roomId: roomId, language: newLanguage })
    });
  }

  async function runCode() {
    console.log("RUN BUTTON CLICKED");
    try {
      setOutput("Running...");
      setRightTab("console");
      const response = await fetch("http://localhost:8080/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code, language: language })
      });
      console.log("STATUS:", response.status);
      const text = await response.text();
      console.log("RAW RESPONSE:", text);
      const result = JSON.parse(text);
      setOutput(result.output);
    } catch (error) {
      console.error("RUN ERROR:", error);
      setOutput("ERROR: " + error.message);
    }
  }

  function handleCopyRoomId() {
    navigator.clipboard.writeText(roomId);
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 1800);
  }

  const fileName = `solution.${LANG_EXT[language] || "java"}`;
  const langLabel = { java: "Java", python: "Python 3.11", cpp: "C++", javascript: "JavaScript" };

  // Close lang menu on outside click
  useEffect(() => {
    if (!langMenuOpen) return;
    const handler = () => setLangMenuOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [langMenuOpen]);

  if (!showEditor) {
    return <Home onJoin={handleJoinRoom} />;
  }

  return (
    <div className="cs-app">

      {/* ── TOP NAVBAR ── */}
      <header className="cs-navbar">
        <div className="cs-navbar-left">
          {/* Logo */}
          <span className="cs-logo">
            <span className="cs-logo-icon"><Code2 size={14} /></span>
            <span className="cs-logo-text">CodeSync</span>
          </span>

          <div className="cs-navbar-divider" />

          {/* Live pill / join bar */}
          {joined ? (
            <div className="cs-live-pill">
              <span className="cs-live-dot" />
              <span>LIVE</span>
              <span className="cs-live-sep">·</span>
              <span className="cs-live-room">{roomId}</span>
              <button
                className="cs-live-copy"
                onClick={handleCopyRoomId}
                title="Copy room ID"
              >
                {copiedRoomId ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
          ) : (
            <div className="cs-join-bar">
              <input
                className="cs-input"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <input
                className="cs-input"
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button className="cs-btn cs-btn-primary" onClick={joinRoom}>
                Join Room
              </button>
            </div>
          )}
        </div>

        <div className="cs-navbar-right">
          {joined && (
            <>
              {/* Avatar stack */}
              <div className="cs-avatar-stack">
                {users.slice(0, 4).map((u, i) => (
                  <div
                    key={u}
                    className="cs-avatar"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    title={u}
                  >
                    {getInitials(u)}
                  </div>
                ))}
              </div>
              <span className="cs-online-count">
                <span className="cs-online-dot" />{users.length} online
              </span>

              <button className="cs-btn cs-btn-run" onClick={runCode}>
                <Play size={13} fill="currentColor" />
                Run
              </button>

              <button className="cs-btn cs-btn-ghost" onClick={leaveRoom}>
                <LogOut size={13} />
                Leave
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── MAIN BODY ── */}
      <div className="cs-body">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="cs-sidebar">
          {/* Explorer */}
          <div className="cs-sidebar-section">
            <p className="cs-sidebar-label">
              <Columns size={9} />
              Explorer
            </p>
            <div className="cs-file-tab cs-file-tab--active">
              <FileCode size={13} className="cs-file-icon-svg" />
              <span>{fileName}</span>
            </div>
          </div>

          {/* Team */}
          <div className="cs-sidebar-section">
            <p className="cs-sidebar-label">
              <Users size={9} />
              Team
            </p>
            {users.length === 0 ? (
              <div className="cs-sidebar-empty-state">
                <Users size={22} className="cs-empty-icon" />
                <span>No users online</span>
                {!joined && <span className="cs-empty-hint">Join a room to see teammates</span>}
              </div>
            ) : (
              <ul className="cs-user-list">
                {users.map((u, i) => (
                  <li key={u} className="cs-user-item">
                    <div
                      className="cs-avatar cs-avatar--md"
                      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {getInitials(u)}
                    </div>
                    <div className="cs-user-meta">
                      <span className="cs-user-name">{u}</span>
                      <span className="cs-user-status">
                        <span className="cs-online-indicator" /> online
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ── EDITOR PANEL ── */}
        <main className="cs-editor-panel">
          {/* File tabs + language select */}
          <div className="cs-editor-topbar">
            <div className="cs-file-tabs">
              <div className="cs-editor-filetab cs-editor-filetab--active">
                <FileCode size={12} style={{ color: "#818cf8", flexShrink: 0 }} />
                {fileName}
              </div>
            </div>

            <div className="cs-editor-controls">
              {/* Custom language dropdown */}
              <div
                className="cs-lang-dropdown-wrap"
                onClick={(e) => { e.stopPropagation(); setLangMenuOpen(v => !v); }}
              >
                <button className="cs-lang-trigger">
                  <span className="cs-lang-dot" />
                  {langLabel[language] || language}
                  <ChevronDown size={11} className={`cs-lang-caret ${langMenuOpen ? "cs-lang-caret--open" : ""}`} />
                </button>
                {langMenuOpen && (
                  <div className="cs-lang-menu">
                    {Object.entries(langLabel).map(([val, label]) => (
                      <button
                        key={val}
                        className={`cs-lang-option ${language === val ? "cs-lang-option--active" : ""}`}
                        onClick={() => changeLanguage(val)}
                      >
                        {label}
                        {language === val && <Check size={11} />}
                      </button>
                    ))}
                  </div>
                )}
                {/* Hidden native select for accessibility / fallback */}
                <select
                  className="cs-lang-select-hidden"
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  aria-label="Select language"
                >
                  <option value="java">Java</option>
                  <option value="python">Python 3.11</option>
                  <option value="cpp">C++</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="cs-monaco-wrap">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language === "cpp" ? "cpp" : language}
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 22,
              }}
            />
          </div>
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside className="cs-right-panel">

          {/* Tabs */}
          <div className="cs-rtabs">
            {[
              { id: "console", icon: <Terminal size={12} />, label: "Console" },
              { id: "output",  icon: <Columns size={12} />, label: "Output" },
              { id: "chat",    icon: <MessageSquare size={12} />, label: "Chat" },
              { id: "copilot", icon: <Sparkles size={12} />, label: "Copilot", accent: true },
            ].map(tab => (
              <button
                key={tab.id}
                className={`cs-rtab ${tab.accent ? "cs-rtab--copilot" : ""} ${rightTab === tab.id ? "cs-rtab--active" : ""}`}
                onClick={() => setRightTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Copilot tab ── */}
          {rightTab === "copilot" && (
            <div className="cp-panel">
              <div className="cp-header">
                <div className="cp-header-icon">
                  <Sparkles size={14} />
                </div>
                <div className="cp-header-text">
                  <span className="cp-header-title">AI Copilot</span>
                  <span className="cp-header-sub">Powered by your code context</span>
                </div>
              </div>

              <div className="cp-quick-actions">
                <button className="cp-action-btn" onClick={() => runQuickAction("explain")} disabled={loadingAI}>
                  <BookOpen size={12} className="cp-action-icon" /> Explain
                </button>
                <button className="cp-action-btn" onClick={() => runQuickAction("bugs")} disabled={loadingAI}>
                  <Bug size={12} className="cp-action-icon" /> Find Bugs
                </button>
                <button className="cp-action-btn" onClick={() => runQuickAction("optimize")} disabled={loadingAI}>
                  <Zap size={12} className="cp-action-icon" /> Optimize
                </button>
                <button className="cp-action-btn" onClick={() => runQuickAction("tests")} disabled={loadingAI}>
                  <FlaskConical size={12} className="cp-action-icon" /> Tests
                </button>
              </div>

              {codeAnalysis && (
                <div className="cp-analysis-card">
                  <div className="cp-analysis-header">
                    <span>Code Analysis</span>
                    <button className="cp-analysis-close" onClick={() => setCodeAnalysis(null)}>
                      <X size={13} />
                    </button>
                  </div>
                  <div className="cp-analysis-row">
                    <span className="cp-analysis-label">Language</span>
                    <span className="cp-analysis-value">{codeAnalysis.language}</span>
                  </div>
                  <div className="cp-analysis-row">
                    <span className="cp-analysis-label">Complexity</span>
                    <span className="cp-analysis-value">{codeAnalysis.complexity}</span>
                  </div>
                  <div className="cp-analysis-row">
                    <span className="cp-analysis-label">Potential Issues</span>
                    <span className={`cp-analysis-pill ${codeAnalysis.issues > 0 ? "cp-pill-warn" : "cp-pill-ok"}`}>
                      {codeAnalysis.issues}
                    </span>
                  </div>
                  <div className="cp-analysis-row">
                    <span className="cp-analysis-label">Suggestions</span>
                    <span className="cp-analysis-pill cp-pill-info">{codeAnalysis.suggestions}</span>
                  </div>
                </div>
              )}

              <div className="cp-chat-messages">
                {copilotMessages.map((m, i) => (
                  <div key={i} className={`cp-msg ${m.role === "user" ? "cp-msg--user" : "cp-msg--ai"}`}>
                    {m.role === "ai" && (
                      <div className="cp-msg-avatar"><Sparkles size={11} /></div>
                    )}
                    <div className="cp-msg-bubble">
                      <p className="cp-msg-text">{m.content}</p>
                    </div>
                  </div>
                ))}

                {copilotTyping && (
                  <div className="cp-msg cp-msg--ai">
                    <div className="cp-msg-avatar"><Sparkles size={11} /></div>
                    <div className="cp-msg-bubble cp-typing">
                      {loadingAI ? (
                        <span className="cp-thinking-text">Thinking…</span>
                      ) : (
                        <>
                          <span className="cp-dot" />
                          <span className="cp-dot" />
                          <span className="cp-dot" />
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div ref={copilotEndRef} />
              </div>

              <div className="cp-input-row">
                <input
                  className="cp-input"
                  placeholder="Ask about your code…"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendCopilotMessage(); }}
                />
                <button className="cp-send-btn" onClick={sendCopilotMessage}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── Console / Output tab ── */}
          {(rightTab === "console" || rightTab === "output") && (
            <div className="cs-console">
              {output ? (
                <>
                  <div className="cs-console-run-line">
                    <Play size={9} fill="currentColor" className="cs-console-run-icon" />
                    <span className="cs-console-run-label">
                      {language === "python" ? "python solution.py" : `run solution.${LANG_EXT[language] || "java"}`}
                    </span>
                  </div>
                  <pre className="cs-console-output">{output}</pre>
                  {output !== "Running..." && (
                    <div className="cs-console-exit">
                      <Check size={11} className="cs-exit-ok" /> Exit code 0
                    </div>
                  )}
                </>
              ) : (
                <div className="cs-console-empty">
                  <Terminal size={28} className="cs-console-empty-icon" />
                  <span>Run your code to see output here</span>
                  <span className="cs-console-empty-hint">Press <kbd>Run</kbd> in the toolbar</span>
                </div>
              )}
            </div>
          )}

          {/* ── Chat tab ── */}
          {rightTab === "chat" && (
            <div className="cs-chat-panel">
              <div className="cs-chat-messages">
                {messages.length === 0 ? (
                  <div className="cs-chat-empty-state">
                    <MessageSquare size={26} className="cs-empty-icon" />
                    <span>No messages yet</span>
                    <span className="cs-empty-hint">Say hello to your team</span>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`cs-chat-msg ${msg.sender === username ? "cs-chat-msg--mine" : "cs-chat-msg--theirs"}`}
                    >
                      <div className="cs-chat-bubble">
                        <p className="cs-chat-text">{msg.content}</p>
                      </div>
                      <span className="cs-chat-meta">{msg.sender} · {msg.timestamp}</span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="cs-chat-input-row">
                <input
                  className="cs-chat-input"
                  placeholder="Type a message…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                />
                <button className="cs-send-btn" onClick={sendMessage}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── Team chat mini (bottom of console/output) ── */}
          {(rightTab === "console" || rightTab === "output") && (
            <div className="cs-team-chat-mini">
              <p className="cs-sidebar-label cs-sidebar-label--padded">
                <MessageSquare size={9} />
                Team Chat
              </p>
              <div className="cs-mini-messages">
                {messages.slice(-5).map((msg, i) => (
                  <div key={i} className={`cs-mini-msg ${msg.sender === username ? "cs-mini-msg--mine" : ""}`}>
                    <div
                      className="cs-avatar cs-avatar--xs"
                      style={{ background: AVATAR_COLORS[users.indexOf(msg.sender) % AVATAR_COLORS.length] || "#6366f1" }}
                    >
                      {getInitials(msg.sender)}
                    </div>
                    <div className="cs-mini-bubble">
                      <p className="cs-mini-text">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="cs-sidebar-empty cs-sidebar-empty--padded">No messages yet</p>
                )}
              </div>
              <div className="cs-chat-input-row cs-chat-input-row--mini">
                <input
                  className="cs-chat-input"
                  placeholder="Type a message…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                />
                <button className="cs-send-btn" onClick={sendMessage}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}

        </aside>
      </div>
    </div>
  );
}

export default App;
