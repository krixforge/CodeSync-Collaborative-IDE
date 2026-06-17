
import { useState } from "react";
import { Code2, Users, Zap, ArrowRight, Copy, Check } from "lucide-react";
import "./Home.css";



function Home({ onJoin }) {
    const [roomId, setRoomId] = useState("");
    const [username, setUsername] = useState("");
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState("join"); // "join" | "create"

    const createRoom = () => {
        const id = crypto.randomUUID().slice(0, 8);
        setRoomId(id);
        setActiveTab("join");
    };

    const handleCopyRoomId = () => {
        if (!roomId) return;
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div className="home-root">
            {/* Ambient background blobs */}
            <div className="home-blob home-blob--1" />
            <div className="home-blob home-blob--2" />
            <div className="home-blob home-blob--3" />

            {/* Top nav strip */}
            <nav className="home-nav">
                <div className="home-nav-logo">
                    <span className="home-nav-logo-icon">
                        <Code2 size={16} />
                    </span>
                    <span className="home-nav-logo-text">CodeSync</span>
                </div>
                <div className="home-nav-badge">
                    <span className="home-nav-dot" />
                    Real-time collaboration
                </div>
            </nav>

            {/* Hero */}
            <main className="home-main">
                <div className="home-hero">
                    <div className="home-eyebrow">
                        <Zap size={12} />
                        Powered by WebSockets + AI
                    </div>

                    <h1 className="home-headline">
                        Code together,<br />
                        <span className="home-headline-accent">ship faster.</span>
                    </h1>

                    <p className="home-subline">
                        Collaborative IDE with live sync, team chat,
                        and an AI copilot that actually understands your code.
                    </p>
                </div>

                {/* Card */}
                <div className="home-card">
                    {/* Tab switcher */}
                    <div className="home-tabs">
                        <button
                            className={`home-tab ${activeTab === "join" ? "home-tab--active" : ""}`}
                            onClick={() => setActiveTab("join")}
                        >
                            <Users size={13} />
                            Join Room
                        </button>
                        <button
                            className={`home-tab ${activeTab === "create" ? "home-tab--active" : ""}`}
                            onClick={() => { setActiveTab("create"); createRoom(); }}
                        >
                            <Code2 size={13} />
                            New Room
                        </button>
                    </div>

                    <div className="home-card-body">
                        {activeTab === "create" && roomId && (
                            <div className="home-room-generated">
                                <span className="home-room-generated-label">Room created</span>
                                <div className="home-room-id-display">
                                    <span className="home-room-id-value">{roomId}</span>
                                    <button
                                        className="home-copy-btn"
                                        onClick={handleCopyRoomId}
                                        title="Copy room ID"
                                    >
                                        {copied ? <Check size={13} /> : <Copy size={13} />}
                                    </button>
                                </div>
                                <p className="home-room-generated-hint">
                                    Share this ID with your teammates to collaborate.
                                </p>
                            </div>
                        )}

                        <div className="home-fields">
                            <div className="home-field-group">
                                <label className="home-label">Room ID</label>
                                <input
                                    className="home-input"
                                    placeholder="e.g. a1b2c3d4"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                            </div>

                            <div className="home-field-group">
                                <label className="home-label">Your name</label>
                                <input
                                    className="home-input"
                                    placeholder="Display name"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <button
                            className="home-join-btn"
                            onClick={() => onJoin(roomId, username)}
                            disabled={!roomId || !username}
                        >
                            Enter Room
                            <ArrowRight size={15} />
                        </button>

                        {activeTab === "join" && (
                            <p className="home-create-hint">
                                No room yet?{" "}
                                <button
                                    className="home-create-link"
                                    onClick={() => { setActiveTab("create"); createRoom(); }}
                                >
                                    Generate one instantly
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                {/* Feature pills */}
                <div className="home-features">
                    <div className="home-feature">
                        <span className="home-feature-dot home-feature-dot--green" />
                        Live code sync
                    </div>
                    <div className="home-feature">
                        <span className="home-feature-dot home-feature-dot--purple" />
                        AI copilot
                    </div>
                    <div className="home-feature">
                        <span className="home-feature-dot home-feature-dot--blue" />
                        Team chat
                    </div>
                    <div className="home-feature">
                        <span className="home-feature-dot home-feature-dot--amber" />
                        Code execution
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Home;
