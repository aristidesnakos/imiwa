# Japanese Text Comprehension & Vocabulary Builder - MVP Product Requirements Document

## Project Overview

**Product Name:** Imiwa - Reading Fluency Builder  
**Vision:** A simple text-to-vocabulary learning tool that helps users understand Japanese content by extracting text from images and testing their knowledge of unknown words.

**Target Users:** Japanese language learners who encounter text they want to read but don't fully understand, seeking to build vocabulary from authentic content rather than generic word lists.

## Core User Flow

**Primary Journey:**
1. User uploads image of text they want to read
2. System extracts Japanese text via OCR
3. Text is parsed into individual words with meanings
4. User marks words as "known" or "unknown"
5. System generates a 5-question quiz from unknown words
6. User completes quiz and sees results
7. User can upload new text to repeat process

## MVP Core Features

### 1. Image Upload & Text Extraction 📸
**Primary Function:** Extract Japanese text from uploaded images

**User Stories:**
- As a user, I can upload an image containing Japanese text
- As a user, I can see the extracted text displayed clearly

**Technical Implementation:**
- **OCR Provider:** Google Gemini 2.5 Flash API
- **File Upload:** Standard image upload (JPG, PNG, WEBP)
- **Text Display:** Show extracted text in readable format

**Acceptance Criteria:**
- ✅ Support common image formats
- ✅ Extract text accurately from clear images
- ✅ Display extracted text to user

### 2. Word Parsing & Display 🔤
**Primary Function:** Break text into individual words with meanings

**User Stories:**
- As a user, I can see text broken into individual words
- As a user, I can see the meaning of each word

**Technical Implementation:**
- **Text Segmentation:** Basic word splitting using TinySegmenter
- **Dictionary Lookup:** Static word list with common Japanese words (5k entries)
- **Word Display:** Simple list showing word and meaning

**Acceptance Criteria:**
- ✅ Segment text into individual words
- ✅ Show English meaning for each word
- ✅ Handle basic word forms

### 3. Word Categorization 🎯
**Primary Function:** Let users mark words as known or unknown

**User Stories:**
- As a user, I can mark words as "known" or "unknown"
- As a user, I can see visual feedback for my selections
- As a user, I can change my selections before the quiz

**Technical Implementation:**
- **Interface:** Simple buttons for each word (Known/Unknown)
- **State Management:** Track selections in local state
- **Visual Feedback:** Color coding (green=known, red=unknown)

**Acceptance Criteria:**
- ✅ Provide clear categorization interface
- ✅ Show count of known vs unknown words
- ✅ Allow users to modify selections

### 4. Simple Quiz System 📝
**Primary Function:** Generate basic quiz from unknown words

**User Stories:**
- As a user, I can take a 5-question quiz on unknown words
- As a user, I can see my score after completing the quiz

**Technical Implementation:**
- **Quiz Logic:** Fixed 5 questions from unknown words
- **Question Type:** Multiple choice (word → meaning)
- **Scoring:** Simple correct/incorrect counting

**Acceptance Criteria:**
- ✅ Generate 5 questions from unknown words
- ✅ Show multiple choice options
- ✅ Display final score
- ✅ Handle case when <5 unknown words exist

## Technical Architecture

### Tech Stack Integration
**Frontend Framework:** Next.js 15 with App Router  
**UI Components:** Radix UI + Tailwind CSS (existing)  
**AI Integration:** Google Gemini 2.5 Flash API  
**State Management:** React local state (no persistence)  
**Authentication:** None required for MVP  
**Database:** None required for MVP  

### API Integration Requirements

#### Gemini 2.5 Flash Setup
```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function extractTextFromImage(imageBuffer: Buffer) {
  const result = await model.generateContent([
    "Extract all Japanese text from this image. Return only the text, preserving line breaks and formatting.",
    { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } }
  ]);
  return result.response.text();
}
```

