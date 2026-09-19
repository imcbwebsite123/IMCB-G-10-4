/**
 * =====================================================================
 * IMCB G-10/4 PHOTO GALLERY - GITHUB BACKEND (ZERO GOOGLE DRIVE STORAGE)
 * =====================================================================
 * Administrator: imcb.website@gmail.com
 * Repository: imcbwebsite123/IMCB-G-10-4
 * 
 * Features:
 * 1. Photos are saved DIRECTLY to GitHub repo (images/community/).
 * 2. GOOGLE DRIVE IS NEVER USED. 0 MB Drive storage used!
 * 3. Review email sent to imcb.website@gmail.com with one-click Approve / Reject.
 * 4. On Approve: Status marked 'Approved', instantly shows in gallery.
 * 5. On Reject: Photo file is automatically deleted from GitHub repository!
 * 6. To remove an approved photo anytime: change Status in Google Sheet from 'Approved' to 'Rejected'.
 * =====================================================================
 */

const ADMIN_EMAIL = "imcb.website@gmail.com";
const GITHUB_REPO = "imcbwebsite123/IMCB-G-10-4";
const GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN") || "PASTE_YOUR_GITHUB_TOKEN_HERE";
const GITHUB_BRANCH = "main";
const SHEET_NAME = "IMCB_Gallery_Database";

/**
 * Handle GET requests:
 * - action=getApproved : Return JSON array of approved photos for website
 * - action=approve&id=... : Approve submission from email
 * - action=reject&id=... : Reject and delete photo from GitHub
 */
function doGet(e) {
  const action = e.parameter ? e.parameter.action : "";
  const id = e.parameter ? e.parameter.id : "";
  
  if (action === "getApproved") {
    return handleGetApproved();
  } else if (action === "approve" && id) {
    return handleApproval(id, "Approved");
  } else if (action === "reject" && id) {
    return handleApproval(id, "Rejected");
  } else {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      message: "IMCB Gallery GitHub API is active (Zero Drive storage mode)."
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests:
 * Receives new photo submission from website form
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const submitter = data.submitter || "Anonymous Contributor";
    const title = data.title || "Campus Photo";
    const category = data.category || "campus";
    const description = data.description || "";
    let base64Data = data.image || "";
    const rawFileName = data.fileName || "photo.jpg";
    
    if (!base64Data) {
      return jsonResponse({ success: false, message: "No image data received" });
    }
    
    // Strip Base64 header prefix if present (e.g. data:image/jpeg;base64,)
    if (base64Data.indexOf(",") > -1) {
      base64Data = base64Data.split(",")[1];
    }
    
    // Clean extension
    let ext = "jpg";
    if (rawFileName.toLowerCase().endsWith(".png")) ext = "png";
    else if (rawFileName.toLowerCase().endsWith(".webp")) ext = "webp";
    
    // 1. Generate unique Submission ID & Filename
    const idSuffix = Utilities.formatDate(new Date(), "GMT+5", "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 1000);
    const submissionId = "SUB-" + idSuffix;
    const gitFileName = "photo_" + idSuffix + "." + ext;
    const gitFilePath = "images/community/" + gitFileName;
    const timestamp = Utilities.formatDate(new Date(), "GMT+5", "dd MMM yyyy, hh:mm a");
    
    // 2. Upload file directly to GitHub Repository (Zero Google Drive storage!)
    const ghUploadUrl = "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + gitFilePath;
    const ghPayload = {
      message: "Upload community photo submission: " + title + " (" + submissionId + ")",
      content: base64Data,
      branch: GITHUB_BRANCH
    };
    
    const ghResponse = UrlFetchApp.fetch(ghUploadUrl, {
      method: "put",
      headers: {
        "Authorization": "token " + GITHUB_TOKEN,
        "Accept": "application/vnd.github+json",
        "User-Agent": "IMCB-Gallery-App"
      },
      contentType: "application/json",
      payload: JSON.stringify(ghPayload),
      muteHttpExceptions: true
    });
    
    const ghResCode = ghResponse.getResponseCode();
    if (ghResCode !== 200 && ghResCode !== 201) {
      return jsonResponse({
        success: false,
        message: "GitHub upload failed (HTTP " + ghResCode + "): " + ghResponse.getContentText()
      });
    }
    
    const ghData = JSON.parse(ghResponse.getContentText());
    const fileSha = ghData.content ? ghData.content.sha : "";
    
    // High-speed direct raw URL from GitHub
    const imageUrl = "https://raw.githubusercontent.com/" + GITHUB_REPO + "/" + GITHUB_BRANCH + "/" + gitFilePath;
    
    // 3. Save entry to Google Sheet (Free database, 0 MB Drive storage used)
    const sheet = getOrCreateSheet(SHEET_NAME);
    sheet.appendRow([
      submissionId,
      timestamp,
      submitter,
      category,
      title,
      description,
      gitFilePath,
      imageUrl,
      "Pending",
      fileSha
    ]);
    
    // 4. Send Review Email to Admin with One-Click Approve / Reject
    const scriptUrl = ScriptApp.getService().getUrl();
    const approveUrl = scriptUrl + "?action=approve&id=" + encodeURIComponent(submissionId);
    const rejectUrl = scriptUrl + "?action=reject&id=" + encodeURIComponent(submissionId);
    
    sendAdminReviewEmail(ADMIN_EMAIL, {
      submissionId: submissionId,
      timestamp: timestamp,
      submitter: submitter,
      title: title,
      category: category,
      description: description,
      imageUrl: imageUrl,
      approveUrl: approveUrl,
      rejectUrl: rejectUrl
    });
    
    return jsonResponse({
      success: true,
      message: "Photo submitted successfully to GitHub and sent for admin review."
    });
    
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Error processing submission: " + err.toString()
    });
  }
}

