import React, { useState, useEffect } from 'react';
import type { FormData, DocumentItem } from './types';
import { DOCUMENT_TYPES } from './constants';
import { generateDocumentStream, generateTitle } from './services/geminiService';
import InputControl from './components/InputControl';
import AIIcon from './components/icons/AIIcon';
import DocumentIcon from './components/icons/DocumentIcon';
import SparkleIcon from './components/icons/SparkleIcon';
import TrashIcon from './components/icons/TrashIcon';
import PaperclipIcon from './components/icons/PaperclipIcon';
import XIcon from './components/icons/XIcon';
import InfoIcon from './components/icons/InfoIcon';
import SpeechOutput from './components/SpeechOutput';
import Chatbot from './components/Chatbot';
import Modal from './components/Modal';
import type { Part } from '@google/genai';


const initialFormData: FormData = {
  role: '',
  issuingAuthority: 'Ủy ban nhân dân xã X',
  eventName: '',
  organizer: '',
  context: '',
  message: '',
  recipients: '- Các thôn tổ dân phố\n- Các cơ quan, doanh nghiệp trên địa bàn',
  keyPoints: '',
};

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const [keyPointsFiles, setKeyPointsFiles] = useState<File[]>([]);
  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'result' | 'saved'>('result');
  const [savedDocuments, setSavedDocuments] = useState<DocumentItem[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const storedDocuments = localStorage.getItem('savedDocuments');
      if (storedDocuments) {
        setSavedDocuments(JSON.parse(storedDocuments));
      }
    } catch (error) {
      console.error("Failed to load documents from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('savedDocuments', JSON.stringify(savedDocuments));
    } catch (error) {
        console.error("Failed to save documents to localStorage", error);
    }
  }, [savedDocuments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFormData(initialFormData);
    setContextFiles([]);
    setKeyPointsFiles([]);
    setGeneratedDocument('');
    setError(null);
    setActiveDocumentId(null);
  };

  const handleContextFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setContextFiles((prev) => [...prev, ...newFiles]);
      e.target.value = ''; // Allow re-selecting the same file
    }
  };

  const handleRemoveContextFile = (fileNameToRemove: string) => {
    setContextFiles((prev) => prev.filter(file => file.name !== fileNameToRemove));
  };
  
  const handleKeyPointsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setKeyPointsFiles((prev) => [...prev, ...newFiles]);
      e.target.value = ''; // Allow re-selecting the same file
    }
  };

  const handleRemoveKeyPointsFile = (fileNameToRemove: string) => {
    setKeyPointsFiles((prev) => prev.filter(file => file.name !== fileNameToRemove));
  };


  const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read file as base64 string."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });

    const data = await base64EncodedDataPromise;
    
    return {
        inlineData: {
            data,
            mimeType: file.type,
        },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedDocument('');
    setActiveTab('result');
    
    let finalDocument = '';

    try {
      const isProcessableFile = (file: File) => file.type.startsWith('image/') || file.type === 'application/pdf';

      // Process context files
      const contextFilesToProcess = contextFiles.filter(isProcessableFile);
      const contextFileParts = await Promise.all(
        contextFilesToProcess.map(fileToGenerativePart)
      );

      // Process key points files
      const keyPointsFilesToProcess = keyPointsFiles.filter(isProcessableFile);
      const keyPointsFileParts = await Promise.all(
        keyPointsFilesToProcess.map(fileToGenerativePart)
      );
      
      const stream = await generateDocumentStream(formData, contextFileParts, keyPointsFileParts);
      
      for await (const chunk of stream) {
        const text = chunk.text;
        setGeneratedDocument((prev) => prev + text);
        finalDocument += text;
      }

      if (finalDocument) {
        const documentTitle = await generateTitle(finalDocument);
        const newDocument: DocumentItem = {
            id: crypto.randomUUID(),
            title: documentTitle,
            content: finalDocument,
            timestamp: Date.now(),
        };
        setSavedDocuments(prev => [newDocument, ...prev]);
        setActiveDocumentId(newDocument.id);
        setChatSessionId(crypto.randomUUID()); // Reset chat session on new document
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSaved = (documentId: string) => {
    const documentToView = savedDocuments.find(s => s.id === documentId);
    if (documentToView) {
        setGeneratedDocument(documentToView.content);
        setActiveTab('result');
        setError(null);
        setActiveDocumentId(documentToView.id);
        setChatSessionId(crypto.randomUUID()); // Also reset chat for a saved document
    }
  };

  const handleDeleteSaved = (documentId: string) => {
    setSavedDocuments(prev => prev.filter(s => s.id !== documentId));
  };

  const handleDocumentUpdate = (newDocument: string, isFinal: boolean = false) => {
    setGeneratedDocument(newDocument);

    if (isFinal && activeDocumentId) {
      setSavedDocuments(prevDocuments => {
        const newDocuments = prevDocuments.map(doc => {
          if (doc.id === activeDocumentId) {
            return {
              ...doc,
              content: newDocument,
              timestamp: Date.now(),
            };
          }
          return doc;
        });
        
        const updatedDocumentIndex = newDocuments.findIndex(s => s.id === activeDocumentId);
        if (updatedDocumentIndex > 0) {
            const updatedDocument = newDocuments.splice(updatedDocumentIndex, 1)[0];
            newDocuments.unshift(updatedDocument);
        }
        return newDocuments;
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(new Date(timestamp));
  };

  const formFields = [
    { name: 'role', label: 'Loại văn bản', type: 'select', placeholder: 'Chọn loại văn bản', options: DOCUMENT_TYPES },
    { name: 'issuingAuthority', label: 'Cơ quan ban hành', type: 'text', placeholder: 'Nhập tên cơ quan ban hành' },
    { name: 'eventName', label: 'Trích yếu', type: 'textarea', placeholder: 'V/v ban hành Kế hoạch tổ chức...', rows: 2 },
    { name: 'organizer', label: 'Sơ lược nội dung cần soạn thảo', type: 'textarea', placeholder: 'Nhập giá trị', rows: 2 },
    { name: 'context', label: 'Căn cứ ban hành văn bản', type: 'textarea', placeholder: 'Căn cứ Nghị định số..., Căn cứ Quyết định số...', rows: 4 },
    { name: 'message', label: 'Kỳ vọng hiệu quả của văn bản', type: 'textarea', placeholder: 'Nhập giá trị', rows: 2 },
    { name: 'recipients', label: 'Nơi nhận', type: 'textarea', placeholder: 'Nhập nơi nhận văn bản', rows: 3 },
    { name: 'keyPoints', label: 'Văn bản, tư liệu, số liệu liên quan', type: 'textarea', placeholder: 'Nhập giá trị', rows: 4 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Trợ lý trí tuệ nhân tạo AI</h1>
                    <p className="text-gray-600 mt-1">
                        Hỗ trợ dự thảo các văn bản như: Công văn, Báo cáo, Kế hoạch, Tờ trình...
                    </p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-200 transition-colors duration-200 text-sm border border-gray-300 shadow-sm"
                >
                    <InfoIcon className="w-4 h-4" />
                    Giới thiệu & Hướng dẫn
                </button>
            </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Panel: Form */}
          <aside className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-6">Nhập dữ liệu</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4 max-h-[calc(100vh-28rem)] overflow-y-auto pr-2 custom-scrollbar">
                {formFields.map(field => {
                   if (field.name === 'context') {
                    return (
                      <div key={field.name}>
                        <InputControl
                          label={field.label}
                          name={field.name}
                          value={formData[field.name as keyof FormData]}
                          onChange={handleChange}
                          placeholder={field.placeholder}
                          type={field.type as 'text' | 'textarea' | 'select'}
                          rows={field.rows}
                        />
                         <div className="mt-2">
                           <label className="inline-flex items-center gap-2 text-sm text-brand-teal-600 font-medium cursor-pointer hover:text-brand-teal-800 transition-colors">
                              <PaperclipIcon className="w-4 h-4" />
                              Đính kèm files (.PDF, hình ảnh)
                              <input 
                                type="file" 
                                hidden 
                                multiple
                                onChange={handleContextFileChange}
                                accept="image/*,application/pdf"
                              />
                           </label>
                           {contextFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {contextFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-100 rounded-md p-2 text-sm">
                                  <span className="truncate text-gray-700 flex-1 mr-2" title={file.name}>{file.name}</span>
                                  <button type="button" onClick={() => handleRemoveContextFile(file.name)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                           )}
                           <p className="text-xs text-gray-400 mt-2">
                            AI sẽ phân tích nội dung từ các tệp hình ảnh và PDF được đính kèm.
                           </p>
                        </div>
                      </div>
                    );
                   }
                   if (field.name === 'keyPoints') {
                    return (
                      <div key={field.name}>
                        <InputControl
                          label={field.label}
                          name={field.name}
                          value={formData[field.name as keyof FormData]}
                          onChange={handleChange}
                          placeholder={field.placeholder}
                          type={field.type as 'text' | 'textarea' | 'select'}
                          rows={field.rows}
                        />
                         <div className="mt-2">
                           <label className="inline-flex items-center gap-2 text-sm text-brand-teal-600 font-medium cursor-pointer hover:text-brand-teal-800 transition-colors">
                              <PaperclipIcon className="w-4 h-4" />
                              Đính kèm files (.PDF, hình ảnh)
                              <input 
                                type="file" 
                                hidden 
                                multiple
                                onChange={handleKeyPointsFileChange}
                                accept="image/*,application/pdf"
                              />
                           </label>
                           {keyPointsFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {keyPointsFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-100 rounded-md p-2 text-sm">
                                  <span className="truncate text-gray-700 flex-1 mr-2" title={file.name}>{file.name}</span>
                                  <button type="button" onClick={() => handleRemoveKeyPointsFile(file.name)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                           )}
                           <p className="text-xs text-gray-400 mt-2">
                            AI sẽ phân tích nội dung từ các tệp hình ảnh và PDF được đính kèm.
                           </p>
                        </div>
                      </div>
                    );
                   }
                   return (
                     <InputControl
                      key={field.name}
                      label={field.label}
                      name={field.name}
                      value={formData[field.name as keyof FormData]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      type={field.type as 'text' | 'textarea' | 'select'}
                      options={field.options}
                      rows={field.rows}
                    />
                   );
                })}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <button type="button" onClick={handleClear} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors duration-200 text-sm">
                  <TrashIcon className="w-4 h-4" />
                  Dữ liệu mới
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-teal-600 text-white font-medium hover:bg-brand-teal-700 transition-colors duration-200 disabled:bg-brand-teal-300 disabled:cursor-not-allowed text-sm">
                  <SparkleIcon className="w-4 h-4" />
                  {isLoading ? 'Đang tạo...' : 'Soạn thảo văn bản'}
                </button>
              </div>
            </form>
            <Chatbot
              key={chatSessionId}
              generatedDocument={generatedDocument}
              onDocumentUpdate={handleDocumentUpdate}
            />
          </aside>

          {/* Right Panel: Result */}
          <section className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 rounded-t-lg">
                <div className="flex items-center gap-3 text-brand-teal-700">
                    <DocumentIcon className="w-6 h-6"/>
                    <h2 className="text-lg font-semibold">Kết quả do AI tạo ra</h2>
                </div>
            </div>
            <div className="border-b border-gray-200 px-4">
              <nav className="flex gap-6">
                  <button 
                      onClick={() => setActiveTab('result')}
                      className={`py-3 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                          activeTab === 'result'
                          ? 'border-brand-teal-600 text-brand-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                      Văn bản
                  </button>
                  <button 
                      onClick={() => setActiveTab('saved')}
                      className={`py-3 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                          activeTab === 'saved'
                          ? 'border-brand-teal-600 text-brand-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                      Lịch sử lưu trữ
                  </button>
              </nav>
            </div>
            <div className="p-6 flex-grow flex flex-col overflow-hidden bg-gray-50">
                {activeTab === 'result' && (
                  <>
                    {isLoading && !generatedDocument && (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal-600 mb-4"></div>
                            <p className="font-medium">AI đang suy nghĩ...</p>
                            <p className="text-sm">Vui lòng chờ trong giây lát.</p>
                        </div>
                    )}
                    {error && (
                        <div className="flex-grow flex items-center justify-center text-center text-red-600 bg-red-50 p-4 rounded-lg">
                            <div>
                                <p className="font-bold">Đã xảy ra lỗi</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}
                    {!isLoading && !error && !generatedDocument && (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-400">
                            <AIIcon className="w-16 h-16 mb-4"/>
                            <p className="font-medium text-gray-600">Văn bản do AI tạo ra sẽ hiển thị ở khu vực này</p>
                        </div>
                    )}
                    {(generatedDocument || (isLoading && generatedDocument)) && (
                        <SpeechOutput content={generatedDocument} />
                    )}
                  </>
                )}
                {activeTab === 'saved' && (
                  <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                    {savedDocuments.length === 0 ? (
                      <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-400 h-full">
                          <DocumentIcon className="w-16 h-16 mb-4"/>
                          <p className="font-medium text-gray-600">Chưa có nội dung nào được lưu.</p>
                          <p className="text-sm">Các văn bản bạn tạo sẽ xuất hiện ở đây.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {savedDocuments.map(doc => (
                          <div key={doc.id} className="bg-white p-4 rounded-lg border border-gray-200 transition-shadow hover:shadow-sm">
                            <h3 className="font-semibold text-gray-800 mb-2 truncate" title={doc.title}>
                              {doc.title}
                            </h3>
                            <p className="text-xs text-gray-500">Đã lưu: {formatDate(doc.timestamp)}</p>
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                              <button onClick={() => handleViewSaved(doc.id)} className="text-sm font-medium text-brand-teal-600 hover:text-brand-teal-800 transition-colors">Xem chi tiết</button>
                              <button onClick={() => handleDeleteSaved(doc.id)} className="text-gray-400 hover:text-red-600 transition-colors" aria-label="Xóa nội dung">
                                <TrashIcon className="w-4 h-4"/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </section>
        </main>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Giới thiệu & Hướng dẫn sử dụng"
      >
        <div className="text-sm text-gray-600 space-y-4">
            <p className="font-semibold text-base text-gray-800">Chào mừng bạn đến với Trợ lý AI Soạn thảo Văn bản!</p>
            <p>
                Ứng dụng này được thiết kế để giúp bạn nhanh chóng tạo ra các bản dự thảo văn bản hành chính theo đúng thể thức và quy chuẩn của Việt Nam.
            </p>

            <div>
                <h3 className="font-semibold text-gray-800 mb-2">Quy trình sử dụng:</h3>
                <ol className="list-decimal list-inside space-y-2">
                    <li>
                        <strong>Bước 1: Nhập dữ liệu</strong><br />
                        Cung cấp các thông tin cần thiết vào biểu mẫu bên trái. Thông tin càng chi tiết, văn bản do AI tạo ra sẽ càng chính xác và phù hợp.
                    </li>
                    <li>
                        <strong>Bước 2: Đính kèm tệp (Tùy chọn)</strong><br />
                        Bạn có thể tải lên các tệp tài liệu liên quan (hình ảnh, PDF) ở mục "Căn cứ ban hành" và "Tư liệu liên quan". AI sẽ tự động trích xuất thông tin từ các tệp này để đưa vào văn bản.
                    </li>
                    <li>
                        <strong>Bước 3: Soạn thảo</strong><br />
                        Sau khi điền xong thông tin, nhấn nút "Soạn thảo văn bản". AI sẽ phân tích yêu cầu và tạo ra một bản dự thảo hoàn chỉnh ở khung kết quả bên phải.
                    </li>
                    <li>
                        <strong>Bước 4: Tinh chỉnh với AI</strong><br />
                        Sau khi có kết quả, bạn có thể sử dụng khung "Trò chuyện với AI để tinh chỉnh" để yêu cầu AI sửa đổi, bổ sung hoặc cải thiện văn bản. Ví dụ: "Thêm phần căn cứ pháp lý cho Quyết định X" hoặc "Làm cho phần lý do trang trọng hơn".
                    </li>
                    <li>
                        <strong>Bước 5: Lưu trữ và Quản lý</strong><br />
                        Mỗi văn bản được tạo sẽ tự động được lưu vào tab "Lịch sử lưu trữ". Bạn có thể xem lại hoặc xóa các phiên bản cũ tại đây.
                    </li>
                </ol>
            </div>
             <p className="pt-2">
                Chúc bạn có một trải nghiệm hiệu quả với ứng dụng!
            </p>
            <p className="pt-4 mt-4 border-t border-gray-200 text-right text-xs text-gray-500">
                Người phát triển: Đỗ Như Lâm
            </p>
        </div>
      </Modal>
    </div>
  );
};

export default App;