# 🗺️ Google Maps API Setup Guide

## ✅ What's Already Done
- Google Maps dependencies installed (`@react-google-maps/api`, `use-places-autocomplete`)
- Location picker component created
- Environment variable added to `.env` file
- Configuration files set up

## 🔑 Getting Your Google Maps API Key

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create or Select a Project
1. Click on the project dropdown at the top
2. Either create a new project or select an existing one
3. Give it a name like "Hindu Unity Maps"

### Step 3: Enable Required APIs
1. Go to "APIs & Services" → "Library"
2. Search for and enable these APIs:
   - **Maps JavaScript API** (for the map functionality)
   - **Places API** (for location autocomplete)

### Step 4: Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the generated API key

### Step 5: Secure Your API Key (Recommended)
1. Click on your API key to edit it
2. Under "Application restrictions", select "HTTP referrers"
3. Add your domain (e.g., `localhost:8080/*`, `yourdomain.com/*`)
4. Under "API restrictions", select "Restrict key"
5. Choose only the APIs you enabled (Maps JavaScript API, Places API)

## 🔧 Configure Your Application

### Step 1: Update .env File
Open your `.env` file and replace the placeholder:

```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with your real API key from Google Cloud Console.

### Step 2: Restart Development Server
After updating the `.env` file, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## 🎯 How It Works

### Location Picker Features:
- **Autocomplete**: Type to get location suggestions
- **Restricted to India**: Only shows Indian locations
- **Coordinates**: Stores precise lat/lng for accurate mapping
- **Clickable Links**: Protest locations open in Google Maps

### What You'll See:
1. **Before API Key**: Warning message and disabled input
2. **After API Key**: Fully functional location picker with suggestions
3. **In Protest Posts**: Clickable location links that open Google Maps

## 🚨 Troubleshooting

### "Google Maps API key not configured" Warning
- Make sure you've added the API key to `.env` file
- Restart the development server after updating `.env`
- Check that the variable name is exactly `VITE_GOOGLE_MAPS_API_KEY`

### "This page can't load Google Maps correctly" Error
- Check that you've enabled the required APIs (Maps JavaScript API, Places API)
- Verify your API key restrictions allow your domain
- Make sure billing is enabled on your Google Cloud project

### Location Picker Not Working
- Check browser console for errors
- Verify the API key is valid and has the right permissions
- Ensure you've enabled Places API specifically

## 💰 Cost Information
- Google Maps has a free tier with generous limits
- For most small applications, you'll stay within free limits
- Monitor usage in Google Cloud Console
- Set up billing alerts to avoid unexpected charges

## 🔒 Security Best Practices
- Never commit your API key to version control
- Use HTTP referrer restrictions
- Restrict API key to only needed APIs
- Monitor usage regularly
- Consider using environment-specific keys for production

---

**Need Help?** Check the [Google Maps Platform documentation](https://developers.google.com/maps/documentation) for more details.