# Dairy Records - Mobile-First Dairy Receipt Parser

A Progressive Web App (PWA) for scanning and parsing dairy receipts using Google Gemini AI vision API.

## Features

- 📱 Mobile-first design with PWA support
- 📸 Camera capture and gallery upload
- 🤖 AI-powered parsing using Google Gemini's vision API
- ✏️ Editable extracted fields
- 💾 Works offline (PWA)
- 🆓 **Completely FREE** - No credit card required!

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Get Your FREE Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 3. Add Your API Key

Create a `.env.local` file in the root directory:

```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

Paste your API key from step 2

### 4. Run the Development Server

```bash
npm run dev
```

For mobile testing on the same network:

```bash
npm run dev -- --host
```

Then access the app from your phone using the network URL shown (e.g., `http://192.168.1.6:5173/`)

### 5. Install as PWA

On your phone:
- **iOS (Safari)**: Tap Share → Add to Home Screen
- **Android (Chrome)**: Tap Menu → Install App

## Usage

1. Tap the camera icon
2. Take a photo or select from gallery
3. Wait for Claude AI to analyze the image
4. Review and edit the extracted data
5. Tap "Edit" to manually correct any fields

## Extracted Fields

- Date
- Cow/Animal ID
- Quantity (Liters)
- Morning/Evening quantities
- Fat percentage
- SNF (Solid-Not-Fat)
- Rate per liter
- Total Amount

## Cost

**100% FREE!** Google Gemini API offers:
- 60 requests per minute
- 1500 requests per day
- No credit card required

Perfect for personal use!

## Security Note

⚠️ The API key is stored in `.env.local` and is exposed in the browser. For production use, create a backend proxy to hide your API key.

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.
