import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Loader2, Send, Brain, Database, MessageSquare, 
  Plus, FileText, Image as ImageIcon, Upload, X, Activity, AlertTriangle, 
  ChevronRight, Lock, Trash2, Edit2, Check, Menu, MessageSquarePlus, 
  Unlock, ArrowLeft, Camera, User, Bot, BookOpen, Paperclip, Lightbulb, Info
} from 'lucide-react';

// ==========================================
// CONFIGURAÇÕES DE MEMÓRIA LOCAL
// ==========================================
const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024; // 10MB para LocalStorage

// ==========================================
// FORMATAÇÃO E UTILITÁRIOS
// ==========================================
const compressImage = (file, maxWidth = 1200) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const renderMarkdown = (text) => {
  if (!text || typeof text !== 'string') return null;
  const lines = text.split('\n');
  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) return <h3 key={index} className="text-lg font-bold text-[#0B1B3D] mt-4 mb-2 border-l-4 border-blue-500 pl-3">{formatInline(trimmed.slice(4))}</h3>;
    if (trimmed.startsWith('## ')) return <h2 key={index} className="text-xl font-black text-[#0B1B3D] mt-5 mb-3 border-b border-slate-200 pb-1">{formatInline(trimmed.slice(3))}</h2>;
    if (trimmed.startsWith('# ')) return <h1 key={index} className="text-2xl font-black text-[#0B1B3D] mt-6 mb-4">{formatInline(trimmed.slice(2))}</h1>;
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <li key={index} className="ml-5 list-disc mb-1.5 text-slate-700 marker:text-cyan-500">{formatInline(trimmed.slice(2))}</li>;
    return <p key={index} className="mb-2 text-slate-700 leading-relaxed">{formatInline(line)}</p>;
  });
};

