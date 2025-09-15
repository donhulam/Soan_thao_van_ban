import React, { useState, useEffect, useRef } from 'react';
import type { Content } from '@google/genai';
import { generateChatResponseStream } from '../services/geminiService';
import SendIcon from './icons/SendIcon';
import ChevronUpIcon from './icons/ChevronUpIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import AIIcon from './icons/AIIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatbotProps {
  generatedSpeech: string;
  onSpeechUpdate: (newSpeech: string, isFinal?: boolean) => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ generatedSpeech, onSpeechUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // This effect runs when the component mounts (i.e., when a new document session starts via `key` prop)
    if (generatedSpeech) {
      setMessages([
        {
          role: 'model',
          text: 'Xin chào! Bạn muốn chỉnh sửa hay cải thiện điều gì trong văn bản này không?',
        },
      ]);
      setIsExpanded(true); // Automatically expand when a new speech is ready
    } else {
        setMessages([]);
        setIsExpanded(false);
    }
  }, []); // Note: This intentionally has an empty dependency array. It relies on the `key` prop on the component in App.tsx to re-mount and reset state.

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isExpanded) {
      // Use a short timeout to ensure the input is rendered and visible before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: userInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setUserInput('');
    setIsLoading(true);

    // Convert our Message[] to Gemini's Content[] for the API
    const historyForAPI: Content[] = updatedMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    try {
      const stream = await generateChatResponseStream(historyForAPI, generatedSpeech);
      
      let modelResponse = '';
      setMessages((prev) => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = modelResponse;
          return newMessages;
        });
        onSpeechUpdate(modelResponse, false); // Real-time preview update
      }

      // After the stream is complete, update the main speech content in the parent
      if (modelResponse.trim()) {
        onSpeechUpdate(modelResponse.trim(), true); // Final, saving update
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            lastMessage.text = 'Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại.';
          }
          return newMessages;
        }
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };
  
  const isDisabled = !generatedSpeech;

  return (
    <div className={`mt-6 border rounded-lg ${isDisabled ? 'bg-gray-100' : 'bg-white'}`}>
      <button
        onClick={() => !isDisabled && setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-4"
        disabled={isDisabled}
        aria-expanded={isExpanded}
        aria-controls="chatbot-content"
      >
        <div className="flex items-center gap-3">
          <AIIcon className={`w-5 h-5 ${isDisabled ? 'text-gray-400' : 'text-brand-teal-700'}`} />
          <h3 className={`font-semibold ${isDisabled ? 'text-gray-500' : 'text-gray-800'}`}>
            Trò chuyện với AI để tinh chỉnh
          </h3>
        </div>
        {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-gray-500" /> : <ChevronDownIcon className="w-5 h-5 text-gray-500" />}
      </button>

      {isExpanded && (
        <div id="chatbot-content" className="border-t border-gray-200">
          <div className="p-4 h-64 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 text-sm prose prose-sm max-w-none prose-p:my-1 ${
                    msg.role === 'user'
                      ? 'bg-brand-teal-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              </div>
            ))}
             {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Hỏi AI để cải thiện văn bản..."
              className="flex-grow bg-gray-100 border-none rounded-md p-2.5 focus:ring-2 focus:ring-brand-teal-500 transition-shadow duration-200 text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-brand-teal-600 text-white hover:bg-brand-teal-700 transition-colors disabled:bg-brand-teal-300 disabled:cursor-not-allowed"
              aria-label="Gửi tin nhắn"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot;