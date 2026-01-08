<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# JD - AI Executive Assistant

A high-performance personal AI executive assistant named JD, focused on task completion, discipline, and voice-activated management. Built with Next.js, React, and Google's Gemini AI.

## Features

- 🎤 **Voice-Activated Assistant** - Real-time voice interaction using Google Gemini Live API
- 📋 **Task Management** - Create, complete, and delete tasks with priority levels
- 🔊 **Text-to-Speech** - Natural voice responses using Gemini TTS
- 📝 **Live Transcription** - Real-time audio transcription for both user and assistant
- ⏰ **Smart Notifications** - Time-based reminders and overdue warnings
- 💾 **Local Persistence** - Tasks and user preferences saved in browser storage
- ⌨️ **Keyboard Shortcuts** - Quick access with Ctrl+0 to engage/disengage

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

## Installation

1. **Clone or download the project**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create a `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   Or copy the example file:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your API key.

## Running the Project

### Development Mode
```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Project Structure

```
jd---ai-executive-assistant/
├── app/
│   ├── layout.tsx          # Root layout with metadata and fonts
│   ├── page.tsx             # Main application page
│   └── globals.css          # Global styles and Tailwind imports
├── components/
│   ├── Header.tsx           # Header with status and controls
│   ├── StatsPanel.tsx       # Task statistics panel
│   ├── VoiceBuffer.tsx      # Live transcription display
│   ├── TaskCard.tsx         # Individual task card component
│   └── CompletedTasks.tsx   # Completed tasks archive
├── lib/
│   ├── types.ts             # TypeScript type definitions
│   ├── constants.ts         # System instructions and tool declarations
│   └── services/
│       └── audioUtils.ts    # Audio processing utilities
├── public/                  # Static assets (if any)
├── next.config.js           # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Usage

1. **Start the application** and navigate to the homepage
2. **Click "Engage"** or press **Ctrl+0** to start the voice assistant
3. **Grant microphone permissions** when prompted
4. **Speak naturally** - JD will respond and help manage your tasks
5. **Create tasks** by voice - JD will ask for priority if not specified
6. **Complete tasks** by clicking the checkmark or telling JD
7. **Delete tasks** by hovering over a task and clicking the delete icon

## Design

The application features a dark, military-inspired aesthetic with:
- Black background with subtle grid overlay
- Zinc color palette for UI elements
- Red accents for high-priority items and warnings
- Monospace fonts for technical/status information
- Smooth animations and transitions
- Fully responsive design

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **AI:** Google Gemini API (@google/genai)
- **Language:** TypeScript
- **Audio:** Web Audio API

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (may have audio limitations)

**Note:** Microphone access is required for voice features. The app uses modern browser APIs that may not be available in older browsers.

## Conversion Notes

This project was converted from a Vite + React application to Next.js. See [CONVERSION_NOTES.md](./CONVERSION_NOTES.md) for detailed information about the conversion process.

## Troubleshooting

### API Key Issues
- Ensure your `.env.local` file exists and contains `NEXT_PUBLIC_GEMINI_API_KEY`
- Restart the dev server after adding/changing environment variables
- Check that your API key is valid and has the necessary permissions

### Audio Issues
- Grant microphone permissions when prompted
- Check browser console for audio-related errors
- Some browsers require HTTPS for microphone access (production)

### Build Issues
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`
- Ensure all dependencies are installed: `npm install`

## License

Private project - All rights reserved

## Support

For issues or questions, please refer to the original AI Studio project or Google Gemini API documentation.
# jd-ai-personal-assistant-v2