const formatInline = (text) => {
  if (typeof text !== 'string') return "";
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-[#0B1B3D]">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic text-slate-800">{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function App() {
  const loadLocal = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
  };

  const [loading, setLoading] = useState(true);
  
  // ESTADOS DE INTERFACE
  const [authMode, setAuthMode] = useState(() => loadLocal('racks_auth_mode', 'select')); 
  const [userRole, setUserRole] = useState(() => loadLocal('racks_user_role', null)); 
  const [activeTab, setActiveTab] = useState('chat');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [storageStats, setStorageStats] = useState({ formattedSize: '0 MB', percentage: 0 });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ESTADOS DE DADOS
  const [knowledgeBase, setKnowledgeBase] = useState(() => loadLocal('racks_kb', []));
  const [chatSessions, setChatSessions] = useState(() => loadLocal('racks_sessions', []));
  const [chatMessages, setChatMessages] = useState(() => loadLocal('racks_messages', []));
  const [branding, setBranding] = useState(() => loadLocal('racks_branding', { logoBase64: null, backgroundBase64: null }));
  
  // ESTADOS DE CHAT
  const [currentChatId, setCurrentChatId] = useState(() => loadLocal('racks_current_chat', null));
  const [userQuery, setUserQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputData, setInputData] = useState('');
  const [notification, setNotification] = useState(null);
  
  const scrollRef = useRef(null);
  const logoInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Calcula o armazenamento do LocalStorage
  const calculateStorage = () => {
    try {
      let totalBytes = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalBytes += ((localStorage[key].length + key.length) * 2);
        }
      }
      const mb = (totalBytes / (1024 * 1024)).toFixed(2);
      const percentage = Math.min(100, Math.round((totalBytes / STORAGE_LIMIT_BYTES) * 100));
      return { formattedSize: `${mb} MB`, percentage };
    } catch (e) {
      return { formattedSize: '0 MB', percentage: 0 };
    }
  };

  useEffect(() => { 
    setTimeout(() => setLoading(false), 800); 
  }, []);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem('racks_auth_mode', JSON.stringify(authMode));
    localStorage.setItem('racks_user_role', JSON.stringify(userRole));
    localStorage.setItem('racks_kb', JSON.stringify(knowledgeBase));
    localStorage.setItem('racks_sessions', JSON.stringify(chatSessions));
    localStorage.setItem('racks_messages', JSON.stringify(chatMessages));
    localStorage.setItem('racks_branding', JSON.stringify(branding));
    localStorage.setItem('racks_current_chat', JSON.stringify(currentChatId));
    
    setStorageStats(calculateStorage());
  }, [authMode, userRole, knowledgeBase, chatSessions, chatMessages, branding, currentChatId, loading]);

  // Rola para o final suavemente
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isProcessing, currentChatId]);

  // --- LÓGICA DE IA REAL COM GEMINI API ---
  const callGeminiApi = async (query) => {
    try {
      // ATENÇÃO: Ao exportar para fora deste ambiente, coloque sua chave API gerada no Google AI Studio entre as aspas abaixo.
      // Aqui dentro deste Canvas, a chave vazia é preenchida automaticamente pelo ambiente.
      const apiKey = "AIzaSyAmTvUKMEHpkosdKBofYuaSPYJrL1VHZsw"; 
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      // Monta o prompt de sistema baseado nos documentos que o usuário salvou no painel admin
      let systemPromptText = "Você é o RACKS IA, um assistente técnico especializado em engenharia. Responda de forma profissional e técnica.";
      
      if (knowledgeBase.length > 0) {
        const docContext = knowledgeBase.map(doc => `[Documento: ${doc.fileName}]\n${doc.content}`).join('\n\n---\n\n');
        systemPromptText = `Você é o RACKS IA, um assistente técnico especializado. Use a seguinte Base de Conhecimento para basear suas respostas. Se a resposta não estiver na base, use seu conhecimento geral, mas sempre de forma segura e profissional.\n\nBASE DE CONHECIMENTO:\n${docContext}`;
      }

      const payload = {
        contents: [{ parts: [{ text: query }] }],
        systemInstruction: { parts: [{ text: systemPromptText }] }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
         throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, a IA não retornou uma resposta.";
    } catch (error) {
      console.error("Erro na integração com Gemini:", error);
      return "⚠️ Ocorreu um erro ao conectar com a IA. Se você exportou este código, verifique se inseriu sua `apiKey` no arquivo App.jsx.";
    }
  };

  const handleSendMessage = async (suggested = null) => {
    const text = suggested || userQuery;
    if (!text.trim() || isProcessing) return;
    
    setIsProcessing(true); 
    setUserQuery('');
    
    let activeId = currentChatId;
    if (!activeId) {
      activeId = Date.now().toString();
      setChatSessions(prev => [{ id: activeId, title: text.substring(0, 30), updatedAt: Date.now() }, ...prev]);
      setCurrentChatId(activeId);
    }

    const userMessage = { id: Date.now().toString() + '_u', chatId: activeId, role: 'user', content: text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMessage]);

    // Chamada real da API
    const ans = await callGeminiApi(text);

    const assistantMessage = { id: Date.now().toString() + '_a', chatId: activeId, role: 'assistant', content: ans, timestamp: Date.now() };
    setChatMessages(prev => [...prev, assistantMessage]);
    setIsProcessing(false);
  };

  const handleFeedData = () => {
    if (!inputData.trim()) return;
    const newDoc = { id: Date.now().toString(), fileName: 'Diretriz Técnica (Manual)', content: inputData, timestamp: Date.now() };
    setKnowledgeBase(prev => [newDoc, ...prev]);
    setInputData('');
    showNotification("Informação guardada na base local.", "success");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const newDoc = { 
        id: Date.now().toString(), 
        fileName: file.name, 
        content: content, 
        timestamp: Date.now() 
      };
      setKnowledgeBase(prev => [newDoc, ...prev]);
      showNotification("Ficheiro lido e indexado com sucesso.", "success");
    };
    
    if (file.type === "text/plain") {
      reader.readAsText(file);
    } else {
      showNotification("Apenas ficheiros de texto (.txt) suportados nesta versão.", "error");
    }
    
    e.target.value = null;
  };

  const handleDeleteSession = (e, id) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== id));
    setChatMessages(prev => prev.filter(m => m.chatId !== id));
    if (currentChatId === id) setCurrentChatId(null);
  };

  const handleDeleteKnowledge = (id) => {
    setKnowledgeBase(prev => prev.filter(doc => doc.id !== id));
    showNotification("Documento removido da base local.", "success");
  };

  const handleBranding = async (e, type) => {
    if (!e.target.files[0]) return;
    const b64 = await compressImage(e.target.files[0], type === 'logo' ? 400 : 1920);
    setBranding(prev => ({ ...prev, [type === 'logo' ? 'logoBase64' : 'backgroundBase64']: b64 }));
    showNotification("Design atualizado.", "success");
  };

  const handleAdminLogin = (e) => {
    e.preventDefault(); 
    if(adminPassword === '@proc123') {
      setUserRole('admin'); 
      setAuthMode('authenticated');
      setLoginError('');
      setAdminPassword('');
    } else {
      setLoginError('Acesso Negado. Verifique a senha.');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const currentMessages = useMemo(() => chatMessages.filter(m => m.chatId === currentChatId), [chatMessages, currentChatId]);

  if (loading) return <div className="h-screen bg-[#0B1B3D] flex items-center justify-center"><Loader2 className="animate-spin text-cyan-400" size={48}/></div>;

  // ==========================================
  // UI: LOGIN PREMIUM 
  // ==========================================
  if (authMode !== 'authenticated') {
    return (
      <div className="flex flex-col h-screen relative items-center justify-center bg-[#0B1B3D] text-white overflow-hidden font-sans">
        <input type="file" ref={bgInputRef} onChange={(e) => handleBranding(e, 'bg')} className="hidden" accept="image/*" />
        <input type="file" ref={logoInputRef} onChange={(e) => handleBranding(e, 'logo')} className="hidden" accept="image/*" />
        
        {branding.backgroundBase64 ? (
          <div className="absolute inset-0 bg-cover bg-center opacity-50 animate-in fade-in duration-1000" style={{backgroundImage: `url(${branding.backgroundBase64})`}} />
        ) : (
          <div className="absolute inset-0 w-full h-full opacity-40">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-600 blur-[180px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-700 blur-[180px]"></div>
          </div>
        )}

        <button onClick={() => bgInputRef.current.click()} className="absolute top-8 right-8 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl hover:bg-cyan-500/20 transition-all z-50 shadow-2xl group" title="Mudar plano de fundo">
          <Camera size={22} className="group-hover:scale-110 transition-transform text-cyan-300"/>
        </button>
        
        <div className="relative z-10 w-full max-w-md px-6 animate-in zoom-in duration-700">
          <div className="absolute -inset-1.5 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-[3rem] blur-2xl opacity-40 animate-pulse"></div>
          <div className="bg-[#0f2757]/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 p-12 text-center relative overflow-hidden">
             
             <div onClick={() => logoInputRef.current.click()} className="w-28 h-28 bg-white rounded-[2rem] mx-auto mb-8 flex items-center justify-center cursor-pointer border-4 border-cyan-400/30 hover:scale-105 transition-all group shadow-2xl overflow-hidden relative" title="Mudar logotipo">
               {branding.logoBase64 ? <img src={branding.logoBase64} className="w-full h-full object-contain p-3" alt="Logo" /> : <Brain size={56} className="text-[#0B1B3D]" />}
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <Camera size={32} className="text-white"/>
               </div>
             </div>
             
             <h1 className="text-5xl font-black mb-2 tracking-tighter drop-shadow-2xl text-white">RACKS <span className="text-cyan-400">IA</span></h1>
             <p className="text-cyan-200/50 text-xs mb-12 tracking-[0.3em] uppercase font-black">APROC Engineer Intelligence</p>

             {authMode === 'select' ? (
               <div className="space-y-5">
                 <button onClick={() => {setUserRole('user'); setAuthMode('authenticated');}} className="w-full py-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-black text-lg hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all transform hover:-translate-y-1.5 flex items-center justify-center gap-4 border border-white/10">
                   <User size={24}/>Entrar como Usuário
                 </button>
                 <button onClick={() => setAuthMode('admin_login')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-cyan-100/60 text-sm">
                   <Lock size={18}/>Painel do Administrador
                 </button>
               </div>
             ) : (
               <form onSubmit={handleAdminLogin} className="space-y-5 animate-in slide-in-from-right duration-500">
                 <div className="relative">
                   <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-cyan-400" size={20}/>
                   <input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} placeholder="Palavra-passe mestra..." className="w-full py-5 pl-14 pr-6 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-cyan-400 text-white placeholder:text-white/20 text-lg transition-all" autoFocus />
                 </div>
                 {loginError && <p className="text-sm text-red-400 font-black flex items-center justify-center gap-2 animate-shake"><AlertTriangle size={16}/> {loginError}</p>}
                 <button type="submit" className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl font-black text-lg hover:shadow-2xl transition-all border border-white/10 uppercase tracking-widest">Validar Identidade</button>
                 <button type="button" onClick={()=>setAuthMode('select')} className="text-xs text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto pt-4"><ArrowLeft size={14}/> Voltar à seleção</button>
               </form>
             )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // UI: DASHBOARD
  // ==========================================
  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <style>{`.custom-scroll::-webkit-scrollbar { width: 5px; } .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
      
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 bg-white shadow-2xl rounded-2xl border-l-8 animate-in slide-in-from-right-4 flex items-center gap-4 ${notification.type === 'success' ? 'border-emerald-500' : 'border-red-500'}`}>
          <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {notification.type === 'success' ? <Check size={20}/> : <AlertTriangle size={20}/>}
          </div>
          <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{notification.message}</span>
        </div>
      )}

      {/* HEADER CORPORATIVO */}
      <header className="px-6 md:px-8 py-4 md:py-5 bg-white border-b border-slate-200 flex justify-between items-center z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-4 md:gap-5">
          {/* Menu Mobile Hambúrguer */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
             <Menu size={24} />
          </button>

          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0B1B3D] rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 shadow-lg cursor-pointer hover:scale-110 transition-all active:scale-95" onClick={() => setActiveTab('chat')}>
            {branding.logoBase64 ? <img src={branding.logoBase64} className="w-full h-full object-contain p-2" alt="Logo" /> : <Brain className="text-cyan-400" size={24}/>}
          </div>
          <div className="hidden sm:block">
            <h2 className="text-xl md:text-2xl font-black tracking-tighter leading-none text-[#0B1B3D]">RACKS <span className="text-blue-600">IA</span></h2>
            <p className="text-[9px] md:text-[10px] text-cyan-600 font-black uppercase tracking-[0.2em] mt-1">APROC Engineering Studio</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {userRole === 'admin' && (
            <nav className="flex bg-slate-100 p-1 md:p-1.5 rounded-2xl border border-slate-200/50">
              <button onClick={()=>setActiveTab('chat')} className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black flex items-center gap-2 transition-all uppercase tracking-widest ${activeTab==='chat'?'bg-white shadow-md text-blue-600':'text-slate-500 hover:text-slate-800'}`}>
                <MessageSquare size={16}/><span className="hidden sm:inline">Assistente</span>
              </button>
              <button onClick={()=>setActiveTab('admin')} className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black flex items-center gap-2 transition-all uppercase tracking-widest ${activeTab==='admin'?'bg-white shadow-md text-blue-600':'text-slate-500 hover:text-slate-800'}`}>
                <Database size={16}/><span className="hidden sm:inline">Base Técnica</span>
              </button>
            </nav>
          )}
          <button onClick={()=>{setAuthMode('select'); setUserRole(null);}} className="p-2.5 md:p-3 bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-slate-200 shadow-inner group" title="Sair">
            <X size={20} className="group-hover:rotate-90 transition-transform"/>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'chat' ? (
          <>
            {/* SIDEBAR ESQUERDA (Responsiva / Overlay) */}
            <aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} absolute lg:relative z-40 w-72 lg:w-80 h-full bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out shrink-0 shadow-2xl lg:shadow-none`}>
              <div className="p-6 border-b border-slate-200 bg-white/50">
                <button onClick={() => {setCurrentChatId(null); setIsMobileMenuOpen(false);}} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest">
                  <MessageSquarePlus size={20}/>Nova Conversa
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-6 custom-scroll">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">Sessões Recentes</h4>
                <div className="space-y-2">
                  {chatSessions.map(s => (
                    <div key={s.id} onClick={()=>{setCurrentChatId(s.id); setIsMobileMenuOpen(false);}} className={`p-4 rounded-2xl cursor-pointer group flex justify-between items-center transition-all ${currentChatId===s.id?'bg-white shadow-xl border border-slate-200 text-blue-600 font-black scale-[1.02]':'text-slate-500 hover:bg-white/70 border border-transparent'}`}>
                      <span className="truncate flex-1 text-sm">{s.title || "Consulta Técnica"}</span>
                      <button onClick={(e) => handleDeleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  {chatSessions.length === 0 && (
                    <div className="py-12 text-center px-6">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50"><BookOpen size={20}/></div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">Nenhuma consulta guardada no histórico local.</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Armazenamento escondido para usuários comuns */}
              {userRole === 'admin' && (
                <div className="p-6 border-t border-slate-200 bg-white/50">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-3"><span>Armazenamento</span><span>{storageStats.formattedSize}</span></div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000" style={{width: `${storageStats.percentage}%`}}></div></div>
                </div>
              )}
            </aside>

            {/* Overlay para fechar menu mobile */}
            {isMobileMenuOpen && (
              <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* ÁREA CENTRAL */}
            <div className="flex-1 flex flex-col relative bg-white min-w-0">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-12 custom-scroll bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:20px_20px]">
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 pb-20">
                  {currentMessages.length === 0 ? (
                    <div className="py-16 md:py-24 text-center animate-in fade-in zoom-in duration-1000">
                      <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-[2.5rem] md:rounded-[3rem] mx-auto mb-8 md:mb-10 flex items-center justify-center shadow-inner border border-white relative group">
                        <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <Bot size={56} className="text-blue-600 relative z-10 animate-pulse md:w-[72px] md:h-[72px]"/>
                      </div>
                      <h3 className="text-4xl md:text-5xl font-black mb-4 md:mb-6 tracking-tighter text-slate-900 leading-tight">RACKS <span className="text-blue-600">IA</span></h3>
                      <p className="text-slate-400 max-w-md mx-auto text-lg md:text-xl leading-relaxed font-medium px-4">Assistente Técnico Especializado pronto para suporte em projetos de Engenharia.</p>
                      <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-3 md:gap-4 px-4">
                         <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Memória Local Ativa</div>
                         <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">IA Conectada</div>
                      </div>
                    </div>
                  ) : (
                    currentMessages.map((m, i) => (
                      <div key={i} className={`flex gap-3 md:gap-6 ${m.role==='user'?'justify-end':'justify-start'} animate-in slide-in-from-bottom-6 duration-500`}>
                        {m.role==='assistant' && <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#0B1B3D] flex items-center justify-center shrink-0 mt-2 shadow-xl border border-slate-700"><Bot size={20} className="text-cyan-400"/></div>}
                        <div className={`p-5 md:p-7 rounded-[1.5rem] md:rounded-[2rem] max-w-[90%] md:max-w-[85%] text-sm md:text-base leading-relaxed shadow-xl md:shadow-2xl border overflow-hidden ${m.role==='user'?'bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-tr-none border-blue-500':'bg-white border-slate-100 text-slate-800 rounded-tl-none'}`}>
                          {m.role==='assistant' ? renderMarkdown(m.content) : <span className="whitespace-pre-wrap font-medium">{m.content}</span>}
                        </div>
                        {m.role==='user' && <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 mt-2 shadow-lg border border-blue-200"><User size={20} className="text-blue-600"/></div>}
                      </div>
                    ))
                  )}
                  {isProcessing && (
                    <div className="flex gap-3 md:gap-6 animate-pulse">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#0B1B3D] flex items-center justify-center shrink-0 mt-2 shadow-xl"><Bot size={20} className="text-cyan-400"/></div>
                      <div className="p-4 md:p-6 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] flex gap-2 md:gap-3 border border-slate-100 shadow-inner items-center">
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'0.4s'}}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BARRA DE INPUT */}
              <div className="p-4 md:p-8 bg-white border-t border-slate-100 shrink-0 relative">
                <div className="max-w-4xl mx-auto relative">
                  <div className="relative flex items-end gap-2 md:gap-4 bg-slate-50 p-2 md:p-3 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_40px_rgba(37,99,235,0.1)] transition-all duration-500 group">
                    <button className="p-3 md:p-4 rounded-full transition-all text-slate-400 hover:bg-slate-200 hover:text-blue-600 flex items-center justify-center shrink-0" title="Função de Anexo Automático">
                      <Paperclip size={20} className="md:w-6 md:h-6"/>
                    </button>
                    <textarea 
                      value={userQuery} 
                      onChange={e=>setUserQuery(e.target.value)} 
                      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); handleSendMessage();}}} 
                      placeholder="Descreva o problema técnico..." 
                      rows="1" 
                      className="w-full bg-transparent py-3 md:py-4 outline-none text-base md:text-lg resize-none custom-scroll max-h-32 md:max-h-48 placeholder:text-slate-300 font-medium" 
                    />
                    <button 
                      onClick={()=>handleSendMessage()} 
                      disabled={isProcessing||(!userQuery.trim())} 
                      className="p-4 md:p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full hover:shadow-2xl disabled:opacity-20 shadow-lg shadow-blue-200 flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95 border border-white/10"
                    >
                      <Send size={20} className="md:w-[26px] md:h-[26px]"/>
                    </button>
                  </div>
                  <p className="hidden md:block text-[9px] text-slate-300 text-center mt-5 font-black uppercase tracking-[0.3em] opacity-60">RACKS Technical Intelligence Studio × Local Deployment Engine</p>
                </div>
              </div>
            </div>

            {/* SIDEBAR DIREITA */}
            <aside className="w-80 bg-white border-l border-slate-200 flex flex-col hidden xl:flex transition-all shrink-0">
               <div className="p-8 border-b border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-200 shadow-md">
                    <Lightbulb size={26} className="text-amber-500 fill-amber-500/20 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 tracking-tighter text-lg">Sugestões</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Consultas Rápidas</p>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scroll">
                  {[
                    "Regras de nomenclatura de linhas",
                    "Diferenças Chill vs Eco Pack",
                    "Limite de módulos por ramal",
                    "Parâmetros de ramal de MT",
                    "Configuração de quadros BT"
                  ].map((s, i) => (
                    <button key={i} onClick={()=>handleSendMessage(s)} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-left text-xs font-black text-slate-600 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-800 transition-all group relative overflow-hidden shadow-sm hover:shadow-lg transform hover:-translate-x-1">
                       <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <span className="relative z-10">{s}</span>
                    </button>
                  ))}
               </div>
               
               {/* Contador de diretrizes escondido para usuários comuns */}
               {userRole === 'admin' && (
                 <div className="p-8 bg-slate-50/50">
                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl border-t-4 border-t-blue-600">
                       <div className="flex items-center gap-2 mb-3 text-blue-600"><Info size={16}/><span className="text-[10px] font-black uppercase tracking-widest">Estado Local</span></div>
                       <p className="text-sm font-black text-slate-800 leading-tight">{knowledgeBase.length} Diretrizes Sincronizadas</p>
                    </div>
                 </div>
               )}
            </aside>
          </>
        ) : (
          /* PAINEL ADMIN */
          <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20 custom-scroll bg-white animate-in fade-in duration-1000">
            <div className="max-w-6xl mx-auto space-y-12 md:space-y-16">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-slate-100 pb-8 md:pb-12">
                 <div>
                   <div className="flex items-center gap-3 text-blue-600 mb-4 font-black uppercase tracking-[0.3em] text-xs"><Database size={16}/> Gestão Estrutural</div>
                   <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-[#0B1B3D]">Acervo Técnico</h2>
                   <p className="text-slate-400 text-base md:text-xl mt-4 max-w-2xl font-medium leading-relaxed">Alimente o motor da RACKS IA com manuais e diretrizes. Os dados são processados e guardados exclusivamente no seu dispositivo.</p>
                 </div>
                 <button onClick={()=>fileInputRef.current.click()} className="bg-[#0B1B3D] w-full md:w-auto text-cyan-400 px-8 py-4 md:px-10 md:py-5 rounded-[1.5rem] font-black flex items-center justify-center gap-4 hover:bg-slate-900 transition-all shadow-2xl shadow-slate-300 uppercase text-xs tracking-[0.2em] border border-cyan-400/30 group">
                   <Upload size={20} className="group-hover:-translate-y-1 transition-transform"/>Importar Ficheiros
                 </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt" />
               </div>

               <div className="grid lg:grid-cols-2 gap-10 md:gap-16">
                 <div className="bg-slate-50 p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Plus size={120}/></div>
                    <h4 className="font-black mb-6 md:mb-8 flex items-center gap-3 md:gap-4 text-blue-600 text-xl md:text-2xl tracking-tight"><Plus size={24} className="md:w-7 md:h-7"/>Nova Diretriz</h4>
                    <textarea 
                      value={inputData} 
                      onChange={e=>setInputData(e.target.value)} 
                      className="w-full h-48 md:h-72 bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 outline-none focus:ring-8 focus:ring-blue-100 transition-all text-base md:text-lg shadow-sm placeholder:text-slate-200 font-medium custom-scroll" 
                      placeholder="Insira o texto técnico oficial (Ex: Parâmetros de montagem para quadros de BT...)" 
                    />
                    <button onClick={handleFeedData} disabled={!inputData.trim()} className="w-full mt-6 md:mt-8 py-5 md:py-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-lg md:text-xl hover:shadow-2xl transition-all disabled:opacity-30 border border-white/10 uppercase tracking-widest">Sincronizar Diretriz</button>
                 </div>
                 <div className="space-y-6 md:space-y-8">
                    <h4 className="font-black text-slate-800 uppercase text-xs md:text-sm tracking-[0.3em] flex items-center gap-3"><Database size={20} className="text-blue-500"/>Documentos Ativos</h4>
                    <div className="overflow-y-auto max-h-[400px] md:max-h-[600px] pr-2 md:pr-6 custom-scroll space-y-4">
                      {knowledgeBase.map(k => (
                        <div key={k.id} className="bg-white border border-slate-100 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex justify-between items-center group hover:border-blue-400 hover:shadow-2xl transition-all shadow-md">
                          <div className="flex items-center gap-4 md:gap-5 min-w-0">
                            <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-[#0B1B3D] group-hover:text-cyan-400 transition-all shadow-inner"><FileText size={24} className="md:w-7 md:h-7"/></div>
                            <div className="flex-1 min-w-0">
                               <p className="text-sm md:text-base font-black text-slate-800 truncate tracking-tight">{String(k.fileName)}</p>
                               <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{new Date(k.timestamp).toLocaleDateString()} — {new Date(k.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteKnowledge(k.id)} className="p-3 md:p-4 shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all ml-2"><Trash2 size={20}/></button>
                        </div>
                      ))}
                      {knowledgeBase.length === 0 && (
                        <div className="text-center py-20 md:py-28 bg-slate-50/50 rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold italic tracking-tighter text-base md:text-lg px-4">O acervo técnico local está vazio.</div>
                      )}
                    </div>
                 </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}