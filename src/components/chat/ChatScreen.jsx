import { useState, useEffect, useRef } from "react";
import { FiSend, FiUpload, FiHome, FiPlus } from "react-icons/fi";
import { BsStars } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import ReactMarkdown from "react-markdown";
import "sweetalert2/dist/sweetalert2.min.css";

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [lastQuestionContext, setLastQuestionContext] = useState("");
  const [caseStarted, setCaseStarted] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) navigate("/login");
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages, isBotTyping]);

  const typeText = (text, callback) => {
    let i = 0;
    setTypingText("");
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypingText((prev) => prev + text[i]);
        i++;
      } else {
        clearInterval(interval);
        callback();
      }
    }, 10);
  };

  const convertHtmlToMarkdown = (html) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const format = [];
    format.push("## 🧠 Preliminary Medical Report\n\n");
    const disclaimer = temp.querySelector("p b")?.parentElement?.textContent;
    if (disclaimer) format.push(`> ⚠️ **${disclaimer}**\n\n`);
    const sections = temp.querySelectorAll("h2");
    sections.forEach((section) => {
      const heading = section.textContent;
      format.push(`---\n\n### ${heading}\n\n`);
      let next = section.nextElementSibling;
      while (next && next.tagName !== "H2") {
        if (next.tagName === "P") {
          format.push(`${next.textContent}\n\n`);
        } else if (next.tagName === "UL") {
          const items = [...next.querySelectorAll("li")].map((li) => `- ${li.textContent}`).join("\n");
          format.push(`${items}\n\n`);
        } else if (next.tagName === "OL") {
          const items = [...next.querySelectorAll("li")].map((li, i) => `${i + 1}. ${li.textContent}`).join("\n");
          format.push(`${items}\n\n`);
        }
        next = next.nextElementSibling;
      }
    });
    return format.join("\n");
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setIsBotTyping(true);

    if (!caseStarted && userMessage.toLowerCase().includes("new case")) {
      setCaseStarted(true);
    } else if (!caseStarted) {
      setMessages((prev) => [...prev, { role: "bot", text: "❌ Please start with \"new case\" to initiate." }]);
      setIsBotTyping(false);
      return;
    }

    try {
      const res = await fetch("https://prognos-deploy.onrender.com/api/receive/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, question: lastQuestionContext })
      });

      const data = await res.json();
      const receivedText = data.received || "⚠️ No message received from backend.";
      let cleanText = receivedText;

      if (receivedText.includes("<!DOCTYPE html>")) {
        localStorage.setItem("finalReportHTML", receivedText);
        cleanText = convertHtmlToMarkdown(receivedText);
      }

      setLastQuestionContext(data.question || "");

      typeText(cleanText, () => {
        setMessages((prev) => [...prev, { role: "bot", text: cleanText }]);
        setTypingText("");
        setIsBotTyping(false);
      });
    } catch (err) {
      console.error("API error:", err);
      setMessages((prev) => [...prev, { role: "bot", text: "❌ Failed to get response." }]);
      setIsBotTyping(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setLastQuestionContext("");
    setCaseStarted(false);
    localStorage.removeItem("finalReportHTML");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const ext = file.name.split(".").pop().toLowerCase();
    const type = file.type.startsWith("image/") ? "image" : "file";
    const iconMap = {
      pdf: "📄", doc: "📝", docx: "📝", ppt: "📊", xls: "📊", xlsx: "📊", zip: "🗜️", txt: "📄", default: "📎"
    };
    const icon = iconMap[ext] || iconMap.default;
    setMessages((prev) => [...prev, { role: "user", text: type === "file" ? `${icon} ${file.name}` : "", file: { url, name: file.name, type, icon } }]);
  };

  const tags = ["Asthma", "HIV/AIDS", "diabetes", "stroke", "heart diseases"];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-40 h-40 bg-purple-600 blur-3xl opacity-10 rounded-full animate-float-slow" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-pink-500 blur-3xl opacity-10 rounded-full animate-float-slow" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center gap-10 text-sm text-gray-400 mb-4 border-b border-white/10 pb-2 w-full max-w-3xl mx-auto z-10 pt-6">
        <button className="border-b-2 border-white text-white pb-1">Chat</button>
        <button onClick={() => navigate("/report")} className="hover:text-white transition">Report</button>
        <button onClick={() => {
          Swal.fire({
            title: "Log out?",
            text: "Are you sure you want to log out?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, log out",
            background: "#1f1f1f",
            color: "#fff",
          }).then((result) => {
            if (result.isConfirmed) {
              localStorage.removeItem("user");
              navigate("/login");
            }
          });
        }} className="text-red-400 hover:text-red-300 transition">Logout</button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-6">
        <div className="bg-[#151515] p-5 rounded-full shadow-2xl border border-white/5 w-fit mx-auto mb-3">
          <BsStars size={36} className="text-purple-500" />
        </div>
        <h1 className="text-xl font-semibold text-gray-100">Chat with AI Assistant</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap justify-center gap-2 max-w-3xl mb-4 mx-auto">
        {tags.map((tag, i) => (
          <div key={i} className="px-3 py-1 bg-white/10 text-xs rounded-full text-gray-300">{tag}</div>
        ))}
      </motion.div>

      <div className="w-full max-w-3xl mx-auto flex-1 overflow-hidden mb-4 px-2">
        <div className="h-[55vh] overflow-y-auto space-y-4 px-1 custom-scrollbar">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="flex items-end gap-2 max-w-[70%] break-words">
                <div className="w-8 h-8 text-sm rounded-full flex items-center justify-center font-bold bg-white/10">{msg.role === "user" ? "🧑" : "🤖"}</div>
                <div className={`rounded-xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${msg.role === "user" ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-br-none" : "bg-white/10 text-gray-200 rounded-bl-none"}`}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}

          {isBotTyping && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2 max-w-[80%]">
                <div className="w-8 h-8 text-sm rounded-full flex items-center justify-center font-bold bg-white/10">🤖</div>
                <div className="rounded-xl px-4 py-2 text-sm bg-white/10 text-gray-200 rounded-bl-none whitespace-pre-line">
                  <ReactMarkdown>{typingText}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto  mb-6 px-2">
        <div className="flex items-center gap-2 mb-2">
          <label className="cursor-pointer flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm">
            <FiUpload />
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={handleNewChat} className="ml-auto text-sm text-white px-3 py-1 rounded-lg border border-white/20 hover:bg-white/5 flex items-center gap-2">
            <FiPlus /> New Chat
          </button>
          <button onClick={() => navigate("/")} className="text-purple-400 hover:text-purple-300 transition flex items-center gap-1 text-sm border border-white/10 px-3 py-1 rounded-lg">
            <FiHome size={16} /> Home
          </button>
        </div>

        <form onSubmit={handleSend} className="flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 bg-transparent text-white text-sm px-2 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="text-purple-400 hover:text-purple-300 transition">
            <FiSend size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
