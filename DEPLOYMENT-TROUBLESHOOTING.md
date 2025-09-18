# Deployment Troubleshooting Guide

## Current Issue: "next: not found" Error

The error "next: not found" in the Azure App Service logs suggests an issue with the deployed application. Here are the steps to diagnose and fix this:

## 🔍 Immediate Diagnosis Steps

### 1. Check Health Endpoint
Visit: `https://pnwmafia.azurewebsites.net/api/health`

This endpoint will show:
- Application status
- Configuration status
- Environment variables
- Build information

### 2. Check Azure App Service Logs
1. Go to Azure Portal → App Service → pnwmafia
2. Navigate to **Monitoring → Log stream**
3. Look for detailed error messages

### 3. Check Application Settings
In Azure Portal → App Service → Configuration, verify these settings:

**Required:**
```
NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING = <your-connection-string>
```

**Optional Overrides:**
```
NEXT_PUBLIC_NIGHT_ACTION_TIME = 30
NEXT_PUBLIC_DISCUSSION_TIME = 180
NEXT_PUBLIC_VOTING_TIME = 30
NEXT_PUBLIC_DISABLE_INSIGHTS = false
```

## 🚨 Common Deployment Issues & Fixes

### Issue 1: Missing Node.js Runtime
**Symptoms:** "next: not found", command not found errors
**Fix:**
1. Azure Portal → App Service → Configuration → General Settings
2. Set **Runtime stack** to `Node 20 LTS`
3. Set **Startup Command** to: `npm start`
4. Save and restart the app

### Issue 2: Build Artifacts Missing
**Symptoms:** Application starts but pages don't load
**Fix:**
1. Check if `.next` folder was deployed
2. Ensure `npm run build` completed successfully in GitHub Actions
3. Check GitHub Actions logs for build failures

### Issue 3: Memory/Startup Issues
**Symptoms:** App starts then crashes, timeout errors
**Fix:**
1. Azure Portal → App Service → Scale up
2. Consider upgrading from Basic B1 to Standard S1
3. Increase startup timeout in Configuration

### Issue 4: Environment Variables
**Symptoms:** Configuration errors, features not working
**Fix:**
1. Add required environment variables
2. Restart the App Service
3. Check health endpoint to verify configuration

## 🔧 Deployment Verification Checklist

After each deployment, verify:

- [ ] Health endpoint responds: `/api/health`
- [ ] Main page loads: `/`
- [ ] Game setup works
- [ ] Application Insights configured (if enabled)
- [ ] No console errors in browser
- [ ] Azure logs show successful startup

## 🚀 Deployment Process

### Manual Deployment (if GitHub Actions fails)
```bash
# 1. Build locally
npm run build

# 2. Deploy using Azure CLI
az webapp up --name pnwmafia --resource-group <your-resource-group>
```

### GitHub Actions Deployment
The workflow automatically:
1. Builds the application
2. Verifies build output
3. Deploys to Azure
4. Tests health endpoint
5. Reports deployment status

## 🐛 Debug Commands

### Check Build Output Locally
```bash
npm run build
npm start
# Open http://localhost:3000/api/health
```

### Azure CLI Diagnostics
```bash
# Get app logs
az webapp log tail --name pnwmafia --resource-group <resource-group>

# Check app status
az webapp show --name pnwmafia --resource-group <resource-group> --query state

# Restart app
az webapp restart --name pnwmafia --resource-group <resource-group>
```

### Browser Diagnostics
1. Open Developer Tools (F12)
2. Check Console for JavaScript errors
3. Check Network tab for failed requests
4. Test health endpoint directly

## 🔄 Recovery Steps

If the application is completely broken:

1. **Immediate Fix:**
   ```bash
   az webapp restart --name pnwmafia --resource-group <resource-group>
   ```

2. **Check Configuration:**
   - Verify Node.js runtime version
   - Check startup command
   - Validate environment variables

3. **Redeploy:**
   - Trigger GitHub Actions workflow
   - Or deploy manually with Azure CLI

4. **Rollback (if needed):**
   - Use Azure Portal → Deployment Center → Previous deployment

## 📞 Support Information

**Application Details:**
- App Name: pnwmafia
- Runtime: Node.js 20 LTS
- Framework: Next.js 14.2.7
- Deployment: GitHub Actions

**Key Files:**
- Health Check: `/api/health`
- Configuration: `src/config/configManager.ts`
- Logging: `src/lib/logger.ts`
- Build Output: `.next/` directory

**GitHub Repository:**
- Main Branch: Automatic deployment
- Workflow: `.github/workflows/main_pnwmafia.yml`