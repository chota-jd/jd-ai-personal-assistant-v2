'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { decode, decodeAudioData, createPcmBlob } from '@/lib/services/audioUtils';
import { MODEL_NAME, TTS_MODEL, getSystemInstruction, toolDeclarations } from '@/lib/constants';
import Header from '@/components/Header';
import StatsPanel from '@/components/StatsPanel';
import VoiceBuffer from '@/components/VoiceBuffer';
import TaskCard from '@/components/TaskCard';
import CompletedTasks from '@/components/CompletedTasks';

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jd_tasks');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [userName, setUserName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jd_user_name');
    }
    return null;
  });
  
  const [isLive, setIsLive] = useState(false);
  const [userInputLog, setUserInputLog] = useState<string>('');
  const [jdOutputLog, setJdOutputLog] = useState<string>('');
  const [now, setNow] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isSessionActiveRef = useRef(false);

  const speak = useCallback(async (text: string) => {
    if (!text || text.trim() === '') return;
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        setJdOutputLog(text);
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: 'Kore' } 
            } 
          }
        }
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime) + 0.1;
        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
      }
    } catch (e: any) {
      console.error("JD Speech Error:", e);
      setJdOutputLog(text);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      setTasks(currentTasks => {
        let changed = false;
        const newTasks = currentTasks.map(t => {
          if (t.status === TaskStatus.PENDING && t.scheduledTimestamp && !t.notified) {
            const timeDiff = t.scheduledTimestamp - currentTime;
            if (timeDiff > 0 && timeDiff <= 10 * 60 * 1000) {
              speak(`JD here. ${userName || 'User'}, incoming priority: ${t.name}. Prepare for execution.`);
              changed = true;
              return { ...t, notified: true };
            }
          }
          return t;
        });
        return changed ? newTasks : currentTasks;
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [speak, userName]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jd_tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  useEffect(() => {
    if (typeof window !== 'undefined' && userName) {
      localStorage.setItem('jd_user_name', userName);
    }
  }, [userName]);

  const handleSetUserName = useCallback((fullName: string) => {
    const firstName = fullName.split(' ')[0];
    setUserName(firstName);
    return `Nice to meet you, ${firstName}. I'll remember your name.`;
  }, []);

  const handleCreateTask = useCallback((name: string, priority: TaskPriority, scheduledTime?: string) => {
    let timestamp: number | undefined;
    if (scheduledTime) {
      const parsed = Date.parse(scheduledTime);
      timestamp = !isNaN(parsed) ? parsed : undefined;
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      name,
      priority,
      deadline: scheduledTime,
      scheduledTimestamp: timestamp,
      notified: false,
      status: TaskStatus.PENDING,
      createdAt: Date.now()
    };
    setTasks(prev => [newTask, ...prev]);
    return `Task added. ${name} at ${scheduledTime || 'unspecified time'}. Priority: ${priority}. I will remind you every 60 minutes until it is completed.`;
  }, []);

  const handleCompleteTask = useCallback((identifier: string) => {
    let matched = false;
    setTasks(prev => {
      const searchStr = identifier.toLowerCase();
      const taskIndex = prev.findIndex(t => 
        t.status === TaskStatus.PENDING && 
        (t.id.toLowerCase() === searchStr || t.name.toLowerCase().includes(searchStr))
      );
      
      if (taskIndex === -1) return prev;
      
      matched = true;
      const newTasks = [...prev];
      newTasks[taskIndex] = { ...newTasks[taskIndex], status: TaskStatus.COMPLETED };
      return newTasks;
    });
    
    if (matched) {
      const completionPhrase = `Target neutralized. Excellent work, ${userName || 'User'}. What is the next objective?`;
      if (!isLive) speak(completionPhrase);
      return completionPhrase;
    }
    return "Negative. Task identifier not found in active sectors.";
  }, [speak, isLive, userName]);

  const handleDeleteTask = useCallback((identifier: string) => {
    let found = false;
    setTasks(prev => {
      const searchStr = identifier.toLowerCase();
      const index = prev.findIndex(t => t.id.toLowerCase() === searchStr || t.name.toLowerCase().includes(searchStr));
      if (index === -1) return prev;
      found = true;
      const newTasks = [...prev];
      newTasks.splice(index, 1);
      return newTasks;
    });
    
    if (found) {
      setDeletingTaskId(null);
      const msg = "Task permanently erased from system memory.";
      if (!isLive) speak(msg);
      return msg;
    }
    return "Task not found.";
  }, [speak, isLive]);

  const stopAssistant = useCallback(() => {
    isSessionActiveRef.current = false;
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      try { inputAudioContextRef.current.close(); } catch (e) {}
      inputAudioContextRef.current = null;
    }
    for (const source of sourcesRef.current.values()) {
      try { source.stop(); } catch (e) {}
    }
    sourcesRef.current.clear();
    
    setIsLive(false);
    setUserInputLog('');
    setJdOutputLog('');
    setIsProcessing(false);
  }, []);

  const startAssistant = useCallback(async () => {
    if (isLive) return;
    setErrorStatus(null);
    isSessionActiveRef.current = true;
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        setErrorStatus("Auth Error: API key not configured.");
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;
      
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const outputCtx = audioContextRef.current;
      
      await inputCtx.resume();
      await outputCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isSessionActiveRef.current) {
        stream.getTracks().forEach(t => t.stop());
        inputCtx.close();
        return;
      }
      mediaStreamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            if (!isSessionActiveRef.current) return;
            setIsLive(true);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromise.then(s => {
                try {
                  s.sendRealtimeInput({ media: pcmBlob });
                } catch (err) {
                  // Connection closed while frame in flight
                }
              }).catch(() => {
                // Ignore errors from failed initial connection
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            
            if (!userName) {
              speak("Hello, I'm JD. What is your name?");
            } else {
              speak(`Hi ${userName}, how can I help you today?`);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!isSessionActiveRef.current) return;
            
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.toolCall && message.toolCall.functionCalls) {
              setIsProcessing(true);
              for (const fc of message.toolCall.functionCalls) {
                let result = "Execution failure.";
                if (fc.name === 'set_user_name') {
                  result = handleSetUserName((fc.args as any).full_name);
                } else if (fc.name === 'create_task') {
                  const args = fc.args as any;
                  result = handleCreateTask(args.name, args.priority as TaskPriority, args.scheduled_time);
                } else if (fc.name === 'mark_task_complete') {
                  const args = fc.args as any;
                  result = handleCompleteTask(args.task_identifier);
                } else if (fc.name === 'delete_task') {
                  const args = fc.args as any;
                  result = handleDeleteTask(args.task_identifier);
                }
                
                sessionPromise.then(s => {
                  try {
                    s.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result } }
                    });
                  } catch (e) {}
                }).catch(() => {});
              }
              setTimeout(() => setIsProcessing(false), 800);
            }

            if (message.serverContent?.inputTranscription) {
              setUserInputLog(prev => (prev + ' ' + message.serverContent!.inputTranscription!.text).trim());
            }
            if (message.serverContent?.outputTranscription) {
              setJdOutputLog(prev => (prev + ' ' + message.serverContent!.outputTranscription!.text).trim());
            }
            if (message.serverContent?.turnComplete) {
              setTimeout(() => {
                setUserInputLog('');
                setJdOutputLog('');
              }, 4000);
            }
          },
          onclose: () => {
            stopAssistant();
          },
          onerror: (e: any) => {
            console.error("Live Assistant error callback:", e);
            setErrorStatus(`Protocol Interrupt: ${e.message || 'Connection lost'}`);
            stopAssistant();
          }
        },
        config: {
          systemInstruction: getSystemInstruction(userName),
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: toolDeclarations }],
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: 'Kore' } 
            } 
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        }
      });

      sessionPromise.then(s => {
        if (isSessionActiveRef.current) {
          sessionRef.current = s;
        } else {
          try { s.close(); } catch(e) {}
        }
      }).catch(err => {
        console.error("Live Assistant connection failed:", err);
        setErrorStatus("Auth Error: Critical Link Failure.");
        stopAssistant();
      });

    } catch (err: any) {
      console.error("Assistant start failed:", err);
      setErrorStatus(`System Error: ${err.message || 'Resource denied'}`);
      stopAssistant();
    }
  }, [handleCreateTask, handleCompleteTask, handleDeleteTask, handleSetUserName, isLive, speak, stopAssistant, userName]);

  const toggleAssistant = useCallback(() => {
    if (isLive) {
      stopAssistant();
    } else {
      startAssistant();
    }
  }, [isLive, startAssistant, stopAssistant]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        toggleAssistant();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAssistant]);

  const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
  const urgentTask = [...pendingTasks].sort((a, b) => {
    const pMap = { [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
    return pMap[b.priority] - pMap[a.priority];
  })[0];

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="grid grid-cols-12 h-full w-full">
          {[...Array(12)].map((_, i) => <div key={i} className="border-r border-white/20 h-full" />)}
        </div>
        <div className="absolute top-1/2 w-full h-px bg-white/20" />
      </div>

      <Header 
        userName={userName}
        isLive={isLive}
        errorStatus={errorStatus}
        onToggleAssistant={toggleAssistant}
      />

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12 relative z-10">
        <div className="lg:col-span-1 space-y-8">
          <StatsPanel 
            tasks={tasks}
            pendingTasks={pendingTasks}
            completedTasks={completedTasks}
            urgentTask={urgentTask}
          />

          <VoiceBuffer 
            isLive={isLive}
            isProcessing={isProcessing}
            userInputLog={userInputLog}
            jdOutputLog={jdOutputLog}
          />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-zinc-600  text-base font-semibold tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-zinc-800 rounded-full" /> Todo List
            </h2>
          </div>

          <div className="space-y-4">
            {pendingTasks.length === 0 && (
              <div className="py-40 text-center border border-dashed border-zinc-900 bg-zinc-950/20">
                <p className="text-zinc-800 text-xs font-black uppercase tracking-[0.5em]">Operational_Vacuum</p>
                <p className="text-zinc-900 text-[10px] mt-6 uppercase font-bold tracking-widest">Awaiting directive from primary user.</p>
              </div>
            )}

            {pendingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isUrgent={urgentTask?.id === task.id}
                now={now}
                deletingTaskId={deletingTaskId}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
                onConfirmDelete={setDeletingTaskId}
                onCancelDelete={() => setDeletingTaskId(null)}
              />
            ))}

            <CompletedTasks 
              completedTasks={completedTasks}
              onDelete={handleDeleteTask}
            />
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto mt-40 pt-12 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-800 text-[9px] font-black uppercase tracking-[0.4em]">
        <div className="flex items-center gap-6">
          <span>Operational_Logic_Enabled</span>
          <div className="w-1 h-1 bg-zinc-900 rounded-full" />
          <span>System_v4.02-STABLE</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-900 font-mono italic lowercase tracking-normal">
          &lt;JD_AI_ASSISTANT_ENGINE_LOADED&gt;
        </div>
      </footer>
    </div>
  );
}
