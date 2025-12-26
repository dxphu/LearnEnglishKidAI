
import React, { useState } from 'react';
import { AppState, LectureImage, AnalysisResult } from './types';
import { ImageUploader } from './components/ImageUploader';
import { LiveSession } from './components/LiveSession';
import { analyzeLectures } from './services/gemini';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [images, setImages] = useState<LectureImage[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const startAnalysis = async () => {
    if (images.length === 0) return;
    setState(AppState.ANALYZING);
    try {
      const result = await analyzeLectures(images.map(img => img.data));
      setAnalysis(result);
      setState(AppState.READY);
    } catch (err) {
      console.error(err);
      alert('Failed to analyze images. Please try again.');
      setState(AppState.IDLE);
    }
  };

  const startLearning = () => {
    setState(AppState.CHATTING);
  };

  const reset = () => {
    setState(AppState.IDLE);
    setImages([]);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-sky-50 font-sans text-slate-900 selection:bg-sky-200 flex flex-col">
      {/* Header with Safe Area support */}
      <header className="bg-white border-b-4 border-sky-100 p-4 pt-8 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="text-xl font-black text-sky-800 tracking-tight">KidAI Teacher</h1>
        </div>
        <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Online</span>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-6 pb-32 overflow-y-auto custom-scrollbar">
        {state === AppState.IDLE && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-white">
              <h2 className="text-2xl font-black text-sky-900 mb-2">Chào bé yêu! 🌟</h2>
              <p className="text-slate-600 font-medium mb-6">Chụp ảnh bài giảng của cô để thầy AI hướng dẫn bé học nhé!</p>
              
              <ImageUploader images={images} onImagesSelected={setImages} />

              <button
                disabled={images.length === 0}
                onClick={startAnalysis}
                className={`w-full mt-6 py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-95 ${
                  images.length > 0 
                  ? 'bg-yellow-400 text-sky-900 hover:bg-yellow-300 shadow-yellow-200' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                CHUẨN BỊ BÀI HỌC 📝
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-pink-100 p-4 rounded-2xl border-b-4 border-pink-200 flex flex-col items-center">
                <span className="text-3xl mb-2">🎨</span>
                <p className="text-[10px] font-black text-pink-700 uppercase">Học vui vẻ</p>
              </div>
              <div className="bg-indigo-100 p-4 rounded-2xl border-b-4 border-indigo-200 flex flex-col items-center">
                <span className="text-3xl mb-2">🎙️</span>
                <p className="text-[10px] font-black text-indigo-700 uppercase">Giao tiếp AI</p>
              </div>
            </div>
          </div>
        )}

        {state === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative">
              <div className="w-24 h-24 border-8 border-sky-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-24 h-24 border-8 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-3xl">📖</div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-sky-800">Thầy đang đọc bài...</h2>
              <p className="text-sky-500 font-medium animate-pulse">Đợi thầy một xíu nhé!</p>
            </div>
          </div>
        )}

        {state === AppState.READY && analysis && (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-white space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">✅</div>
              <h2 className="text-2xl font-black text-center text-sky-900">Sẵn sàng học rồi!</h2>
              
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
                <h3 className="text-xs font-black text-sky-400 uppercase mb-1">Chủ đề hôm nay:</h3>
                <p className="text-slate-700 font-bold">{analysis.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {analysis.keyVocabulary.slice(0, 4).map((word, i) => (
                  <div key={i} className="bg-yellow-50 p-2 rounded-lg text-center text-xs font-bold text-yellow-700 border border-yellow-100">
                    {word}
                  </div>
                ))}
              </div>

              <button
                onClick={startLearning}
                className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-sky-200 hover:bg-sky-500 transition-all active:scale-95"
              >
                BẮT ĐẦU HỌC THÔI 🚀
              </button>
            </div>
            
            <button onClick={reset} className="w-full text-center text-sky-400 font-bold text-sm uppercase tracking-widest py-2">
              Chụp lại bài khác
            </button>
          </div>
        )}

        {state === AppState.CHATTING && analysis && (
          <div className="fixed inset-0 bg-sky-50 z-50 flex flex-col">
            <header className="p-4 pt-10 flex items-center justify-between bg-white border-b-4 border-sky-100">
               <button onClick={reset} className="text-sky-500 font-black px-2 flex items-center gap-1">
                 <span className="text-xl">←</span> Thoát
               </button>
               <h1 className="font-black text-sky-800">Luyện nói tiếng Anh</h1>
               <div className="w-16"></div>
            </header>
            <div className="flex-1 overflow-y-auto">
              <LiveSession analysis={analysis} onClose={reset} />
            </div>
          </div>
        )}
      </main>

      {/* Persistent Bottom Tab Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 pb-8 pointer-events-none z-40">
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl p-3 rounded-3xl border-2 border-white shadow-2xl pointer-events-auto flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 flex-1 group" onClick={() => setState(AppState.IDLE)}>
            <div className={`w-12 h-10 rounded-xl flex items-center justify-center transition-all ${state === AppState.IDLE ? 'bg-sky-500 text-white shadow-lg shadow-sky-200 scale-110' : 'text-sky-300'}`}>
              <span className="text-xl">🏠</span>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${state === AppState.IDLE ? 'text-sky-600' : 'text-sky-300'}`}>Trang chủ</span>
          </button>
          
          <div className="w-px h-8 bg-sky-50"></div>
          
          <button className="flex flex-col items-center gap-1 flex-1 opacity-40 cursor-not-allowed">
            <div className="w-12 h-10 rounded-xl flex items-center justify-center text-sky-300">
              <span className="text-xl">🏆</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-sky-300">Thành tích</span>
          </button>
          
          <div className="w-px h-8 bg-sky-50"></div>
          
          <button className="flex flex-col items-center gap-1 flex-1 opacity-40 cursor-not-allowed">
            <div className="w-12 h-10 rounded-xl flex items-center justify-center text-sky-300">
              <span className="text-xl">⚙️</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-sky-300">Cài đặt</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
