import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, Blob, LiveServerMessage } from '@google/genai';
import { AnalysisResult } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio-converter';
import { Waveform } from './Waveform';

interface Props {
  analysis: AnalysisResult;
  onClose: () => void;
}

export const LiveSession: React.FC<Props> = ({ analysis, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [status, setStatus] = useState('Đang kết nối với thầy giáo...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (sourcesRef.current) {
      sourcesRef.current.forEach(s => {
        try { s.stop(); } catch(e) {}
      });
      sourcesRef.current.clear();
    }
    if (audioContextRef.current) {
      audioContextRef.current.input.close();
      audioContextRef.current.output.close();
    }
    setIsActive(false);
  }, []);

  const startSession = async () => {
    try {
      setErrorMsg(null);
      
      // 1. Kiểm tra Secure Context (HTTPS)
      if (!window.isSecureContext) {
        throw new Error("LỖI BẢO MẬT: Trình duyệt chỉ cho phép dùng Micro qua HTTPS hoặc localhost. Hãy kiểm tra lại địa chỉ web của bạn.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inputAudioContext, output: outputAudioContext };

      // 2. Yêu cầu quyền Micro với xử lý lỗi chi tiết
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        if (err.name === 'NotAllowedError') throw new Error("Bạn đã từ chối quyền dùng Micro. Hãy bật lại trong cài đặt trình duyệt nhé!");
        if (err.name === 'NotFoundError') throw new Error("Không tìm thấy thiết bị Micro nào trên máy của bạn.");
        throw err;
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Thầy giáo đã sẵn sàng! Hãy chào thầy nhé!');
            setIsActive(true);
            
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setIsModelSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioContext.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error('Session error:', e);
            setStatus('Lỗi kết nối. Thầy giáo đang bận một xíu.');
          },
          onclose: () => {
            setStatus('Buổi học kết thúc!');
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `You are a friendly, enthusiastic English teacher for a young child (age 5-8). 
          Today's lesson is based on these notes: ${analysis.summary}. 
          Keywords to focus on: ${analysis.keyVocabulary.join(', ')}. 
          Phrases: ${analysis.suggestedPhrases.join(', ')}.
          
          Guidelines:
          - Speak slowly and clearly.
          - Be extremely encouraging.
          - Ask simple questions like "Can you repeat after me?" or "What color is the apple?".
          - Use short sentences.
          - Mix simple English with occasional Vietnamese words of praise if needed, but focus on English.
          - Start by introducing yourself and the topic today.`
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể khởi động Micro.');
      setStatus('Lỗi khởi động.');
    }
  };

  useEffect(() => {
    startSession();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-6">
      <div className="relative">
        <div className={`w-48 h-48 rounded-full bg-sky-100 flex items-center justify-center border-8 transition-all duration-500 ${isModelSpeaking ? 'border-yellow-400 scale-105 shadow-2xl' : 'border-sky-300'}`}>
          <span className="text-8xl">👨‍🏫</span>
        </div>
        {isActive && !errorMsg && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
             <Waveform active={isActive || isModelSpeaking} />
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-sky-800">{status}</h2>
        {errorMsg ? (
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 max-w-xs mx-auto">
            <p className="text-red-600 text-sm font-bold">{errorMsg}</p>
            <button 
              onClick={startSession}
              className="mt-2 text-xs bg-red-600 text-white px-3 py-1 rounded-full font-bold uppercase"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <p className="text-sky-600 font-medium italic">"Lắng nghe thầy giáo và trả lời nhé!"</p>
        )}
      </div>

      {!errorMsg && (
        <div className="w-full bg-white rounded-2xl p-4 shadow-inner border-2 border-sky-100 max-h-48 overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-bold text-sky-400 uppercase mb-2">Từ vựng hôm nay:</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.keyVocabulary.map((word, i) => (
              <span key={i} className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-sm font-bold border border-sky-200">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={onClose}
        className="px-8 py-3 bg-red-100 text-red-600 font-bold rounded-full hover:bg-red-200 transition-colors shadow-sm"
      >
        Kết thúc buổi học 🏠
      </button>
    </div>
  );
};