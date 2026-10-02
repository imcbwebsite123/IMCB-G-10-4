# IMCB G-10/4 FEMIS Central Cloud Database Setup Guide
## (ہر ڈیوائس پر لائیو ڈیٹا سِنک کرنے کا طریقہ)

اگر آپ چاہتے ہیں کہ **کسی بھی موبائل، کمپیوٹر یا لیپ ٹاپ سے ڈیٹا تبدیل کرنے پر وہ پوری دنیا میں ہر سکرین پر لائیو اپڈیٹ ہو جائے**، تو صرف یہ 4 آسان سٹیپس فالو کریں:

---

### Step 1: Google Apps Script کھولیں
1. اپنے براؤزر میں [https://script.google.com/](https://script.google.com/) پر جائیں (اپنی کالج ای میل `imcb.website@gmail.com` سے لاگ ان رہیں)۔
2. بائیں جانب **+ New project** کا نیلا بٹن دبائیں۔
3. پراجیکٹ کا نام رکھیں: `IMCB FEMIS Cloud Database`.

---

### Step 2: کوڈ کاپی اور پیسٹ کریں
1. ایڈیٹر کے اندر پہلے سے لکھا ہوا کوڈ (`myFunction() { ... }`) مٹا دیں۔
2. [FemisCode.gs](file:///c:/Users/Tab%20&%20Tech/OneDrive/Desktop/index/google_apps_script/FemisCode.gs) فائل کا سارا کوڈ کاپی کریں۔
3. ایڈیٹر میں پیسٹ کریں۔
4. کی بورڈ سے `Ctrl + S` دبائیں یا **Save (فلاپی ڈسک)** کا بٹن دبا کر محفوظ کر لیں۔

---

### Step 3: بطور Web App ڈپلائے (Deploy) کریں
1. اوپر دائیں کونے میں نیلا بٹن **Deploy** -> **New deployment** دبائیں۔
2. بائیں جانب گیئر (Cog) آئیکن پر کلک کریں اور **Web app** منتخب کریں۔
3. سیٹنگز درج کریں:
   - **Description**: `IMCB FEMIS API v1`
   - **Execute as**: `Me (imcb.website@gmail.com)`
   - **Who has access**: **`Anyone`** *(یہ لازمی ہے تاکہ اساتذہ اپنے موبائل سے ڈیٹا بھیج سکیں)*۔
4. **Deploy** دبائیں۔
5. پہلی بار اجازت مانگے گا:
   - **Authorize access** دبائیں۔
   - اپنی ای میل منتخب کریں۔
   - **Advanced** پر کلک کریں۔
   - **Go to IMCB FEMIS Cloud Database (unsafe)** پر کلک کریں۔
   - **Allow** پر کلک کریں۔

---

### Step 4: Web App URL حاصل کریں اور config.js میں پیسٹ کریں
1. سکرین پر آپ کو **Web App URL** ملے گا (جو اس طرح کا ہوگا: `https://script.google.com/macros/s/AKfycb.../exec`)۔
2. اس URL کو کاپی کریں۔
3. اپنے کمپیوٹر پر [config.js](file:///c:/Users/Tab%20&%20Tech/OneDrive/Desktop/index/config.js) فائل کھولیں۔
4. وہاں `FEMIS_CLOUD_API_URL` کے آگے کوٹس کے درمیان پیسٹ کر دیں:
   ```javascript
   const FEMIS_CLOUD_API_URL = "آپ کا کاپی کیا ہوا URL یہاں پیسٹ کریں";
   ```
5. فائل سیو کریں اور گٹ پُش کر دیں۔

---

### فائدہ (Result):
* اب کالج کا کوئی بھی استاد اپنے موبائل سے یا لیپ ٹاپ سے ڈیٹا درج کرے گا یا ایڈٹ کرے گا:
  1. وہ فوراً آپ کی Google Drive میں موجود Google Sheet **`IMCB_FEMIS_Tracking`** میں محفوظ ہو جائے گا۔
  2. اور پوری دنیا میں ویب سائٹ اور انفوگرافکس پر سب کو وہی تازہ ترین ڈیٹا لائیو نظر آئے گا!
* پرنسپل یا ایڈمن خود Google Sheet فائل کھول کر بھی نمبر تبدیل کریں گے تو ویب سائٹ پر خودکار طور پر تبدیل ہو جائے گا!
