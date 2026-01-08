
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
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="grid grid-cols-12 h-full w-full">
          {[...Array(12)].map((_, i) => <div key={i} className="border-r border-white/20 h-full" />)}
        </div>
        <div className="absolute top-1/2 w-full h-px bg-white/20" />
      </div>

      <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 border-b border-zinc-900 pb-10 relative z-10">
        <div>
          <h1 className="text-6xl font-black tracking-tighter mb-2 uppercase italic leading-none text-white flex items-center gap-3">
            JD <span className="text-zinc-800">/</span> Executive Assistant
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-zinc-600 font-bold uppercase text-[9px] tracking-[0.4em]">Personal Executive Protocol</p>
            <div className="h-px w-8 bg-zinc-800" />
            <p className="text-zinc-500 font-mono text-[9px]">SESSION_AUTH: {userName ? userName.toUpperCase() : 'ANONYMOUS'}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            <div className="bg-zinc-950 border border-zinc-900 px-5 py-3 rounded-sm flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-zinc-800'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">{isLive ? 'LINK_ACTIVE' : 'SYSTEM_OFF'}</span>
            </div>
            <button
              onClick={toggleAssistant}
              className={`px-10 py-4 rounded-sm font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
                isLive 
                ? 'bg-red-950 text-red-500 border border-red-900/40 hover:bg-red-900 hover:text-white' 
                : 'bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]'
              }`}
            >
              {isLive ? 'Disengage [Ctrl+0]' : 'Engage [Ctrl+0]'}
            </button>
          </div>
          {errorStatus && (
            <span className="text-red-500 font-mono text-[8px] uppercase tracking-widest animate-pulse max-w-[200px] text-right">{errorStatus}</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12 relative z-10">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-sm relative overflow-hidden group">
            <h2 className="text-zinc-600 uppercase text-[9px] font-black tracking-widest mb-10 flex items-center gap-2">
              <span className="w-1 h-1 bg-zinc-600 rounded-full animate-ping" /> Logic_Core
            </h2>
            <div className="space-y-8">
              <div className="flex justify-between items-end border-b border-zinc-900/50 pb-5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Pending_Targets</span>
                <span className="text-4xl font-mono leading-none tracking-tighter">{pendingTasks.length}</span>
              </div>
              <div className="flex justify-between items-end border-b border-zinc-900/50 pb-5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Completion_Ratio</span>
                <span className="text-4xl font-mono leading-none tracking-tighter text-zinc-400">
                  {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}<span className="text-lg opacity-30">%</span>
                </span>
              </div>
              <div className="pt-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-3">Priority_Focus</span>
                <div className={`text-[11px] font-black uppercase px-4 py-2 border rounded-sm inline-block ${
                  urgentTask?.priority === TaskPriority.HIGH 
                  ? 'bg-red-950/20 text-red-500 border-red-900/50' 
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}>
                  {urgentTask ? (urgentTask.name.length > 20 ? urgentTask.name.substring(0, 20) + '...' : urgentTask.name) : 'OPERATIONAL_IDLE'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-sm min-h-[220px] relative flex flex-col">
            <h2 className="text-zinc-600 uppercase text-[9px] font-black tracking-widest mb-6 flex justify-between items-center">
              <span>Voice_Buffer</span>
              {isProcessing && <span className="text-white animate-pulse">PROC_</span>}
            </h2>
            
            <div className="flex-1 space-y-4 overflow-hidden">
              {isLive ? (
                <>
                  <div className={`transition-opacity duration-300 ${userInputLog ? 'opacity-100' : 'opacity-20'}`}>
                    <p className="text-zinc-600 text-[8px] uppercase font-black mb-1">User_Input</p>
                    <p className="text-zinc-200 text-xs italic font-medium leading-relaxed truncate-2-lines">
                      {userInputLog || "Listening..."}
                    </p>
                  </div>
                  <div className={`transition-opacity duration-300 ${jdOutputLog ? 'opacity-100' : 'opacity-20'}`}>
                    <p className="text-white text-[8px] uppercase font-black mb-1">JD_Output</p>
                    <p className="text-zinc-400 text-xs font-medium leading-relaxed truncate-2-lines">
                      {jdOutputLog || "Waiting..."}
                    </p>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-zinc-800 text-[9px] font-black uppercase tracking-widest text-center leading-loose">Standby_For_Auth<br/>[Ctrl+0]</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-zinc-600 uppercase text-[9px] font-black tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-zinc-800 rounded-full" /> Mission_Parameters
            </h2>
            <span className="text-[9px] text-zinc-800 font-mono tracking-tighter">PROTOCOL_V4.02_STABLE</span>
          </div>

          <div className="space-y-4">
            {pendingTasks.length === 0 && (
              <div className="py-40 text-center border border-dashed border-zinc-900 bg-zinc-950/20">
                <p className="text-zinc-800 text-xs font-black uppercase tracking-[0.5em]">Operational_Vacuum</p>
                <p className="text-zinc-900 text-[10px] mt-6 uppercase font-bold tracking-widest">Awaiting directive from primary user.</p>
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
                  className={`group relative bg-zinc-950 border p-7 transition-all duration-300 ${
                    isUrgent ? 'border-zinc-700 bg-gradient-to-r from-zinc-950 to-zinc-900/50' : 'border-zinc-900'
                  } ${isWarning ? 'notify-pulse border-white/20' : ''} ${isOverdue ? 'border-red-900/40 bg-red-950/5' : ''} ${isConfirmingDelete ? 'border-red-600 bg-red-950/10' : ''}`}
                >
                  <div className="flex items-center gap-10">
                    <button 
                      onClick={() => !isConfirmingDelete && handleCompleteTask(task.id)}
                      disabled={isConfirmingDelete}
                      className={`w-14 h-14 rounded-sm border border-zinc-800 flex items-center justify-center hover:bg-white hover:text-black hover:border-white transition-all duration-300 flex-shrink-0 ${isConfirmingDelete ? 'opacity-20 grayscale' : ''}`}
                    >
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>

                    <div className="flex-1 min-w-0">
                      {isConfirmingDelete ? (
                        <div className="flex flex-col gap-4">
                           <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                             <span className="text-xs font-black uppercase tracking-widest text-red-500">System Delete Confirmation Required</span>
                           </div>
                           <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-tight">Erase: <span className="text-zinc-200">{task.name}</span>?</p>
                           <div className="flex gap-4">
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="px-6 py-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-red-500 transition-colors"
                              >
                                Erase
                              </button>
                              <button 
                                onClick={() => setDeletingTaskId(null)}
                                className="px-6 py-2 bg-zinc-900 text-zinc-400 text-[9px] font-black uppercase tracking-widest rounded-sm border border-zinc-800 hover:text-white transition-colors"
                              >
                                Abort
                              </button>
                           </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-5 mb-3">
                            <h3 className="text-xl font-bold truncate tracking-tight uppercase italic text-zinc-100 group-hover:text-white">{task.name}</h3>
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-sm ${
                              task.priority === TaskPriority.HIGH ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-8 text-[10px] font-mono">
                            {minutesLeft !== null && (
                              <span className={`flex items-center gap-2.5 ${isWarning ? 'text-white' : isOverdue ? 'text-red-500' : 'text-zinc-600'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {isOverdue ? 'OVERDUE_CRITICAL' : `T-MINUS ${minutesLeft} MIN`}
                              </span>
                            )}
                            <span className="text-zinc-800 font-bold uppercase tracking-tighter">OBJ_ID: {task.id}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {!isConfirmingDelete && (
                      <button 
                        onClick={() => setDeletingTaskId(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-3 text-zinc-700 hover:text-red-500"
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
              <div className="mt-24 pt-12 border-t border-zinc-900/50">
                <div className="flex justify-between items-center mb-8">
                  <h4 className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.5em]">Operation_Archives</h4>
                  <span className="text-zinc-900 text-[9px] font-mono">COUNT: {completedTasks.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {completedTasks.slice(0, 6).map(t => (
                    <div key={t.id} className="bg-zinc-950/50 border border-zinc-900 p-5 flex items-center gap-5 opacity-40 hover:opacity-100 transition-opacity grayscale hover:grayscale-0 relative group/archive">
                      <div className="w-6 h-6 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
                         <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-bold uppercase truncate block text-zinc-400">{t.name}</span>
                        <span className="text-[8px] font-mono text-zinc-800">EXEC_SUCCESS</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteTask(t.id)}
                        className="opacity-0 group-hover/archive:opacity-100 transition-opacity p-2 text-zinc-800 hover:text-red-500 absolute right-2"
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