#### Text Processing Flow
1. **Image Upload** → Next.js API route
2. **Gemini OCR** → Extract Japanese text
3. **Text Segmentation** → Split into words using TinySegmenter
4. **Dictionary Lookup** → Match words with static word list
5. **User Categorization** → Mark words as known/unknown
6. **Quiz Generation** → Create 5-question quiz from unknown words
7. **Results Display** → Show score and allow new upload

### Component Structure
```
app/reader/
├── page.tsx                    # Main application page
└── components/
    ├── ImageUpload.tsx        # Image upload interface
    ├── TextDisplay.tsx        # Show extracted text
    ├── WordList.tsx           # Display words with meanings
    ├── WordCard.tsx           # Individual word with known/unknown buttons
    ├── Quiz.tsx               # Simple 5-question quiz
    └── Results.tsx            # Quiz results display
```

### Data Models
```typescript
// types/vocabulary.ts
export interface Word {
  text: string;
  meaning: string;
  isKnown?: boolean;
}

export interface QuizQuestion {
  word: string;
  correctAnswer: string;
  options: string[];
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
}
```


## MVP Constraints & Limitations

### Scope Limitations
- **Language Support:** Japanese text only
- **Text Complexity:** Simple, clear text works best
- **Image Quality:** Requires clear, well-lit images
- **Dictionary Scope:** Basic vocabulary (5k most common words)
- **No User Accounts:** Session-based only, no data persistence
- **No Progress Tracking:** Each session is independent

### Technical Constraints
- **API Limits:** Respect Gemini API rate limits
- **Image Size:** 10MB maximum per upload
- **Processing Time:** Target <10 seconds for complete flow
- **Dictionary Performance:** Static word list for fast lookup
- **Mobile Experience:** Responsive web app only

## Success Metrics

### Core Functionality
- **Primary Goal:** Users complete the full flow (upload → categorize → quiz)
- **OCR Success:** 90%+ text extraction accuracy for clear images
- **Word Segmentation:** 80%+ accuracy for basic vocabulary
- **User Completion:** 70%+ of users who upload complete the quiz

### Technical Performance
- **Response Time:** <10 seconds for complete pipeline
- **System Uptime:** 95%+ availability
- **Error Handling:** Graceful degradation when services fail

## Implementation Plan

### Week 1: Core Infrastructure
- ✅ Basic Next.js page structure
- ✅ Image upload component
- ✅ Gemini API integration for OCR
- ✅ Text display component

### Week 2: Word Processing & Quiz
- ✅ Text segmentation with TinySegmenter
- ✅ Static dictionary integration (5k words)
- ✅ Word categorization interface
- ✅ Simple quiz generation and display
- ✅ Results page with score

### Week 3: Polish & Deploy
- ✅ Error handling and edge cases
- ✅ Mobile responsiveness
- ✅ Basic styling and UX improvements
- ✅ Deploy to production

## Future Enhancements (Post-MVP)

### Phase 2 Additions
- **User Accounts:** Save vocabulary and track progress
- **Better Dictionary:** Expand to 20k+ words with readings
- **Improved Segmentation:** Better word parsing accuracy
- **Progressive Quizzes:** Add difficulty progression

### Phase 3 Additions
- **Premium Features:** Vocabulary export, spaced repetition
- **Mobile App:** Native iOS/Android apps
- **Advanced Text Types:** Handwritten text, manga support
- **Grammar Analysis:** Identify and explain grammar patterns

## Technical Dependencies

### Required Environment Variables
```bash
GEMINI_API_KEY=your_gemini_api_key
```

### New Package Dependencies
```json
{
  "@google/generative-ai": "^0.21.0",
  "tiny-segmenter": "^0.2.0"
}
```

### External Services
- **Google Gemini 2.5 Flash:** OCR text extraction
- **TinySegmenter:** Japanese text segmentation
- **Static Dictionary:** Pre-built word list (no external API)

---

**Document Version:** 3.0 (Simplified MVP)  
**Last Updated:** 2025-01-19  
**Next Review:** After MVP completion  
**Previous Version:** Complex vocabulary system (v2.0) - simplified