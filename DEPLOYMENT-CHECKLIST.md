# 🚀 Deployment Checklist for Azure Fix

## ✅ Completed Steps
- [x] Fixed corrupted GitHub Actions workflow file
- [x] Added comprehensive build verification
- [x] Created health check API endpoint
- [x] Added deployment verification with health check
- [x] Verified package.json has correct scripts
- [x] Added comprehensive error handling to config and logger

## 🔧 Required Azure Configuration (CRITICAL)

### 1. App Service Runtime Settings
**Go to Azure Portal → App Services → PnwMafia → Configuration → General settings:**

| Setting | Required Value | Current Status |
|---------|---------------|----------------|
| Runtime stack | Node.js | ❓ Need to verify |
| Version | 20 LTS | ❓ Need to verify |
| Platform | Linux | ❓ Need to verify |
| Startup Command | `npm start` | ❓ Need to verify |

### 2. Application Settings
**Go to Azure Portal → App Services → PnwMafia → Configuration → Application settings:**

| Name | Value | Purpose |
|------|-------|---------|
| `NODE_ENV` | `production` | Next.js optimization |
| `WEBSITE_NODE_DEFAULT_VERSION` | `20.x` | Ensure Node 20 |
| `WEBSITES_ENABLE_APP_SERVICE_STORAGE` | `true` | File persistence |

### 3. Environment Variables (Optional)
```
APPLICATIONINSIGHTS_CONNECTION_STRING=your_connection_string
```

## 🎯 Immediate Action Steps

### Step 1: Configure Azure App Service
1. Open [Azure Portal](https://portal.azure.com)
2. Navigate to **App Services** → **PnwMafia**
3. Go to **Configuration** → **General settings**
4. Set all values from table above
5. Click **Save** and wait for restart

### Step 2: Deploy Latest Code
1. Commit and push the fixed workflow file:
   ```bash
   git add .
   git commit -m "Fix: Repair corrupted GitHub Actions workflow and add comprehensive deployment verification"
   git push origin main
   ```

### Step 3: Monitor Deployment
1. Watch GitHub Actions: [Repository Actions](https://github.com/your-username/Mafia-node/actions)
2. Monitor build and deployment steps
3. Check for the deployment verification step output

### Step 4: Test Application
1. Wait 2-3 minutes after deployment completes
2. Test health endpoint: `https://pnwmafia.azurewebsites.net/api/health`
3. Test main application: `https://pnwmafia.azurewebsites.net`

### Step 5: Debug if Still Failing
1. Check Azure App Service logs:
   - Portal → App Services → PnwMafia → Monitoring → Log stream
2. Look for specific error messages
3. Verify files deployed correctly via SSH/Console

## 🔍 Expected Behavior

### Successful Health Check Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "environment": "production",
  "version": "0.1.0",
  "uptime": "XX seconds",
  "checks": {
    "server": "running",
    "config": "loaded"
  }
}
```

### Successful Main Page:
- Game setup interface loads
- No console errors
- Application Insights telemetry flows (if configured)

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "next: not found" | Set startup command to `npm start` |
| Build artifacts missing | Verify GitHub Actions uploads entire project |
| Environment errors | Add `NODE_ENV=production` |
| Config loading fails | Check gameConfig.json is deployed |
| Health check 404 | Verify API routes are deployed |

## 📞 Next Steps if Still Failing

1. **Share Azure App Service logs** - specific error messages
2. **Verify Azure configuration** - screenshot of Configuration page
3. **Check GitHub Actions logs** - deployment step details
4. **Consider container deployment** - if file-based deployment continues failing

## 🎉 Success Criteria

- ✅ GitHub Actions workflow completes without errors
- ✅ Health endpoint returns 200 OK
- ✅ Main application loads and is functional
- ✅ No errors in Azure App Service logs
- ✅ Application Insights receives telemetry (if configured)

---

**The most critical step is configuring the Azure App Service runtime and startup command. This is likely the root cause of the "next: not found" error.**