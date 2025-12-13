# imiwa - Japanese Kanji Learning Platform

**Master Japanese Kanji Through Interactive Stroke Order Practice**

imiwa is a comprehensive web-based platform designed to help Japanese language learners master kanji characters from JLPT N5 through N1 levels. The platform emphasizes proper stroke order technique through interactive stroke diagrams and provides learners with a systematic way to track their progress.

## Product Overview

### Primary Purpose
imiwa serves as a digital kanji learning companion that houses comprehensive collections of kanji characters organized by JLPT (Japanese Language Proficiency Test) levels. The platform's core strength lies in its interactive stroke order diagrams that teach proper Japanese character writing technique.

### Target Users
- Japanese language learners preparing for JLPT exams (N5-N1)
- Students seeking to improve their kanji writing technique
- Educators looking for visual kanji teaching tools
- Self-directed learners building systematic kanji knowledge

### Key Value Propositions
1. **Comprehensive Coverage**: Complete kanji sets for all JLPT levels (N5: 88, N4: ~170, N3: ~370, N2: ~370, N1: ~1000+ characters)
2. **Interactive Learning**: Animated stroke order diagrams powered by KanjiVG database
3. **Progress Tracking**: Personal learning analytics with time-based progress visualization
4. **Systematic Organization**: JLPT-level-based structure following established learning pathways

## Technical Architecture

### Technology Stack
- **Frontend**: Next.js 15 with React Server Components and App Router
- **Styling**: Tailwind CSS with Radix UI component library
- **Data Storage**: Client-side localStorage for progress tracking
- **Stroke Diagrams**: KanjiVG SVG integration with custom animation engine
- **Deployment**: Vercel hosting with edge optimization

### Core Features

#### 1. Kanji Dictionary & Search
- **Multi-level Organization**: Characters categorized by JLPT levels (N5-N1)
- **Search Functionality**: Search by character, meaning, or reading (hiragana/romaji)
- **Character Details**: Each kanji displays onyomi, kunyomi readings and English meanings
- **Responsive Design**: Mobile-first interface optimized for touch interaction

#### 2. Interactive Stroke Order System
- **SVG-based Animations**: Leverages KanjiVG database for accurate stroke sequences
- **Playback Controls**: Play, pause, and reset functionality for stroke animations
- **Visual Learning**: Step-by-step stroke visualization with proper directional guidance
- **Fallback Handling**: Graceful degradation for characters without stroke data

#### 3. Progress Tracking & Analytics
- **Learning Checkmarks**: Mark characters as learned with timestamp tracking
- **Progress Visualization**: Time-based charts showing learning velocity over 24h/7d/30d/12m periods
- **Level Progress**: Track completion percentage within each JLPT level
- **Local Persistence**: Browser-based storage ensures privacy and offline capability

#### 4. Performance Optimizations
- **Lazy Loading**: On-demand stroke diagram loading
- **Caching Strategy**: Client-side SVG caching for improved performance
- **Mobile Performance**: Optimized for mobile devices with touch-friendly interfaces

### Data Architecture

#### Kanji Data Structure
```typescript
interface KanjiData {
  kanji: string;        // The character
  onyomi: string;       // Chinese reading(s)
  kunyomi: string;      // Japanese reading(s)  
  meaning: string;      // English definition
}
```

#### Progress Data Structure
```typescript
interface KanjiProgressData {
  learnedKanji: string[];              // Array of learned characters
  timestamps: Record<string, number>;   // Learning timestamps for analytics
}
```

### Japanese Language Context

#### JLPT Level System
The platform follows the standardized Japanese Language Proficiency Test structure:

- **N5 (Beginner)**: ~88 basic kanji - everyday vocabulary, numbers, basic verbs
- **N4 (Elementary)**: ~170 additional kanji - more complex daily situations
- **N3 (Intermediate)**: ~370 additional kanji - workplace and academic contexts
- **N2 (Upper-Intermediate)**: ~370 additional kanji - news, literature, professional contexts
- **N1 (Advanced)**: ~1000+ additional kanji - academic and specialized texts

#### Stroke Order Importance
Proper stroke order is fundamental in Japanese writing for:
- **Character Recognition**: Consistent stroke patterns aid in reading speed
- **Handwriting Legibility**: Correct strokes produce more readable characters
- **Cultural Appropriateness**: Following traditional writing conventions
- **Muscle Memory**: Building automatic writing reflexes for fluent production

## Development & Deployment

### Local Development
```bash
pnpm install       # Install dependencies
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm lint         # Run code quality checks
```

### Architecture Decisions
- **Client-side Storage**: Privacy-focused design with no user account requirements
- **Static Generation**: Pre-rendered pages for optimal SEO and performance
- **Component Architecture**: Modular design with reusable UI components
- **Responsive Design**: Mobile-first approach with progressive enhancement

### Future Roadmap Considerations
- **Spaced Repetition**: Implementation of SRS (Spaced Repetition System) algorithms
- **Writing Practice**: Digital writing canvas for stroke practice
- **Audio Integration**: Pronunciation guides for reading practice
- **Offline Support**: PWA implementation for offline access
- **Advanced Analytics**: Learning pattern analysis and personalized recommendations

## Business Context

### Market Positioning
imiwa addresses the gap in accessible, interactive kanji learning tools by providing:
- Free, comprehensive kanji coverage without subscription barriers
- Focus on proper writing technique rather than just recognition
- Systematic progression following established educational standards
- Privacy-respecting design with local data storage

### Success Metrics
- User engagement through progress tracking completion rates
- Mobile usage patterns indicating accessibility success
- Performance metrics for stroke diagram loading and interaction
- Organic search traffic for JLPT-related kanji queries

This platform represents a modern approach to traditional Japanese language learning, combining technological innovation with respect for authentic Japanese writing practices.
