# Complete Live Deployment Guide: GitHub + Render + TiDB Cloud

This guide provides step-by-step instructions to deploy the **Hardware Stock Monitoring & Branch Requisition System** live to the web for free.

---

## Architecture Overview

```
                   +----------------------------------+
                   |           GitHub Repo            |
                   | (Source code & version control)  |
                   +-----------------+----------------+
                                     |
                          Automatic Deploy on Push
                                     |
                                     v
                   +-----------------+----------------+
                   |        Render Web Service        |
                   |   - Serves React Frontend (dist) |
                   |   - Runs Node/Express REST API   |
                   +-----------------+----------------+
                                     |
                          TLS / SSL Encrypted
                                     |
                                     v
                   +-----------------+----------------+
                   |      TiDB Cloud Serverless       |
                   | (Free MySQL-compatible cloud DB) |
                   |  - 13 Relational Tables          |
                   |  - Persistent Cloud Storage      |
                   +----------------------------------+
```

---

## Step 1: Create Free TiDB Cloud Database

TiDB Cloud Serverless provides a free-tier, fully managed, MySQL-compatible distributed database with automatic TLS encryption and 5 GB storage.

1. Go to **[https://tidbcloud.com](https://tidbcloud.com)** and sign in (you can use "Continue with Google" or "Continue with GitHub").
2. In the TiDB Cloud console, click **Create Cluster**.
3. Select **Serverless** (Free forever).
4. Select a cloud provider and region closest to your users:
   - *Recommended*: **AWS / Singapore (`ap-southeast-1`)**
5. Name your cluster (e.g., `hardware-db`) and click **Create**.
6. Once the cluster is created, click the **Connect** button in the upper right.
7. Under **Connect with**, choose **General Client** or **Node.js**.
8. Click **Generate Password** (or "Reset Password") and **copy down your credentials**:
   - **Host**: e.g., `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
   - **Port**: `4000`
   - **User**: e.g., `3rxxxxx.root`
   - **Password**: `your_copied_password`
   - **Database**: `hardware_inventory` (or `test`)

> **Automatic Setup:** You do **not** need to manually run SQL files! Upon first connection, the system automatically checks TiDB, creates all 13 tables, and seeds initial users and default categories.

---

## Step 2: Push the Code to GitHub

1. Go to **[https://github.com](https://github.com)** and log in.
2. In the top-right corner, click **+** -> **New repository**.
3. Enter repository details:
   - **Repository name**: `hardware-inventory-system`
   - **Visibility**: Public or Private
   - **Do NOT** check "Add a README", ".gitignore", or "license" (we already have them configured locally).
4. Click **Create repository**.
5. Copy the repository URL (e.g., `https://github.com/<your-username>/hardware-inventory-system.git`).
6. In your local project terminal (`c:\Users\TPA0000\Documents\hardware inventory`), run:

```bash
git remote add origin https://github.com/<your-username>/hardware-inventory-system.git
git push -u origin main
```

---

## Step 3: Deploy to Render (Free Web Service)

Render will build and host both your React frontend and Express backend within a single free web service.

1. Go to **[https://render.com](https://render.com)** and sign in using your GitHub account.
2. In the dashboard, click **New +** in the top bar and select **Web Service**.
3. Find your repository `hardware-inventory-system` and click **Connect**.
4. Fill in the service configuration:
   - **Name**: `hardware-inventory-system` (or your preferred subdomain)
   - **Region**: `Singapore (Southeast Asia)` (select the region closest to your TiDB cluster)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Scroll down to the **Environment Variables** section and click **Add Environment Variable** for each:

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations |
| `TIDB_HOST` | *(Paste your TiDB host from Step 1)* | TiDB Cloud Gateway Host |
| `TIDB_PORT` | `4000` | TiDB Cloud default port |
| `TIDB_USER` | *(Paste your TiDB username)* | TiDB Cloud user |
| `TIDB_PASSWORD` | *(Paste your TiDB password)* | TiDB Cloud password |
| `TIDB_DATABASE` | `hardware_inventory` | Database name |

6. Click **Deploy Web Service** at the bottom of the page.

---

## Step 4: Verification & Live Access

1. Render will stream build logs:
   - Installing dependencies
   - Compiling React Vite app (`tsc -b && vite build`) into `client/dist`
   - Starting Node server (`npm start`)
2. Once the deploy logs display:
   ```text
   [Database] Connecting to TiDB Cloud / Remote MySQL...
   [TiDB Cloud] Database schema and tables verified/created successfully.
   [Server] Serving static client build from .../client/dist
   Hardware Stock Monitoring System Backend running
   Port: 10000 | Env: production
   ```
3. Open your assigned Render URL (e.g., `https://hardware-inventory-system.onrender.com`).
4. Log in using the default administrative account:
   - **Username**: `admin`
   - **Password**: `admin123`

---

## Local Development vs. Production Summary

- **Local Development**: When `TIDB_HOST` is not set in `.env`, the system automatically falls back to fast, offline SQLite storage (`server/data/inventory.db`).
- **Cloud Production**: When `TIDB_HOST` or `DATABASE_URL` is set, the system automatically routes all queries over secure TLS to TiDB Cloud Serverless.
- **Continuous Deployment**: Every time you `git push origin main`, Render will automatically rebuild and redeploy the latest changes!
