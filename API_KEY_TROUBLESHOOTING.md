# 🔧 Google Maps API Key Troubleshooting

## 🚨 Current Error: "ApiTargetBlockedMapError"

This error means your Google Maps API key is restricted and blocking your localhost domain.

## ✅ How to Fix:

### Step 1: Check Your API Key Restrictions
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Click on your API key

### Step 2: Update Application Restrictions
**Option A: Allow All Domains (for development)**
1. Under "Application restrictions", select "None"
2. Click "Save"

**Option B: Add Localhost (recommended)**
1. Under "Application restrictions", select "HTTP referrers"
2. Add these referrers:
   ```
   localhost:8080/*
   localhost:3000/*
   127.0.0.1:8080/*
   127.0.0.1:3000/*
   ```
3. Click "Save"

### Step 3: Check API Restrictions
1. Under "API restrictions", select "Restrict key"
2. Make sure these APIs are enabled:
   - ✅ Maps JavaScript API
   - ✅ Places API
3. Click "Save"

### Step 4: Verify Billing
1. Go to "Billing" in Google Cloud Console
2. Make sure billing is enabled for your project
3. Google Maps requires billing even for free tier usage

## 🔄 After Making Changes:
1. Wait 5-10 minutes for changes to propagate
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Clear browser cache and reload the page

## 🧪 Test Your Setup:
1. Open browser console (F12)
2. Go to the Organize Protest page
3. Click on the location field
4. Start typing a location (e.g., "New Delhi")
5. You should see Google Maps autocomplete suggestions

## 📋 Common Issues:

### "This page can't load Google Maps correctly"
- Check API key restrictions
- Verify billing is enabled
- Ensure required APIs are enabled

### "Quota exceeded" error
- Check your usage in Google Cloud Console
- You might have hit the free tier limits
- Consider upgrading your billing plan

### No autocomplete suggestions
- Verify Places API is enabled
- Check that your API key has Places API access
- Make sure you're not using a restricted key

## 🔒 Security Best Practices:
- For production, use specific domain restrictions
- Never commit API keys to version control
- Monitor usage regularly
- Set up billing alerts

## 💰 Cost Information:
- Google Maps has a generous free tier
- Most small applications stay within free limits
- Monitor usage in Google Cloud Console
- Set up billing alerts to avoid surprises

---

**Still having issues?** Check the [Google Maps Platform documentation](https://developers.google.com/maps/documentation/javascript/error-messages) for more detailed error explanations.

