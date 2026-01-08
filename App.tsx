
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration, LiveServerMessage, Modality } from '@google/genai';
import { Task, TaskPriority, TaskStatus } from './types';
import { decode, decodeAudioData, createPcmBlob } from './services/audioUtils';

// --- Constants ---
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

const getSystemInstruction = (userName: string | null) => `You are JD, a world-class personal AI executive assistant. 
Your mission is total task mastery, discipline, and efficiency through direct one-to-one communication.

User Context:
- The current user's name is: ${userName || 'Unknown (Ask for name immediately)'}.

Core Operational Protocols:
1. PERSONALITY: Firm, elite, professional, and slightly motivating. No fluff. 
2. NAME PROTOCOL: 
   - If the user's name is Unknown, your primary objective is to learn it. 
   - Use the tool 'set_user_name' once they tell you who they are.
   - Once known, always address the user by their first name.
3. MULTI-TURN TASK CREATION: 
   - When the user mentions a task, if they haven't specified a priority, you MUST ask: "What is the priority for this task? High, Medium, or Low?"
   - Once provided, call the 'create_task' tool.
4. CONFIRMATION DIALOGUE: 
   - When a task is added, respond exactly with: 
     "Task added. [Task Name] at [Time]. Priority: [Priority]. I will remind you every 60 minutes until it is completed."
5. COMPLETION: When a task is marked as complete, you MUST say: 'Target neutralized. Excellent work, [User Name]. What is the next objective?'
6. DELETION: When asked to delete a task, you MUST first ask: 'Are you sure you want to permanently delete this objective? Confirmation required.' and wait for his 'yes' or 'proceed' before executing the deletion tool.
7. TOOL USE: 
   - Use 'create_task' only when you have both Name and Priority.
   - Use 'mark_task_complete' when the user confirms a goal is met.
   - Use 'delete_task' to remove an objective from the queue.
   - Use 'set_user_name' to record the user's identity.
8. TIME: Convert relative times (e.g., "7 PM") to absolute ISO strings based on the current context.`;

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'set_user_name',
    description: 'Set the name of the user for personalization.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        full_name: { type: Type.STRING, description: 'The full name of the user.' }
      },
      required: ['full_name']
    }
  },
  {
    name: 'create_task',
    description: 'Add a new objective once name and priority are confirmed.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'The task description.' },
        priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
        scheduled_time: { type: Type.STRING, description: 'ISO 8601 string or absolute time.' }
      },
      required: ['name', 'priority']
    }
  },
  {
    name: 'mark_task_complete',
    description: 'Mark a target as neutralized/completed.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        task_identifier: { type: Type.STRING, description: 'The name or ID of the task.' }
      },
      required: ['task_identifier']
    }
  },
  {
    name: 'delete_task',
    description: 'Permanently remove a task from the system.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        task_identifier: { type: Type.STRING, description: 'The name or ID of the task to be deleted.' }
      },
      required: ['task_identifier']
    }
  }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('jd_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('jd_user_name');
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    localStorage.setItem('jd_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (userName) localStorage.setItem('jd_user_name', userName);
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
              // CRITICAL: Solely rely on sessionPromise resolves
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
    <div className="min-h-screen text-white p-6 md:p-12 font-sans overflow-hidden relative">
      {/* Animated background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-secondary-900/30 to-accent-900/30 animate-pulse" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>
      
      {/* Grid pattern overlay */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]">
        <div className="grid grid-cols-12 h-full w-full">
          {[...Array(12)].map((_, i) => <div key={i} className="border-r border-white/30 h-full" />)}
        </div>
        <div className="absolute top-1/2 w-full h-px bg-white/30" />
      </div>

      <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 border-b border-white/10 pb-10 relative z-10">
        <div>
          <h1 className="text-6xl font-black tracking-tighter mb-2 uppercase italic leading-none flex items-center gap-3">
            <span className="gradient-text">JD</span>
            <span className="text-white/30">/</span>
            <span className="text-white/90">Executive Assistant</span>
          </h1>
          <div className="flex items-center gap-4 mt-3">
            <p className="text-primary-300/80 font-bold uppercase text-[9px] tracking-[0.4em]">Personal Executive Protocol</p>
            <div className="h-px w-8 bg-gradient-to-r from-primary-500/50 to-transparent" />
            <p className="text-white/60 font-mono text-[9px]">SESSION_AUTH: <span className="text-primary-400">{userName ? userName.toUpperCase() : 'ANONYMOUS'}</span></p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            <div className="glass px-5 py-3 rounded-lg flex items-center gap-3 shadow-lg">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-white/20'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/90">{isLive ? 'LINK_ACTIVE' : 'SYSTEM_OFF'}</span>
            </div>
            <button
              onClick={toggleAssistant}
              className={`px-10 py-4 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-lg ${
                isLive 
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border border-red-500/50 hover:from-red-500 hover:to-red-600 hover:shadow-red-500/50 active:scale-95' 
                : 'bg-gradient-to-r from-white to-gray-100 text-gray-900 hover:from-gray-100 hover:to-white active:scale-95 shadow-white/20 hover:shadow-white/30'
              }`}
            >
              {isLive ? 'Disengage [Ctrl+0]' : 'Engage [Ctrl+0]'}
            </button>
          </div>
          {errorStatus && (
            <span className="text-red-400 font-mono text-[8px] uppercase tracking-widest animate-pulse max-w-[200px] text-right bg-red-500/10 px-3 py-1 rounded border border-red-500/30">{errorStatus}</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12 relative z-10">
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-strong p-8 rounded-xl relative overflow-hidden group shadow-2xl border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 opacity-50" />
            <h2 className="text-primary-300/90 uppercase text-[9px] font-black tracking-widest mb-10 flex items-center gap-2 relative z-10">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-ping shadow-lg shadow-primary-400/50" /> Logic_Core
            </h2>
            <div className="space-y-8 relative z-10">
              <div className="flex justify-between items-end border-b border-white/10 pb-5">
                <span className="text-[10px] text-white/70 font-bold uppercase">Pending_Targets</span>
                <span className="text-4xl font-mono leading-none tracking-tighter bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">{pendingTasks.length}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-5">
                <span className="text-[10px] text-white/70 font-bold uppercase">Completion_Ratio</span>
                <span className="text-4xl font-mono leading-none tracking-tighter bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}<span className="text-lg opacity-50">%</span>
                </span>
              </div>
              <div className="pt-2">
                <span className="text-[10px] text-white/70 font-bold uppercase block mb-3">Priority_Focus</span>
                <div className={`text-[11px] font-black uppercase px-4 py-2 rounded-lg inline-block transition-all ${
                  urgentTask?.priority === TaskPriority.HIGH 
                  ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border border-red-400/50 shadow-lg shadow-red-500/20' 
                  : 'glass text-white/60 border border-white/10'
                }`}>
                  {urgentTask ? (urgentTask.name.length > 20 ? urgentTask.name.substring(0, 20) + '...' : urgentTask.name) : 'OPERATIONAL_IDLE'}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-strong p-8 rounded-xl min-h-[220px] relative flex flex-col shadow-2xl border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-cyan-500/5 opacity-50 rounded-xl" />
            <h2 className="text-primary-300/90 uppercase text-[9px] font-black tracking-widest mb-6 flex justify-between items-center relative z-10">
              <span>Voice_Buffer</span>
              {isProcessing && <span className="text-primary-400 animate-pulse flex items-center gap-1">
                <span className="w-1 h-1 bg-primary-400 rounded-full animate-ping" />PROC_
              </span>}
            </h2>
            
            <div className="flex-1 space-y-4 overflow-hidden relative z-10">
              {isLive ? (
                <>
                  <div className={`transition-all duration-300 ${userInputLog ? 'opacity-100' : 'opacity-30'}`}>
                    <p className="text-primary-300/80 text-[8px] uppercase font-black mb-1">User_Input</p>
                    <p className="text-white/90 text-xs italic font-medium leading-relaxed truncate-2-lines">
                      {userInputLog || "Listening..."}
                    </p>
                  </div>
                  <div className={`transition-all duration-300 ${jdOutputLog ? 'opacity-100' : 'opacity-30'}`}>
                    <p className="text-accent-300/80 text-[8px] uppercase font-black mb-1">JD_Output</p>
                    <p className="text-white/80 text-xs font-medium leading-relaxed truncate-2-lines">
                      {jdOutputLog || "Waiting..."}
                    </p>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-white/40 text-[9px] font-black uppercase tracking-widest text-center leading-loose">Standby_For_Auth<br/>[Ctrl+0]</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-cyan-300/90 uppercase text-[9px] font-black tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" /> Mission_Parameters
            </h2>
            <span className="text-[9px] text-white/50 font-mono tracking-tighter bg-white/5 px-3 py-1 rounded border border-white/10">PROTOCOL_V4.02_STABLE</span>
          </div>

          <div className="space-y-4">
            {pendingTasks.length === 0 && (
              <div className="py-40 text-center border-2 border-dashed border-white/20 glass rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5" />
                <p className="text-white/50 text-xs font-black uppercase tracking-[0.5em] relative z-10">Operational_Vacuum</p>
                <p className="text-white/40 text-[10px] mt-6 uppercase font-bold tracking-widest relative z-10">Awaiting directive from primary user.</p>
              </div>
            )}

            {pendingTasks.map((task) => {
              const isUrgent = urgentTask?.id === task.id;
              const diffMs = task.scheduledTimestamp ? task.scheduledTimestamp - now : null;
              const minutesLeft = diffMs ? Math.ceil(diffMs / 60000) : null;
              const isOverdue = minutesLeft !== null && minutesLeft <= 0;
              const isWarning = minutesLeft !== null && minutesLeft <= 10 && !isOverdue;
              const isConfirmingDelete = deletingTaskId === task.id;

              return (
                <div 
                  key={task.id} 
                  className={`group relative glass-strong border p-7 rounded-xl transition-all duration-300 shadow-lg ${
                    isUrgent ? 'border-cyan-400/50 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 shadow-cyan-500/20' : 'border-white/10'
                  } ${isWarning ? 'notify-pulse border-yellow-400/50 shadow-yellow-500/30' : ''} ${isOverdue ? 'border-red-400/50 bg-gradient-to-r from-red-500/10 to-red-600/10 shadow-red-500/20' : ''} ${isConfirmingDelete ? 'border-red-500/70 bg-red-500/10 shadow-red-500/30' : ''} hover:shadow-xl hover:scale-[1.01]`}
                >
                  <div className="flex items-center gap-10">
                    <button 
                      onClick={() => !isConfirmingDelete && handleCompleteTask(task.id)}
                      disabled={isConfirmingDelete}
                      className={`w-14 h-14 rounded-lg border-2 border-white/20 flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/40 hover:to-cyan-500/40 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 flex-shrink-0 ${isConfirmingDelete ? 'opacity-20 grayscale' : ''}`}
                    >
                      <svg className="w-7 h-7 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>

                    <div className="flex-1 min-w-0">
                      {isConfirmingDelete ? (
                        <div className="flex flex-col gap-4">
                           <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-400/50" />
                             <span className="text-xs font-black uppercase tracking-widest text-red-300">System Delete Confirmation Required</span>
                           </div>
                           <p className="text-[10px] text-white/70 uppercase font-mono tracking-tight">Erase: <span className="text-white">{task.name}</span>?</p>
                           <div className="flex gap-4">
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:from-red-500 hover:to-red-600 transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
                              >
                                Erase
                              </button>
                              <button 
                                onClick={() => setDeletingTaskId(null)}
                                className="px-6 py-2 glass text-white/80 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/20 hover:bg-white/10 hover:text-white transition-all"
                              >
                                Abort
                              </button>
                           </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-5 mb-3">
                            <h3 className="text-xl font-bold truncate tracking-tight uppercase italic text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:via-blue-300 group-hover:to-purple-300">{task.name}</h3>
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${
                              task.priority === TaskPriority.HIGH 
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/40' 
                                : task.priority === TaskPriority.MEDIUM
                                ? 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white shadow-lg shadow-yellow-500/30'
                                : 'glass text-white/70 border border-white/10'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-8 text-[10px] font-mono">
                            {minutesLeft !== null && (
                              <span className={`flex items-center gap-2.5 ${isWarning ? 'text-yellow-300' : isOverdue ? 'text-red-300' : 'text-white/60'}`}>
                                <svg className={`w-4 h-4 ${isWarning ? 'text-yellow-400' : isOverdue ? 'text-red-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {isOverdue ? 'OVERDUE_CRITICAL' : `T-MINUS ${minutesLeft} MIN`}
                              </span>
                            )}
                            <span className="text-white/40 font-bold uppercase tracking-tighter">OBJ_ID: <span className="text-cyan-300/80">{task.id}</span></span>
                          </div>
                        </>
                      )}
                    </div>

                    {!isConfirmingDelete && (
                      <button 
                        onClick={() => setDeletingTaskId(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all p-3 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        title="Delete Task"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {completedTasks.length > 0 && (
              <div className="mt-24 pt-12 border-t border-white/10">
                <div className="flex justify-between items-center mb-8">
                  <h4 className="text-[10px] text-white/60 font-black uppercase tracking-[0.5em]">Operation_Archives</h4>
                  <span className="text-white/50 text-[9px] font-mono bg-white/5 px-3 py-1 rounded border border-white/10">COUNT: {completedTasks.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {completedTasks.slice(0, 6).map(t => (
                    <div key={t.id} className="glass p-5 flex items-center gap-5 opacity-60 hover:opacity-100 transition-all grayscale hover:grayscale-0 relative group/archive rounded-lg border border-white/10 hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/10">
                      <div className="w-6 h-6 bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-400/50 flex items-center justify-center rounded-lg">
                         <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-bold uppercase truncate block text-white/80">{t.name}</span>
                        <span className="text-[8px] font-mono text-emerald-400/60">EXEC_SUCCESS</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteTask(t.id)}
                        className="opacity-0 group-hover/archive:opacity-100 transition-all p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg absolute right-2"
                      >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto mt-40 pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-[9px] font-black uppercase tracking-[0.4em] relative z-10">
        <div className="flex items-center gap-6">
          <span className="text-white/50">Operational_Logic_Enabled</span>
          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-white/50">System_v4.02-STABLE</span>
        </div>
        <div className="flex items-center gap-2 text-white/30 font-mono italic lowercase tracking-normal">
          &lt;JD_AI_ASSISTANT_ENGINE_LOADED&gt;
        </div>
      </footer>
    </div>
  );
}
