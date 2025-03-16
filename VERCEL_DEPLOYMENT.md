# Flash Card Generator - Vercel Deployment Guide

This document provides instructions for deploying the Flash Card Generator application to Vercel.

## Important Files

The application uses the following key files for Vercel deployment:

1. `/api/index.js` - The serverless function entry point
2. `/vercel.json` - Vercel-specific configuration
3. `/server/server.js` - The Express application logic

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

## Troubleshooting

If you encounter issues:

1. **Function Timeouts**
   - The app includes timeouts to prevent serverless function execution timeouts
   - For Claude API: 10 seconds
   - For Mochi API: 5 seconds

2. **CORS Issues**
   - Check that your domain is included in the CORS configuration in server.js
   - The vercel.json file includes CORS headers for API routes

3. **Vercel Logs**
   - Check the Vercel deployment logs for more details on any server errors