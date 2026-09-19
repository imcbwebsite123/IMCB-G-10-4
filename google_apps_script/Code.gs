/**
 * =====================================================================
 * IMCB G-10/4 PHOTO GALLERY - DIRECT EMAIL BACKEND
 * =====================================================================
 * Administrator: imcb.website@gmail.com
 * 
 * Features:
 * 1. ZERO Google Drive storage used (No Drive files/folders created).
 * 2. ZERO GitHub storage used.
 * 3. Photo is sent directly to imcb.website@gmail.com as an email attachment!
 * 4. Never blocked by QUIC / FormSubmit errors.
 * =====================================================================
 */

const ADMIN_EMAIL = "imcb.website@gmail.com";

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "IMCB Gallery Direct Email Service is active."
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const submitter = data.submitter || "Anonymous Contributor";
    const title = data.title || "Campus Photo";
    const category = data.category || "General";
    const description = data.description || "None provided";
    let base64Data = data.image || "";
    const fileName = data.fileName || "submission.jpg";
    const mimeType = data.mimeType || "image/jpeg";
    
    if (!base64Data) {
      return jsonResponse({ success: false, message: "No image received" });
    }
    
    // Strip Base64 header if present
    if (base64Data.indexOf(",") > -1) {
      base64Data = base64Data.split(",")[1];
    }
    
    // Decode image in memory (NOT saved in Drive, NOT saved in GitHub)
    const decodedBytes = Utilities.base64Decode(base64Data);
    const imageBlob = Utilities.newBlob(decodedBytes, mimeType, fileName);
    
    const subject = "📸 New Gallery Photo Submission: \"" + title + "\"";
    const timestamp = Utilities.formatDate(new Date(), "GMT+5", "dd MMM yyyy, hh:mm a");
    
    const htmlBody = `
      <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f1f5f9; padding: 25px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <div style="background-color: #0a192f; padding: 20px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 19px; font-weight: 700;">Islamabad Model College for Boys G-10/4</h2>
            <p style="margin: 5px 0 0; font-size: 13px; color: #ffc107; font-weight: 600;">NEW PHOTO SUBMISSION FOR GALLERY</p>
          </div>
          <div style="padding: 25px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0;">Assalam-o-Alaikum Administrator,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              A visitor has submitted a new photo for the college website gallery. The photo is attached directly to this email:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
              <tr>
                <td style="padding: 9px 12px; background: #f8fafc; font-weight: bold; width: 32%; color: #334155; border: 1px solid #e2e8f0;">Photo Title:</td>
                <td style="padding: 9px 12px; color: #0a192f; font-weight: 600; border: 1px solid #e2e8f0;">${escapeHtml(title)}</td>
              </tr>
              <tr>
                <td style="padding: 9px 12px; font-weight: bold; color: #334155; border: 1px solid #e2e8f0;">Submitted By:</td>
                <td style="padding: 9px 12px; color: #475569; border: 1px solid #e2e8f0;">${escapeHtml(submitter)}</td>
              </tr>
              <tr>
                <td style="padding: 9px 12px; background: #f8fafc; font-weight: bold; color: #334155; border: 1px solid #e2e8f0;">Category:</td>
                <td style="padding: 9px 12px; color: #475569; border: 1px solid #e2e8f0;">${escapeHtml(category)}</td>
              </tr>
              <tr>
                <td style="padding: 9px 12px; font-weight: bold; color: #334155; border: 1px solid #e2e8f0;">Description:</td>
                <td style="padding: 9px 12px; color: #475569; border: 1px solid #e2e8f0;">${escapeHtml(description)}</td>
              </tr>
              <tr>
                <td style="padding: 9px 12px; background: #f8fafc; font-weight: bold; color: #334155; border: 1px solid #e2e8f0;">Submitted At:</td>
                <td style="padding: 9px 12px; color: #64748b; border: 1px solid #e2e8f0;">${timestamp}</td>
              </tr>
            </table>
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 15px; border-radius: 6px; font-size: 13px; color: #065f46; margin-top: 15px;">
              📁 <b>Photo Attachment:</b> The photo is attached to this email. You can download or view it above. (Zero Google Drive or GitHub storage used).
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            © 2026 Islamabad Model College for Boys G-10/4 | Automated Gallery System
          </div>
        </div>
      </div>
    `;
    
    // Send email directly to imcb.website@gmail.com with image attachment
    GmailApp.sendEmail(ADMIN_EMAIL, subject, "New photo submitted: " + title, {
      htmlBody: htmlBody,
      attachments: [imageBlob]
    });
    
    return jsonResponse({
      success: true,
      message: "Photo emailed directly to admin successfully."
    });
    
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Error sending email: " + err.toString()
    });
  }
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