/**
 * Handle Approval or Rejection
 */
function handleApproval(id, newStatus) {
  const sheet = getOrCreateSheet(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  let foundRow = -1;
  let photoTitle = "";
  let submitter = "";
  let category = "";
  let gitFilePath = "";
  let imageUrl = "";
  let currentSha = "";
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      foundRow = i + 1;
      photoTitle = data[i][4];
      submitter = data[i][2];
      category = data[i][3];
      gitFilePath = data[i][6];
      imageUrl = data[i][7];
      currentSha = data[i][9];
      break;
    }
  }
  
  if (foundRow === -1) {
    return HtmlService.createHtmlOutput("<h2 style='font-family:sans-serif;color:#ef4444;'>Submission ID not found.</h2>")
      .setTitle("Not Found");
  }
  
  const isApproved = (newStatus === "Approved");
  
  if (isApproved) {
    // Update status in sheet to Approved
    sheet.getRange(foundRow, 9).setValue("Approved");
  } else {
    // Rejected: Delete file from GitHub repository
    sheet.getRange(foundRow, 9).setValue("Rejected");
    
    if (gitFilePath) {
      deleteGitHubFile(gitFilePath, currentSha);
    }
  }
  
  const color = isApproved ? "#10b981" : "#ef4444";
  const icon = isApproved ? "✅" : "❌";
  const titleText = isApproved ? "Photo Approved & Published!" : "Photo Rejected & Deleted";
  const descText = isApproved 
    ? "This photo has been approved and is now LIVE on GitHub Pages in the IMCB G-10/4 Photo Gallery." 
    : "This photo has been rejected and permanently erased from the GitHub repository. It will not be shown.";
    
  const htmlOutput = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${titleText} | IMCB G-10/4</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Poppins', sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #ffffff; max-width: 520px; width: 100%; border-radius: 20px; padding: 35px 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.08); text-align: center; }
        .icon-circle { width: 75px; height: 75px; border-radius: 50%; background: ${color}15; color: ${color}; font-size: 38px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        h1 { color: #0a192f; margin: 0 0 12px; font-size: 1.6rem; font-weight: 700; }
        p { color: #64748b; font-size: 0.95rem; line-height: 1.6; margin: 0 0 24px; }
        .preview-img { width: 100%; max-height: 250px; object-fit: cover; border-radius: 14px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
        .badge { display: inline-block; padding: 6px 16px; border-radius: 30px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 24px; }
        .storage-note { background: #ecfdf5; color: #065f46; padding: 8px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; margin-bottom: 20px; }
        .btn-gallery { display: inline-block; background: #0a192f; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; transition: background 0.2s; }
        .btn-gallery:hover { background: #133c66; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-circle">${icon}</div>
        <h1>${titleText}</h1>
        <div class="storage-note">⚡ Zero Google Drive Storage Used — Hosted Directly on GitHub</div>
        <p>${descText}</p>
        ${isApproved && imageUrl ? `<img src="${imageUrl}" class="preview-img" alt="Photo preview">` : ''}
        <div class="badge">Title: <b>${escapeHtml(photoTitle)}</b> | Submitter: <b>${escapeHtml(submitter)}</b></div>
        <div>
          <a href="https://imcbwebsite123.github.io/IMCB-G-10-4/gallery.html" class="btn-gallery" target="_blank">View Live Gallery &rarr;</a>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(htmlOutput).setTitle(titleText);
}

/**
 * Delete file from GitHub via GitHub REST API
 */
function deleteGitHubFile(filePath, sha) {
  try {
    let fileSha = sha;
    // If SHA not cached in sheet, fetch it from GitHub
    if (!fileSha) {
      const getRes = UrlFetchApp.fetch("https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + filePath, {
        headers: {
          "Authorization": "token " + GITHUB_TOKEN,
          "Accept": "application/vnd.github+json",
          "User-Agent": "IMCB-Gallery-App"
        },
        muteHttpExceptions: true
      });
      if (getRes.getResponseCode() === 200) {
        fileSha = JSON.parse(getRes.getContentText()).sha;
      }
    }
    
    if (fileSha) {
      UrlFetchApp.fetch("https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + filePath, {
        method: "delete",
        headers: {
          "Authorization": "token " + GITHUB_TOKEN,
          "Accept": "application/vnd.github+json",
          "User-Agent": "IMCB-Gallery-App"
        },
        contentType: "application/json",
        payload: JSON.stringify({
          message: "Delete rejected photo: " + filePath,
          sha: fileSha,
          branch: GITHUB_BRANCH
        }),
        muteHttpExceptions: true
      });
    }
  } catch (err) {
    Logger.log("Error deleting file from GitHub: " + err.toString());
  }
}

/**
 * Return JSON of all Approved photos
 */
function handleGetApproved() {
  const sheet = getOrCreateSheet(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const approvedList = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[8];
    if (status === "Approved") {
      approvedList.push({
        id: row[0],
        timestamp: row[1],
        submitter: row[2],
        category: row[3],
        title: row[4],
        description: row[5],
        imageUrl: row[7]
      });
    }
  }
  
  // Return reversed so newest approved photos appear first
  approvedList.reverse();
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    count: approvedList.length,
    photos: approvedList
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send Review Email to Administrator
 */
function sendAdminReviewEmail(adminEmail, info) {
  const subject = "📸 New Gallery Photo: \"" + info.title + "\" (Review Required)";
  
  const htmlBody = `
    <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc; padding: 25px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        
        <!-- Header Banner -->
        <div style="background-color: #0a192f; padding: 25px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">Islamabad Model College for Boys G-10/4</h2>
          <p style="margin: 6px 0 0; font-size: 13px; color: #ffc107; font-weight: 600;">PHOTO GALLERY SUBMISSION REVIEW</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 25px;">
          <p style="font-size: 15px; color: #334155; margin-top: 0;">Assalam-o-Alaikum Administrator,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            A new photo has been submitted for the website gallery. Google Drive is <b>NOT</b> used (Zero Drive storage). Photo is hosted directly in GitHub:
          </p>
          
          <!-- Image Preview -->
          <div style="text-align: center; margin: 20px 0; background-color: #0f172a; border-radius: 12px; overflow: hidden; padding: 10px;">
            <img src="${info.imageUrl}" alt="${escapeHtml(info.title)}" style="max-width: 100%; max-height: 380px; height: auto; border-radius: 8px; display: block; margin: 0 auto;">
          </div>
          
          <!-- Submission Meta -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; width: 35%; color: #334155; border-radius: 6px 0 0 6px;">Photo Title:</td>
              <td style="padding: 8px 12px; background: #f8fafc; color: #0a192f; font-weight: 600; border-radius: 0 6px 6px 0;">${escapeHtml(info.title)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #334155;">Submitted By:</td>
              <td style="padding: 8px 12px; color: #475569;">${escapeHtml(info.submitter)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; color: #334155;">Category:</td>
              <td style="padding: 8px 12px; background: #f8fafc; color: #475569; text-transform: capitalize;">${escapeHtml(info.category)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #334155;">Description:</td>
              <td style="padding: 8px 12px; color: #475569;">${info.description ? escapeHtml(info.description) : '<i>None provided</i>'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; color: #334155;">Storage:</td>
              <td style="padding: 8px 12px; background: #f8fafc; color: #10b981; font-weight: bold;">GitHub Repository (0 MB Drive storage)</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #334155;">Submitted At:</td>
              <td style="padding: 8px 12px; color: #64748b;">${info.timestamp}</td>
            </tr>
          </table>
          
          <!-- One-Click Action Buttons -->
          <div style="text-align: center; margin: 30px 0 20px;">
            <a href="${info.approveUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; margin: 0 8px 10px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              ✅ APPROVE & PUBLISH
            </a>
            <a href="${info.rejectUrl}" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; margin: 0 8px 10px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
              ❌ REJECT & DELETE
            </a>
          </div>
          
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 25px;">
            Note: Clicking Approve publishes this photo to the live gallery. Clicking Reject will delete it from GitHub automatically.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          © 2026 Islamabad Model College for Boys G-10/4 | GitHub Automated Gallery System
        </div>
      </div>
    </div>
  `;
  
  GmailApp.sendEmail(adminEmail, subject, "New photo submission review required: " + info.title, {
    htmlBody: htmlBody
  });
}

function getOrCreateSheet(name) {
  const files = DriveApp.getFilesByName(name);
  let spreadsheet;
  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    spreadsheet = SpreadsheetApp.create(name);
    const sheet = spreadsheet.getActiveSheet();
    sheet.appendRow([
      "Submission ID",
      "Date & Time",
      "Submitter Name",
      "Category",
      "Photo Title",
      "Description",
      "GitHub Path",
      "Image URL",
      "Status",
      "File SHA"
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#0a192f").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return spreadsheet.getActiveSheet();
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(text) {
  if (!text) return "";
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
