# Conversion Notes: Vite React to Next.js

This document explains how the original Google Studio (Vite + React) project was converted to Next.js.

## Project Structure Mapping

### Original Structure → Next.js Structure

| Original Location | New Location | Notes |
|------------------|--------------|-------|
| `App.tsx` | `app/page.tsx` | Main application component converted to Next.js page |
| `index.tsx` | Removed | Next.js handles entry point automatically |
| `index.html` | `app/layout.tsx` | HTML structure moved to Next.js layout |
| `types.ts` | `lib/types.ts` | Types moved to lib directory |
| `services/audioUtils.ts` | `lib/services/audioUtils.ts` | Services moved to lib directory |
| `vite.config.ts` | `next.config.js` | Vite config replaced with Next.js config |
| `metadata.json` | `app/layout.tsx` (metadata) | Metadata integrated into layout |
| Inline styles in `index.html` | `app/globals.css` | Styles extracted to global CSS |

## Component Extraction

The monolithic `App.tsx` was broken down into reusable components:

1. **Header** (`components/Header.tsx`)
   - Displays JD branding and status
   - Contains engage/disengage button
   - Shows error status

2. **StatsPanel** (`components/StatsPanel.tsx`)
   - Displays task statistics
   - Shows pending tasks count
   - Completion ratio
   - Priority focus

3. **VoiceBuffer** (`components/VoiceBuffer.tsx`)
   - Shows live transcription
   - User input and JD output logs
   - Processing indicator

4. **TaskCard** (`components/TaskCard.tsx`)
   - Individual task display
   - Complete/delete actions
   - Time warnings and overdue indicators
   - Delete confirmation dialog

5. **CompletedTasks** (`components/CompletedTasks.tsx`)
   - Archive of completed tasks
   - Grid layout for completed items

## Key Changes

### 1. Client Components
All interactive components use `'use client'` directive because they:
- Use React hooks (useState, useEffect, useRef, useCallback)
- Access browser APIs (localStorage, AudioContext, MediaStream)
- Handle user interactions

### 2. Environment Variables
- Changed from `process.env.API_KEY` to `process.env.NEXT_PUBLIC_GEMINI_API_KEY`
- Next.js requires `NEXT_PUBLIC_` prefix for client-side environment variables
- Created `.env.example` for documentation

### 3. Fonts
- Replaced Google Fonts CDN links with Next.js `next/font/google`
- Uses Inter and JetBrains Mono with optimized loading
- Font variables available via CSS variables

### 4. Styling
- Tailwind CSS configuration moved to `tailwind.config.ts`
- Global styles in `app/globals.css`
- Custom animations preserved (pulse-glow, notify-pulse)
- All original Tailwind classes maintained exactly

### 5. Routing
- Single page application → Next.js App Router
- Main page at `app/page.tsx`
- Layout at `app/layout.tsx` with metadata

### 6. TypeScript Configuration
- Updated for Next.js compatibility
- Path aliases configured (`@/*` → `./*`)
- Next.js TypeScript plugin enabled

### 7. Build Configuration
- Vite replaced with Next.js build system
- PostCSS configured for Tailwind
- Next.js handles bundling, optimization, and code splitting

## Preserved Features

✅ **All visual design elements preserved:**
- Exact same colors (black, zinc shades, red accents)
- Same typography (Inter, JetBrains Mono)
- Same spacing and layout
- Same animations (pulse, glow effects)
- Same responsive breakpoints

✅ **All functionality preserved:**
- Voice assistant with live audio
- Task management (create, complete, delete)
- LocalStorage persistence
- Keyboard shortcuts (Ctrl+0)
- Real-time transcriptions
- Audio playback
- Time-based notifications

✅ **All UI components preserved:**
- Header with status indicator
- Stats panel
- Voice buffer
- Task cards with all interactions
- Completed tasks archive
- Footer

## Files Removed

- `index.html` - Replaced by `app/layout.tsx`
- `index.tsx` - Next.js handles entry point
- `vite.config.ts` - Replaced by `next.config.js`
- `metadata.json` - Integrated into layout

## Files Added

- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `app/layout.tsx` - Root layout with metadata
- `app/page.tsx` - Main page component
- `app/globals.css` - Global styles
- `components/` - Reusable component directory
- `lib/` - Shared utilities and types
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules

## Running the Project

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Add your Gemini API key:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```

## Notes

- All client-side code is properly marked with `'use client'`
- Server-side rendering is not used for the main page (requires browser APIs)
- LocalStorage access is guarded with `typeof window !== 'undefined'`
- Audio APIs require user interaction (browser security)
- The app maintains the same military/tech aesthetic as the original
