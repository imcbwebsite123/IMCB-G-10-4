/**
 * =====================================================================
 * IMCB G-10/4 PHOTO GALLERY - COMPLETE SUBMISSION & APPROVAL BACKEND
 * =====================================================================
 * Administrator: imcb.website@gmail.com
 * Features:
 * 1. Visitor submits photo on website.
 * 2. Review email sent to imcb.website@gmail.com with [Approve] & [Reject] buttons.
 * 3. One-click Approve: Photo is instantly published to live website gallery!
 * 4. One-click Reject: Photo is automatically trashed and deleted!
 * 5. Public API serves approved photos dynamically to gallery.html.
 * =====================================================================
 */

const ADMIN_EMAIL = "imcb.website@gmail.com";
const FOLDER_NAME = "IMCB_Gallery_Submissions";
const SHEET_NAME = "IMCB_Gallery_Database";

/**
 * Handle GET requests:
 * - action=getApproved : Return approved photos for website gallery
 * - action=approve&id=... : Approve submission from Gmail button
 * - action=reject&id=... : Reject submission from Gmail button
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
      message: "IMCB Gallery API is active."
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
    const category = data.category || "General";
    const description = data.description || "";
    let base64Data = data.image || "";
    const fileName = data.fileName || "photo.jpg";
    const mimeType = data.mimeType || "image/jpeg";
    
    if (!base64Data) {
      return jsonResponse({ success: false, message: "No image received" });
    }
    
    // Strip Base64 prefix if present
    if (base64Data.indexOf(",") > -1) {
      base64Data = base64Data.split(",")[1];
    }
    
    // 1. Save photo to Google Drive
    const folder = getOrCreateFolder(FOLDER_NAME);
    const decodedBytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileId = file.getId();
    
    // Direct public viewable URL
    const imageUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    
    // 2. Generate unique Submission ID
    const submissionId = "SUB-" + Utilities.formatDate(new Date(), "GMT+5", "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 1000);
    const timestamp = Utilities.formatDate(new Date(), "GMT+5", "dd MMM yyyy, hh:mm a");
    
    // 3. Save entry to Google Sheet
    const sheet = getOrCreateSheet(SHEET_NAME);
    sheet.appendRow([
      submissionId,
      timestamp,
      submitter,
      category,
      title,
      description,
      fileId,
      imageUrl,
      "Pending"
    ]);
    
    // 4. Send Review Email to imcb.website@gmail.com with Approve & Reject buttons
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
    }, blob);
    
    return jsonResponse({
      success: true,
      message: "Photo submitted successfully and sent for admin review."
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
  let fileId = "";
  let imageUrl = "";
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      foundRow = i + 1;
      photoTitle = data[i][4];
      submitter = data[i][2];
      fileId = data[i][6];
      imageUrl = data[i][7];
      break;
    }
  }
  
  if (foundRow === -1) {
    return HtmlService.createHtmlOutput("<h2 style='font-family:sans-serif;color:#ef4444;text-align:center;margin-top:40px;'>Submission ID not found or already processed.</h2>")
      .setTitle("Submission Not Found");
  }
  
  const isApproved = (newStatus === "Approved");
  
  // Update status in sheet
  sheet.getRange(foundRow, 9).setValue(newStatus);
  
  // If rejected, move file to trash to free up Google Drive storage
  if (!isApproved && fileId) {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (e) {}
  }
  
  const color = isApproved ? "#10b981" : "#ef4444";
  const icon = isApproved ? "✅" : "❌";
  const titleText = isApproved ? "Photo Approved & Published!" : "Photo Rejected & Deleted";
  const descText = isApproved 
    ? "This photo has been approved and is now LIVE in the IMCB G-10/4 Photo Gallery for all website visitors." 
    : "This photo has been rejected and deleted from the database. It will not be shown on the website.";
    
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
        .btn-gallery { display: inline-block; background: #0a192f; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 600; font-size: 0.95rem; transition: background 0.2s; }
        .btn-gallery:hover { background: #133c66; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-circle">${icon}</div>
        <h1>${titleText}</h1>
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
  
  approvedList.reverse();
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    count: approvedList.length,
    photos: approvedList
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send Review Email to Administrator with [Approve] & [Reject] buttons
 */
function sendAdminReviewEmail(adminEmail, info, imageBlob) {
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
            A new photo has been submitted for the website gallery. Please review the details below and click <b>Approve</b> or <b>Reject</b>:
          </p>
          
          <!-- Image Preview -->
          <div style="text-align: center; margin: 20px 0; background-color: #0f172a; border-radius: 12px; overflow: hidden; padding: 10px;">
            <img src="${info.imageUrl}" alt="${escapeHtml(info.title)}" style="max-width: 100%; max-height: 380px; height: auto; border-radius: 8px; display: block; margin: 0 auto;">
          </div>
          
          <!-- Submission Meta -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
            <tr>
              <td style="padding: 9px 12px; background: #f1f5f9; font-weight: bold; width: 35%; color: #334155; border-radius: 6px 0 0 6px;">Photo Title:</td>
              <td style="padding: 9px 12px; background: #f8fafc; color: #0a192f; font-weight: 600; border-radius: 0 6px 6px 0;">${escapeHtml(info.title)}</td>
            </tr>
            <tr>
              <td style="padding: 9px 12px; font-weight: bold; color: #334155;">Submitted By:</td>
              <td style="padding: 9px 12px; color: #475569;">${escapeHtml(info.submitter)}</td>
            </tr>
            <tr>
              <td style="padding: 9px 12px; background: #f1f5f9; font-weight: bold; color: #334155;">Category:</td>
              <td style="padding: 9px 12px; background: #f8fafc; color: #475569;">${escapeHtml(info.category)}</td>
            </tr>
            <tr>
              <td style="padding: 9px 12px; font-weight: bold; color: #334155;">Description:</td>
              <td style="padding: 9px 12px; color: #475569;">${info.description ? escapeHtml(info.description) : '<i>None provided</i>'}</td>
            </tr>
            <tr>
              <td style="padding: 9px 12px; background: #f1f5f9; font-weight: bold; color: #334155;">Submitted At:</td>
              <td style="padding: 9px 12px; background: #f8fafc; color: #64748b;">${info.timestamp}</td>
            </tr>
          </table>
          
          <!-- One-Click Action Buttons -->
          <div style="text-align: center; margin: 30px 0 20px;">
            <a href="${info.approveUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; margin: 0 8px 10px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              ✅ APPROVE & PUBLISH
            </a>
            <a href="${info.rejectUrl}" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; margin: 0 8px 10px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
              ❌ REJECT / DISCARD
            </a>
          </div>
          
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 25px;">
            Note: Clicking Approve will instantly publish this photo to the live gallery on GitHub Pages. Clicking Reject will delete the photo.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          © 2026 Islamabad Model College for Boys G-10/4 | Automated Gallery Notification System
        </div>
      </div>
    </div>
  `;
  
  GmailApp.sendEmail(adminEmail, subject, "New photo submission review required: " + info.title, {
    htmlBody: htmlBody,
    attachments: [imageBlob]
  });
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(name);
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
      "Drive File ID",
      "Image URL",
      "Status"
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#0a192f").setFontColor("#ffffff");
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
