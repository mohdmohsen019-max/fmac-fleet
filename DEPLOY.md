# 🚀 FMAC Fleet Management: Deployment Guide

Your project is now fully configured for **Firebase Hosting** with automated **GitHub Actions**. Every time you push to the `main` branch, the site will automatically rebuild and go live.

## 🛠️ Step 1: Initial Local Setup
If you haven't already, run these commands in your terminal:
1.  **Login to Firebase**: `firebase login`
2.  **Enable Frameworks**: `firebase experiments:enable webframeworks`
3.  **Deploy Manually once**: `firebase deploy`

---

## 🔒 Step 2: GitHub Secrets (Required for Auto-Deploy)
To enable the automatic GitHub Actions, you must add two secrets to your GitHub Repository:
1.  **Repo Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
2.  Add **`FIREBASE_SERVICE_ACCOUNT_FMAC_FLEET_MANAGEMENT_SYSTEM`**.
    *   *To get this key:* Run `firebase init hosting:github` and it will generate one for you, OR download it from the Firebase Console (Settings > Service Accounts).

---

## 🛡️ Step 3: Security & Database
I have added production-grade **Security Rules** to your project:
*   **Admins**: Full control over all fleet data and user roles.
*   **Drivers**: Can only log their own trips and view vehicle status.
*   **Public**: Zero access. All data requires a valid FMAC account.

---

## 📈 Monitoring
*   **Hosting URL**: `https://fmac-fleet-management-system.web.app`
*   **Build Logs**: View the **"Actions"** tab on GitHub to see the progress of your deployments.

> [!TIP]
> Use `.env.example` as a template to set up your production environment variables in the Firebase/Vercel dashboard.
