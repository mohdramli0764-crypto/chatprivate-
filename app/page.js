"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function timeLeftLabel(createdAt) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, DAY_MS - (Date.now() - new Date(createdAt).getTime()));
  if (remaining <= 0) return "kedaluwarsa";
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  if (h >= 1) return `${h} jam lagi`;
  return `${m} menit lagi`;
}

function pctLeft(createdAt) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, DAY_MS - (Date.now() - new Date(createdAt).getTime()));
  return Math.max(0, Math.min(100, (remaining / DAY_MS) * 100));
}

export default function Page() {
  const [screen, setScreen] = useState("landing");
  const [nickname, setNickname] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/messages?room=${encodeURIComponent(roomCode)}`);
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } catch (e) {
      // koneksi gagal, coba lagi di polling berikutnya
    }
  }, [roomCode]);

  useEffect(() => {
    if (screen === "chat") {
      loadMessages();
      pollRef.current = setInterval(loadMessages, 3000);
      return () => clearInterval(pollRef.current);
    }
  }, [screen, loadMessages]);

  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function joinRoom(code, createNew) {
    const finalCode = createNew ? makeRoomCode() : code.trim().toUpperCase();
    if (!nickname.trim()) {
      setError("Isi nama panggilan dulu.");
      return;
    }
    if (!finalCode) {
      setError("Isi kode ruangan atau buat yang baru.");
      return;
    }
    setError("");
    setRoomCode(finalCode);
    setScreen("chat");
  }

  async function sendMessage(mediaDataUrl, mediaType) {
    if (!text.trim() && !mediaDataUrl) return;
    const payload = {
      room: roomCode,
      sender: nickname,
      text: text.trim(),
      mediaDataUrl: mediaDataUrl || null,
      mediaType: mediaType || null,
    };
    setText("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim pesan.");
        return;
      }
      setMessages((prev) => [...prev, data.message]);
    } catch (e) {
      setError("Gagal mengirim pesan. Cek koneksi kamu.");
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Hanya file foto atau video yang didukung.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Ukuran file terlalu besar (maks ~1.5MB di tier gratis).");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => sendMessage(reader.result, file.type.startsWith("image/") ? "image" : "video");
    reader.readAsDataURL(file);
  }

  function copyCode() {
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function leaveRoom() {
    clearInterval(pollRef.current);
    setScreen("landing");
    setRoomCode("");
    setMessages([]);
    setRoomInput("");
  }

  return (
    <div className="wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');

        * { box-sizing: border-box; }
        html, body { height: 100%; }
        .wrap {
          --bg: #171522;
          --surface: #201D2E;
          --surface-2: #262238;
          --ember: #E8A24C;
          --ember-dim: #8A6435;
          --text: #F2EFE9;
          --text-muted: #A29CB8;
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          display: flex;
          justify-content: center;
        }
        .frame { width: 100%; max-width: 460px; min-height: 100vh; display: flex; flex-direction: column; }

        .landing { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 32px 28px; }
        .brand { font-family: 'Fraunces', serif; font-size: 40px; font-weight: 600; line-height: 1.05; margin: 0 0 6px; }
        .brand-sub { color: var(--text-muted); font-size: 14px; margin: 0 0 36px; line-height: 1.5; max-width: 34ch; }
        .field-label { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; display: block; }
        .field { width: 100%; background: var(--surface); border: 1px solid var(--surface-2); color: var(--text); border-radius: 10px; padding: 12px 14px; font-size: 15px; font-family: inherit; margin-bottom: 18px; }
        .field:focus { outline: none; border-color: var(--ember-dim); }
        .btn-primary { width: 100%; background: var(--ember); color: #201205; border: none; border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; margin-bottom: 12px; }
        .btn-ghost { width: 100%; background: transparent; color: var(--text-muted); border: 1px solid var(--surface-2); border-radius: 10px; padding: 12px; font-size: 14px; font-family: inherit; cursor: pointer; }
        .divider-row { display: flex; align-items: center; gap: 12px; margin: 20px 0; color: var(--text-muted); font-size: 13px; }
        .divider-row::before, .divider-row::after { content: ''; flex: 1; height: 1px; background: var(--surface-2); }
        .err { color: var(--ember); font-size: 13px; margin: -8px 0 16px; }
        .fine-print { color: var(--text-muted); font-size: 12px; line-height: 1.6; margin-top: 28px; }

        .chat-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--surface-2); }
        .room-tag { font-family: 'Fraunces', serif; font-size: 20px; letter-spacing: 1px; }
        .room-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .code-btn { background: var(--surface); border: 1px solid var(--surface-2); color: var(--text-muted); font-size: 12px; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-family: inherit; }
        .leave-btn { background: none; border: none; color: var(--text-muted); font-size: 13px; cursor: pointer; font-family: inherit; margin-top: 8px; padding: 0; }

        .messages { flex: 1; overflow-y: auto; padding: 18px 16px; display: flex; flex-direction: column; gap: 14px; }
        .empty-state { margin: auto; text-align: center; color: var(--text-muted); font-size: 14px; max-width: 26ch; line-height: 1.6; }

        .msg-row { display: flex; flex-direction: column; max-width: 78%; }
        .msg-row.mine { align-self: flex-end; align-items: flex-end; }
        .msg-row.theirs { align-self: flex-start; align-items: flex-start; }
        .msg-sender { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; padding: 0 2px; }
        .bubble { border-radius: 14px; padding: 10px 13px; font-size: 14.5px; line-height: 1.45; }
        .msg-row.mine .bubble { background: var(--ember); color: #201205; border-bottom-right-radius: 4px; }
        .msg-row.theirs .bubble { background: var(--surface); border-bottom-left-radius: 4px; }
        .bubble img, .bubble video { max-width: 100%; border-radius: 8px; display: block; margin-bottom: 6px; }
        .msg-foot { display: flex; align-items: center; gap: 6px; margin-top: 4px; padding: 0 2px; }
        .ember-track { width: 44px; height: 3px; border-radius: 2px; background: var(--surface-2); overflow: hidden; }
        .ember-fill { height: 100%; background: var(--ember); }
        .time-left { font-size: 10.5px; color: var(--text-muted); }

        .composer { border-top: 1px solid var(--surface-2); padding: 12px 14px; display: flex; align-items: flex-end; gap: 8px; }
        .attach-btn { background: var(--surface); border: 1px solid var(--surface-2); color: var(--text-muted); width: 42px; height: 42px; border-radius: 10px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .text-input { flex: 1; background: var(--surface); border: 1px solid var(--surface-2); color: var(--text); border-radius: 10px; padding: 11px 14px; font-size: 14.5px; font-family: inherit; resize: none; max-height: 100px; }
        .text-input:focus { outline: none; border-color: var(--ember-dim); }
        .send-btn { background: var(--ember); color: #201205; border: none; width: 42px; height: 42px; border-radius: 10px; cursor: pointer; font-weight: 600; flex-shrink: 0; }
        .send-btn:disabled { opacity: 0.4; cursor: default; }
      `}</style>

      <div className="frame">
        {screen === "landing" ? (
          <div className="landing">
            <h1 className="brand">Sekejap</h1>
            <p className="brand-sub">Ruang obrolan pribadi. Setiap pesan padam sendiri setelah 24 jam.</p>

            <label className="field-label">Nama panggilan</label>
            <input className="field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="mis. Rani" maxLength={20} />

            <label className="field-label">Kode ruangan (jika sudah punya)</label>
            <input className="field" value={roomInput} onChange={(e) => setRoomInput(e.target.value.toUpperCase())} placeholder="mis. K7QX2M" maxLength={8} />

            {error && <div className="err">{error}</div>}

            <button className="btn-primary" onClick={() => joinRoom(roomInput, false)}>Masuk ruangan</button>

            <div className="divider-row">atau</div>

            <button className="btn-ghost" onClick={() => joinRoom(null, true)}>Buat ruangan baru</button>

            <p className="fine-print">
              Bagikan kode ruangan hanya ke orang yang kamu percaya — siapa pun yang tahu kodenya bisa membaca chat.
            </p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div>
                <div className="room-tag">{roomCode}</div>
                <div className="room-meta">masuk sebagai {nickname}</div>
                <button className="leave-btn" onClick={leaveRoom}>Keluar ruangan</button>
              </div>
              <button className="code-btn" onClick={copyCode}>{copied ? "Tersalin" : "Salin kode"}</button>
            </div>

            <div className="messages">
              {messages.length === 0 && (
                <div className="empty-state">Belum ada pesan. Bagikan kode <strong>{roomCode}</strong> ke orang yang kamu ajak ngobrol, lalu mulai kirim pesan.</div>
              )}
              {messages.map((m) => {
                const mine = m.sender === nickname;
                return (
                  <div key={m.id} className={`msg-row ${mine ? "mine" : "theirs"}`}>
                    {!mine && <div className="msg-sender">{m.sender}</div>}
                    <div className="bubble">
                      {m.media_url && m.media_type === "image" && <img src={m.media_url} alt="lampiran" />}
                      {m.media_url && m.media_type === "video" && <video src={m.media_url} controls />}
                      {m.body && <div>{m.body}</div>}
                    </div>
                    <div className="msg-foot">
                      <div className="ember-track"><div className="ember-fill" style={{ width: `${pctLeft(m.created_at)}%` }} /></div>
                      <div className="time-left">{timeLeftLabel(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {error && <div className="err" style={{ padding: "0 16px" }}>{error}</div>}

            <div className="composer">
              <button className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Kirim foto/video">📎</button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFile} />
              <textarea
                className="text-input"
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Tulis pesan..."
              />
              <button className="send-btn" onClick={() => sendMessage()} disabled={!text.trim()}>➤</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
  }
