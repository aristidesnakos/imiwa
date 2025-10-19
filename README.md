# Imiwa - Kanji Knowledge Checker

A web-based platform that checks which kanji you know by taking a picture of a page and asking you a quiz.

## Features

- 📸 **Image Upload**: Upload or capture pictures of pages containing kanji characters
- 🔍 **Kanji Detection**: Automatically extract and identify kanji from text
- 📝 **Interactive Quiz**: Test your knowledge with multiple-choice questions
- 📊 **Progress Tracking**: See which kanji you know and which ones to study
- 🎨 **Modern UI**: Beautiful, responsive design that works on desktop and mobile

## How It Works

1. **Upload Image**: Take a picture of a page with kanji or upload an existing image
2. **Enter Kanji**: Paste kanji characters manually (automatic OCR coming soon)
3. **Detect Kanji**: The platform extracts unique kanji from your input
4. **Take Quiz**: Answer multiple-choice questions about each kanji's meaning
5. **View Results**: See your score and which kanji you know vs. need to study

## Demo Screenshots

### Step 1: Upload or Enter Kanji
![Initial Page](https://github.com/user-attachments/assets/5b0a0d04-d837-427b-be32-ae6f5d1365a2)

### Step 2: Detected Kanji
![Detected Kanji](https://github.com/user-attachments/assets/c66279c5-b872-45fd-a3c0-a82437e84227)

### Step 3: Quiz Question
![Quiz Question](https://github.com/user-attachments/assets/845fb3b3-36aa-4f7a-a1ce-76d4fcaca71c)

### Step 4: Answer Feedback
![Correct Answer](https://github.com/user-attachments/assets/1fa9ead8-3fb6-414d-bc76-ca697d120e17)

### Step 5: Quiz Results
![Quiz Results](https://github.com/user-attachments/assets/e9fb8b49-f4ed-4348-8941-5629f7404459)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- No installation required!

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/aristidesnakos/imiwa.git
cd imiwa
```

2. Start a local web server:
```bash
# Using Python
python3 -m http.server 8000

# Or using Node.js
npx http-server -p 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

### Deployment

Simply host the files on any static web hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Any web server

## Kanji Database

The platform includes 100+ common kanji with:
- Multiple meanings in English
- Japanese readings (音読み and 訓読み)
- Categories including:
  - Numbers (一、二、三...)
  - Days of the week (月、火、水...)
  - Nature (山、川、花...)
  - Colors (赤、青、白...)
  - Body parts (目、手、足...)
  - And many more!

## Technology Stack

- **HTML5**: Structure and semantic markup
- **CSS3**: Modern styling with gradients and animations
- **JavaScript**: Interactive functionality
- **No frameworks**: Pure vanilla JavaScript for maximum compatibility

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] Automatic OCR integration for image-to-text conversion
- [ ] Offline support with Progressive Web App (PWA)
- [ ] User accounts and progress tracking
- [ ] Expanded kanji database (JLPT levels)
- [ ] Spaced repetition algorithm
- [ ] Dark mode support
- [ ] Multi-language support

## License

MIT License - feel free to use this project for learning or your own applications!

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## Author

Created with ❤️ for Japanese language learners
