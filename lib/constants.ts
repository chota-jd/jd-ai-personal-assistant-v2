import { Type, FunctionDeclaration } from '@google/genai';

export const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
export const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export const getSystemInstruction = (userName: string | null) => `You are JD, a world-class personal AI executive assistant. 
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

export const toolDeclarations: FunctionDeclaration[] = [
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
