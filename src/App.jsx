import { useState, useEffect, useRef } from 'react';
import { subscribeToVitals } from './firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Activity, Heart, MapPin, AlertTriangle, Send, User, Bot, Navigation } from 'lucide-react';

// ✅ Use Environment Variable for API Key (Set this in Vercel project settings)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function App() {
  const [vitals, setVitals] = useState({
    bpm: 0,
    fall: 0,
    lat: 0,
    lon: 0,
    spo2: 0
  });

  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: "Hello Senthil. I am your Smart Care medical assistant. How can I help you regarding your vitals today?"
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    subscribeToVitals((data) => {
      setVitals(data);
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // ✅🔥 FIXED CHAT FUNCTION
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (!genAI) {
        throw new Error("Missing VITE_GEMINI_API_KEY environment variable. Please configure it in your Vercel project settings.");
      }

      // ✅ Create a contextual model specifically for this turn to inject latest vitals silently
      const contextualModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: `You are a highly professional, empathetic medical assistant for Senthil kumar.

Real-time vitals:
SpO2: ${vitals.spo2}%
Heart Rate: ${vitals.bpm} BPM
Fall Detected: ${vitals.fall ? "YES" : "NO"}
Location: ${vitals.lat}, ${vitals.lon}

Instructions:
- Give short and clear answers
- Warn if vitals are abnormal
- Suggest doctor if needed
- Be supportive`
      });

      // ✅ Proper history format (Must skip the initial model greeting since Gemini requires history to start with 'user')
      const historyMessages = messages.slice(1).map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // ✅ Gemini API Call using startChat
      const chat = contextualModel.startChat({
        history: historyMessages
      });

      const result = await chat.sendMessage(userMessage);

      // ✅ Safe response extraction
      const text = result.response.text();

      setMessages(prev => [
        ...prev,
        { role: 'model', content: text }
      ]);

    } catch (error) {
      console.error("🔥 Gemini Error:", error);

      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: "⚠️ I'm having trouble connecting right now. Please check your API key or network."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="dashboard-header">
        <div className="header-top">
          <div className="app-title">
            <Activity className="icon" />
            Smart Care
          </div>
          <div className="user-welcome">
            Monitoring <span>Senthil kumar</span>
          </div>
        </div>

        <div className="vitals-grid">

          {/* SpO2 */}
          <div className={`vital-card ${vitals.spo2 < 90 ? 'danger' : (vitals.spo2 < 95 ? 'warning' : 'normal')}`}>
            <div className="card-header">
              <Activity className="card-icon" style={{ color: 'var(--accent-secondary)' }} />
              Blood Oxygen (SpO2)
            </div>
            <div className="card-value">
              {vitals.spo2} <span className="card-unit">%</span>
            </div>
          </div>

          {/* BPM */}
          <div className={`vital-card ${(vitals.bpm < 60 || vitals.bpm > 100) ? 'warning' : 'normal'}`}>
            <div className="card-header">
              <Heart className="card-icon" style={{ color: 'var(--danger)' }} />
              Heart Rate (BPM)
            </div>
            <div className="card-value">
              {vitals.bpm} <span className="card-unit">bpm</span>
            </div>
          </div>

          {/* FALL */}
          <div className={`vital-card ${vitals.fall ? 'danger' : 'normal'}`}>
            <div className="card-header">
              <AlertTriangle className="card-icon" style={{ color: vitals.fall ? 'var(--danger)' : 'var(--text-muted)' }} />
              Fall Detection
            </div>
            <div className="card-value" style={{ fontSize: '1.5rem' }}>
              {vitals.fall ? "Fall Detected!" : "Safe"}
            </div>
          </div>

          {/* LOCATION */}
          <div className="vital-card info">
            <div className="card-header">
              <MapPin className="card-icon" style={{ color: 'var(--accent-primary)' }} />
              Current Location
            </div>
            <div className="card-value">
              {vitals.lat ? vitals.lat.toFixed(4) : 0}, {vitals.lon ? vitals.lon.toFixed(4) : 0}
            </div>
            <a
              href={`https://www.google.com/maps?q=${vitals.lat},${vitals.lon}`}
              target="_blank"
              rel="noreferrer"
              className="btn-map"
            >
              <Navigation size={18} /> View on Maps
            </a>
          </div>

        </div>
      </header>

      <main className="chat-container">

        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role === 'model' ? 'ai' : 'user'}`}>
              <div className="message-avatar">
                {msg.role === 'model' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className="message-content">
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message ai">
              <Bot size={20} />
              <p>Typing...</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <form onSubmit={handleSendMessage} className="chat-input-wrapper">
            <input
              type="text"
              placeholder="Ask your medical assistant..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="chat-input"
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="btn-send">
              <Send size={20} />
            </button>
          </form>
        </div>

      </main>
    </>
  );
}

export default App;