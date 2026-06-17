import "./App.css";
import { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import Editor from "@monaco-editor/react";

// Avatar colors for users
const AVATAR_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"
];

function getInitials(name) {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

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
    // Placeholder response for free-text chat — quick actions use runQuickAction() instead.
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
      body: JSON.stringify({
        roomId,
        code: value,
        language
      })
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
          body: JSON.stringify({
            sender: username,
            roomId: roomId
          })
        });

        try {

          const response =
              await fetch(
                  `http://localhost:8080/api/rooms/${roomId}`
              );

          if (response.ok) {

            const room =
                await response.json();

            if (room) {

              if (room.code) {
                setCode(room.code);
              }

              if (room.language) {
                setLanguage(room.language);
              }
            }
          }

        } catch (error) {

          console.error(
              "Failed to load room",
              error
          );
        }

        setStompClient(client);

        setJoined(true);

        alert(
            "Joined Room " +
            roomId
        );
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

  return (
    <div className="cs-app">

      {/* ── TOP NAVBAR ── */}
      <header className="cs-navbar">
        <div className="cs-navbar-left">
          <span className="cs-logo">
            <span className="cs-logo-icon">(/)</span>
            <span className="cs-logo-text">CodeSync</span>
          </span>

          {joined && (
            <div className="cs-live-pill">
              <span className="cs-live-dot" />
              <span>LIVE · {roomId}</span>
            </div>
          )}

          {!joined && (
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
              <span className="cs-online-count">{users.length} online</span>
              <button className="cs-btn cs-btn-run" onClick={runCode}>
                ▶ Run Code
              </button>
              <button className="cs-btn cs-btn-ghost" onClick={leaveRoom}>
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
          <div className="cs-sidebar-section">
            <p className="cs-sidebar-label">EXPLORER</p>
            <div className="cs-file-tab cs-file-tab--active">
              <span className="cs-file-icon">📄</span>
              <span>solution.{language === "python" ? "py" : language === "javascript" ? "js" : language === "cpp" ? "cpp" : "java"}</span>
            </div>
          </div>

          <div className="cs-sidebar-section">
            <p className="cs-sidebar-label">TEAM</p>
            {users.length === 0 ? (
              <p className="cs-sidebar-empty">No users online</p>
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

            {!joined && (
              <p className="cs-sidebar-empty">Join a room to see teammates</p>
            )}
          </div>
        </aside>

        {/* ── EDITOR PANEL ── */}
        <main className="cs-editor-panel">
          {/* File tabs row */}
          <div className="cs-editor-topbar">
            <div className="cs-file-tabs">
              <div className="cs-editor-filetab cs-editor-filetab--active">
                solution.{language === "python" ? "py" : language === "javascript" ? "js" : language === "cpp" ? "cpp" : "java"}
              </div>
            </div>

            <div className="cs-editor-controls">
              <div className="cs-lang-select-wrap">
                <select
                  className="cs-lang-select"
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value)}
                >
                  <option value="java">Java</option>
                  <option value="python">Python 3.11</option>
                  <option value="cpp">C++</option>
                  <option value="javascript">JavaScript</option>
                </select>
                <span className="cs-lang-caret">▾</span>
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

          {/* Tabs: Console / Output / Chat / Copilot */}
          <div className="cs-rtabs">
            {["console", "output", "chat", "copilot"].map(tab => (
              <button
                key={tab}
                className={`cs-rtab ${tab === "copilot" ? "cs-rtab--copilot" : ""} ${rightTab === tab ? "cs-rtab--active" : ""}`}
                onClick={() => setRightTab(tab)}
              >
                {tab === "copilot" ? "✦ Copilot" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Copilot tab content */}
          {rightTab === "copilot" && (
            <div className="cp-panel">
              <div className="cp-header">
                <div className="cp-header-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="cp-header-text">
                  <span className="cp-header-title">AI Copilot</span>
                  <span className="cp-header-sub">Powered by your code context</span>
                </div>
              </div>

              <div className="cp-quick-actions">
                <button className="cp-action-btn" onClick={() => runQuickAction("explain")} disabled={loadingAI}>
                  <span className="cp-action-icon">📖</span> Explain Code
                </button>
                <button className="cp-action-btn" onClick={() => runQuickAction("bugs")} disabled={loadingAI}>
                  <span className="cp-action-icon">🐞</span> Find Bugs
                </button>
                <button className="cp-action-btn" onClick={() => runQuickAction("optimize")} disabled={loadingAI}>
                  <span className="cp-action-icon">⚡</span> Optimize Code
                </button>
                <button className="cp-action-btn" onClick={() => runQuickAction("tests")} disabled={loadingAI}>
                  <span className="cp-action-icon">🧪</span> Generate Tests
                </button>
              </div>

              {codeAnalysis && (
                <div className="cp-analysis-card">
                  <div className="cp-analysis-header">
                    <span>Code Analysis</span>
                    <button className="cp-analysis-close" onClick={() => setCodeAnalysis(null)}>×</button>
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
                    {m.role === "ai" && <div className="cp-msg-avatar">✦</div>}
                    <div className="cp-msg-bubble">
                      <p className="cp-msg-text">{m.content}</p>
                    </div>
                  </div>
                ))}

                {copilotTyping && (
                  <div className="cp-msg cp-msg--ai">
                    <div className="cp-msg-avatar">✦</div>
                    <div className="cp-msg-bubble cp-typing">
                      {loadingAI ? (
                        <span className="cp-thinking-text">Thinking...</span>
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
                  placeholder="Ask about your code..."
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendCopilotMessage(); }}
                />
                <button className="cp-send-btn" onClick={sendCopilotMessage}>➤</button>
              </div>
            </div>
          )}

          {/* Console / Output tab content */}
          {(rightTab === "console" || rightTab === "output") && (
            <div className="cs-console">
              {output ? (
                <>
                  <div className="cs-console-run-line">
                    <span className="cs-console-run-icon">▶</span>
                    <span className="cs-console-run-label">
                      {language === "python" ? "python solution.py" : `run solution.${language === "java" ? "java" : language === "cpp" ? "cpp" : "js"}`}
                    </span>
                  </div>
                  <pre className="cs-console-output">{output}</pre>
                  {output !== "Running..." && (
                    <div className="cs-console-exit">
                      <span className="cs-exit-ok">✓</span> Exit code 0
                    </div>
                  )}
                </>
              ) : (
                <div className="cs-console-empty">
                  <span>Run your code to see output here</span>
                </div>
              )}
            </div>
          )}

          {/* Chat tab content */}
          {rightTab === "chat" && (
            <div className="cs-chat-panel">
              <div className="cs-chat-messages">
                {messages.length === 0 ? (
                  <div className="cs-chat-empty">No messages yet</div>
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
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                />
                <button className="cs-send-btn" onClick={sendMessage}>
                  ➤
                </button>
              </div>
            </div>
          )}

          {/* Team Chat compact — always visible at bottom when on console/output tab */}
          {(rightTab === "console" || rightTab === "output") && (
            <div className="cs-team-chat-mini">
              <p className="cs-sidebar-label" style={{ padding: "12px 16px 6px" }}>TEAM CHAT</p>
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
                  <p className="cs-sidebar-empty" style={{ padding: "8px 16px" }}>No messages yet</p>
                )}
              </div>
              <div className="cs-chat-input-row" style={{ borderTop: "1px solid #2a2a3a", padding: "10px 12px" }}>
                <input
                  className="cs-chat-input"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                />
                <button className="cs-send-btn" onClick={sendMessage}>➤</button>
              </div>
            </div>
          )}

        </aside>
      </div>
    </div>
  );
}

export default App;
