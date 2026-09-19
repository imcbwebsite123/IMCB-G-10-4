# Google Apps Script Setup Guide for IMCB Photo Approval System

Follow these simple 4 steps to activate your approval system in your Gmail account (`imcb.website@gmail.com`):

### Step 1: Open Google Apps Script
1. Go to [https://script.google.com/](https://script.google.com/) while logged into **imcb.website@gmail.com**.
2. Click **+ New project** (Blue button on top left).
3. Name the project: `IMCB Photo Gallery Backend`.

### Step 2: Paste the Code
1. Delete any sample code inside the editor (`myFunction() { ... }`).
2. Copy all code from [Code.gs](file:///c:/Users/Tab%20&%20Tech/OneDrive/Desktop/index/google_apps_script/Code.gs).
3. Paste it into the editor.
4. Click the **Save** icon (floppy disk icon) or press `Ctrl + S`.

### Step 3: Deploy as Web App
1. Click the blue **Deploy** button (top right) -> **New deployment**.
2. Click the gear/cog icon next to "Select type" -> Choose **Web app**.
3. Fill in settings:
   - **Description**: `IMCB Gallery API v1`
   - **Execute as**: `Me (imcb.website@gmail.com)`
   - **Who has access**: **`Anyone`** *(Crucial so website visitors can submit photos and view approved ones)*.
4. Click **Deploy**.
5. Click **Authorize access** -> Choose your account (`imcb.website@gmail.com`) -> Click **Advanced** -> Click **Go to IMCB Photo Gallery Backend (unsafe)** -> Click **Allow**.

### Step 4: Copy Web App URL
1. Copy the **Web App URL** (looks like: `https://script.google.com/macros/s/.../exec`).
2. Paste this URL into `gallery.html` where indicated (`const APPS_SCRIPT_URL = "YOUR_URL_HERE";`).

That's it!
Now whenever anyone submits a photo on the website:
- You will receive an instant Gmail notification with the photo preview and `[✅ APPROVE]` & `[❌ REJECT]` buttons.
- Clicking `APPROVE` automatically publishes the photo to the live gallery!
