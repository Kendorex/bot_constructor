import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import FlowBuilder from './FlowBuilder';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function BotManager() {
  const [bots, setBots] = useState([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [usersLoading, setUsersLoading] = useState({});
  const [activeUsers, setActiveUsers] = useState({});
  const [selectedBot, setSelectedBot] = useState(null);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/bots/`);
      const data = response.data.results || response.data;
      setBots(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch bots. ' + (err.response?.data?.message || err.message));
      console.error('Error:', err);
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const validateToken = (token) => {
    // Проверяем формат токена: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
    const tokenRegex = /^\d+:[a-zA-Z0-9_-]+$/;
    return tokenRegex.test(token);
  };
  
  const addBot = async () => {
    const trimmedToken = token.trim();
    
    if (!trimmedToken) {
      setError('Please enter a bot token');
      return;
    }
    
    if (!validateToken(trimmedToken)) {
      setError('Invalid token format. Expected format: "123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"');
      return;
    }
  
    try {
      setLoading(true);
      // Создаем объект с токеном и пустой конфигурацией
      await axios.post(`${API_BASE_URL}/api/bots/`, { 
        token: token.trim(),
        config: {},  // Добавляем пустую конфигурацию
        is_active: false  // По умолчанию бот неактивен
      });
      setToken('');
      await fetchBots();
      setError(null);
    } catch (err) {
      let errorMessage = 'Failed to add bot';
      if (err.response) {
        if (err.response.data) {
          errorMessage = err.response.data.error || 
                         err.response.data.message || 
                         JSON.stringify(err.response.data);
        } else {
          errorMessage = `Server responded with status ${err.response.status}`;
        }
      } else {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Error adding bot:', err);
    }};

  const handleBotAction = async (botId, action) => {
    try {
      setActionLoading(prev => ({ ...prev, [botId]: true }));
      await axios.post(`${API_BASE_URL}/api/bots/${botId}/${action}/`, {});
      
      setBots(prevBots => prevBots.map(bot => 
        bot.id === botId 
          ? { ...bot, is_active: action === 'start' } 
          : bot
      ));
      
      await fetchBots();
    } catch (err) {
      setError(`Failed to ${action} bot: ${err.response?.data?.message || err.message}`);
      await fetchBots();
    } finally {
      setActionLoading(prev => ({ ...prev, [botId]: false }));
    }
  };

  const fetchActiveUsers = async (botId) => {
    try {
      setUsersLoading(prev => ({ ...prev, [botId]: true }));
      const response = await axios.get(`${API_BASE_URL}/api/bots/${botId}/active_users/`);
      
      setActiveUsers(prev => ({
        ...prev,
        [botId]: response.data
      }));
    } catch (err) {
      setError(`Failed to fetch users: ${err.response?.data?.message || err.message}`);
    } finally {
      setUsersLoading(prev => ({ ...prev, [botId]: false }));
    }
  };

  const saveBotConfig = async (botId, config) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/bots/${botId}/`, { config });
      setBots(prevBots => prevBots.map(bot => 
        bot.id === botId ? { ...bot, config } : bot
      ));
      alert('Конфигурация сохранена!');
    } catch (err) {
      setError(`Failed to save config: ${err.response?.data?.message || err.message}`);
    }
  };

    return (
    <DndProvider backend={HTML5Backend}>
      <div className="bot-manager">
        <h1>Telegram Bot Manager</h1>
        
        {error && <div className="alert error">{error}</div>}
        
        {selectedBot ? (
          <div className="back-button">
            <button onClick={() => setSelectedBot(null)} className="btn back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Назад к списку ботов
            </button>
          </div>
        ) : (
          <div className="card">
            <h2>Add New Bot</h2>
            <div className="input-group">
              <input 
                type="text" 
                value={token} 
                onChange={(e) => setToken(e.target.value)} 
                placeholder="Enter bot token like '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'"
                disabled={loading}
              />
              <button 
                onClick={addBot} 
                disabled={loading || !token.trim()}
                className="addbtn"
              >
                {loading ? 'Adding...' : 'Add Bot'}
              </button>
            </div>
          </div>
        )}
        
        <div className="card">
          <h2>Your Bots</h2>
          {loading && !bots.length ? (
            <div className="loader">Loading bots...</div>
          ) : bots.length === 0 ? (
            <p className="empty-message">No bots added yet</p>
          ) : selectedBot ? (
            <FlowBuilder 
              bot={bots.find(b => b.id === selectedBot)} 
              onSave={saveBotConfig}
            />
          ) : (
            <div className="bot-grid">
              {bots.map(bot => (
                <div key={bot.id} className="bot-card">
                  <div className="bot-info">
                    <span className="bot-name">{bot.name || `Bot #${bot.id}`}</span>
                    <span className={`status-badge ${bot.is_active ? 'active' : 'inactive'}`}>
                      {bot.is_active ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                  </div>
                  <div className="bot-actions">
                    <button
                      onClick={() => handleBotAction(bot.id, 'start')}
                      disabled={bot.is_active || actionLoading[bot.id]}
                      className={`btn ${bot.is_active ? 'disabled' : 'success'}`}
                    >
                      {actionLoading[bot.id] ? (
                        <span className="spinner"></span>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                          Start
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleBotAction(bot.id, 'stop')}
                      disabled={!bot.is_active || actionLoading[bot.id]}
                      className={`btn ${!bot.is_active ? 'disabled' : 'danger'}`}
                    >
                      {actionLoading[bot.id] ? (
                        <span className="spinner"></span>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                          </svg>
                          Stop
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedBot(bot.id)}
                      className="btn primary"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      Configure
                    </button>
                    <button
                      onClick={() => handleBotAction(bot.id)}
                      className="btn warning"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Delete
                    </button>
                    <button
                      onClick={() => handleBotAction(bot.id)}
                      className="btn info"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download
                    </button>
                  </div>
                  {activeUsers[bot.id] && (
                    <div className="users-list">
                      <h4>Active Users ({activeUsers[bot.id].length}):</h4>
                      <ul>
                        {activeUsers[bot.id].map(user => (
                          <li key={user.id}>
                            {user.first_name} {user.last_name} 
                            {user.username && ` (@${user.username})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}

export default BotManager;