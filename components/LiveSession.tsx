
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
  const [status, setStatus] = useState('Connecting to Teacher...');
  
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsActive(false);
  }, []);

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inputAudioContext, output: outputAudioContext };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Teacher is here! Say Hello!');
            setIsActive(true);
            
            // Setup Mic Stream
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
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error('Session error:', e);
            setStatus('Oops! Teacher is busy. Try again.');
          },
          onclose: () => {
            setStatus('Class finished!');
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
    } catch (err) {
      console.error(err);
      setStatus('Failed to start microphone. Please check permissions.');
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
        {isActive && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
             <Waveform active={isActive || isModelSpeaking} />
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-sky-800">{status}</h2>
        <p className="text-sky-600 font-medium italic">"Listen to Teacher and talk back!"</p>
      </div>

      <div className="w-full bg-white rounded-2xl p-4 shadow-inner border-2 border-sky-100 max-h-48 overflow-y-auto custom-scrollbar">
        <h3 className="text-xs font-bold text-sky-400 uppercase mb-2">Today's Words:</h3>
        <div className="flex flex-wrap gap-2">
          {analysis.keyVocabulary.map((word, i) => (
            <span key={i} className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-sm font-bold border border-sky-200">
              {word}
            </span>
          ))}
        </div>
      </div>

      <button 
        onClick={onClose}
        className="px-8 py-3 bg-red-100 text-red-600 font-bold rounded-full hover:bg-red-200 transition-colors shadow-sm"
      >
        Finish Class 🏠
      </button>
    </div>
  );
};
