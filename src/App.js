import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const App = () => {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const backendUrl = 'http://13.234.31.155/';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${backendUrl}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question) {
      setError('Please enter a question');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${backendUrl}/ask`, { question });
      const newChat = { question, response: res.data };
      setChatHistory([...chatHistory, newChat]);
      setQuestion('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (response) => {
    if (!response || response.graph_needed !== 'yes') return null;

    const { graph_type, data_array } = response;
    if (!data_array || data_array.length === 0) {
      return <p className="no-data">No valid data available for chart</p>;
    }

    const chartData = {
      labels: [],
      datasets: [],
    };
    const options = {
      responsive: true,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: { position: 'top', labels: { color: '#000' } },
        title: { 
          display: true, 
          text: `${graph_type.replace('_', ' ').toUpperCase()} - Analysis`,
          color: '#000',
          font: { size: 16 }
        },
        tooltip: { enabled: true },
      },
      scales: {
        y: { 
          beginAtZero: true, 
          title: { display: true, text: 'Value', color: '#000' },
          ticks: { color: '#000' }
        },
        x: { 
          title: { display: true, text: 'Categories', color: '#000' },
          ticks: { color: '#000' }
        },
      },
    };

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
      '#D4A5A5', '#9B59B6', '#3498DB', '#E74C3C', '#2ECC71'
    ];

    switch (graph_type) {
      case 'line_chart':
        chartData.labels = data_array.map(item => item.month || Object.keys(item)[0]);
        chartData.datasets = [{
          label: 'Value Over Time',
          data: data_array.map(item => item.value || Object.values(item)[1]),
          borderColor: colors[0],
          backgroundColor: `${colors[0]}33`,
          fill: true,
          tension: 0.4,
        }];
        return <Line data={chartData} options={options} />;

      case 'bar_chart':
        chartData.labels = data_array.map(item => item.Model || item.category || Object.keys(item)[0]);
        const barKeys = Object.keys(data_array[0]).filter(
          key => key !== 'Model' && key !== 'category' && data_array[0][key] !== null
        );
        chartData.datasets = barKeys.map((key, idx) => ({
          label: key,
          data: data_array.map(item => item[key]),
          backgroundColor: colors[idx % colors.length],
          borderColor: colors[idx % colors.length],
          borderWidth: 1,
        }));
        return <Bar data={chartData} options={options} />;

      case 'stack_bar_chart':
        chartData.labels = data_array.map(item => item.category || Object.keys(item)[0]);
        const stackKeys = Object.keys(data_array[0]).filter(
          key => key !== 'category' && data_array[0][key] !== null
        );
        chartData.datasets = stackKeys.map((key, idx) => ({
          label: key,
          data: data_array.map(item => item[key]),
          backgroundColor: colors[idx % colors.length],
          stack: 'Stack 0',
        }));
        options.scales.x = { stacked: true };
        options.scales.y = { stacked: true };
        return <Bar data={chartData} options={options} />;

      default:
        return <p className="no-data">Unsupported graph type: {graph_type}</p>;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Annual Report Analyzer</h1>
      </header>

      <main className="app-main">
        <div className="upload-container">
          <input 
            type="file" 
            accept=".pdf" 
            onChange={handleFileChange} 
            className="file-input"
          />
          <button 
            onClick={handleUpload} 
            disabled={loading} 
            className="action-btn upload-btn"
          >
            {loading ? <span className="spinner"></span> : 'Upload PDF'}
          </button>
        </div>

        <div className="chat-container">
          <div className="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="empty-chat">Ask me anything about your report!</div>
            ) : (
              chatHistory.map((chat, idx) => (
                <div key={idx} className="message-group">
                  <div className="message user-message">
                    <span className="message-content">{chat.question}</span>
                  </div>
                  <div className="message ai-message">
                    <span className="message-content">{chat.response.text_answer}</span>
                    {chat.response.table_data && (
                      <pre className="table-data">
                        {JSON.stringify(chat.response.table_data, null, 2)}
                      </pre>
                    )}
                    {chat.response.graph_needed === 'yes' && (
                      <div className="chart-wrapper">
                        {renderChart(chat.response)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your report..."
              disabled={loading}
              onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
            />
            <button 
              onClick={handleAskQuestion} 
              disabled={loading} 
              className="action-btn send-btn"
            >
              {loading ? <span className="spinner"></span> : 'Send'}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
      </main>
    </div>
  );
};

export default App;
