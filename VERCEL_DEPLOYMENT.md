# Flash Card Generator - Vercel Deployment Guide

This document provides instructions for deploying the Flash Card Generator application to Vercel.

## Important Files

The application now uses a modular serverless architecture for Vercel:

1. `/api/*.js` - Individual serverless functions for each API endpoint
2. `/vercel.json` - Vercel-specific configuration
3. `/src/` - Static frontend files

Each API endpoint is implemented as a standalone serverless function:
- `/api/health.js` - Simple health check endpoint
- `/api/analyze-text.js` - Text analysis with Claude
- `/api/generate-cards.js` - Flashcard generation with Claude 
- `/api/mochi-decks.js` - Fetch decks from Mochi
- `/api/upload-to-mochi.js` - Upload cards to Mochi

## Deployment Steps

1. **Push your code to GitHub**

2. **Connect to Vercel**
   - Create a Vercel account if you don't have one
   - Connect your GitHub repository
   - Click "Import"

3. **Project Configuration**
   - Framework Preset: Leave as "Other"
   - Build Command: `npm run build`
   - Output Directory: Leave blank (default)
   - Install Command: `npm install`
   - Development Command: `npm run dev`

4. **Click "Deploy"**

## Client-Side API Keys

This application is designed to work with client-side API keys:

1. **No Environment Variables Needed**
   - Users will input their own API keys in the application settings
   - These are stored in the user's browser localStorage
   - No server-side environment variables are required for the APIs

2. **API Key Security**
   - The application only passes API keys to their respective services
   - API keys are never stored on the server

## Vercel Serverless Optimizations

The Vercel deployment has been optimized for serverless functions:

1. **Standalone Functions**
   - Each API endpoint is a completely standalone function
   - No dependencies on shared server code
   - Faster cold starts and more reliable execution

2. **Resource Limits**
   - Memory: 1024MB allocated per function
   - Max Duration: 10 seconds (prevents function timeouts)
   - API calls have internal timeouts to gracefully handle long-running requests

3. **Error Handling**
   - Improved error responses with helpful messages
   - Fallback decks provided when Mochi integration fails
   - Timeout errors clearly communicated to the user

## Troubleshooting

If you encounter issues:

1. **Test Individual Endpoints**
   - Visit `/api/health` to verify the API is running
   - Each endpoint has proper error handling and status codes

2. **Check Vercel Logs**
   - Detailed logs are available in the Vercel dashboard
   - Each function logs important information about its operation

3. **Browser Console**
   - The client application includes detailed error logging
   - Check the browser console for specific error messages

4. **CORS Issues**
   - All CORS headers are properly set for cross-origin requests
   - Preflight OPTIONS requests are properly handled