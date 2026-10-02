/**
 * =====================================================================
 * IMCB G-10/4 FEMIS STUDENT TRACKING - CENTRAL CLOUD DATABASE BACKEND
 * =====================================================================
 * Administrator: imcb.website@gmail.com
 * Features:
 * 1. Live synchronization across all devices (Mobile, PC, Tablet).
 * 2. When any teacher or admin edits data anywhere, it updates in Google Sheet
 *    and immediately syncs across all devices!
 * 3. Provides doGet (fetch records) and doPost (save/update records).
 * =====================================================================
 */

const FEMIS_SHEET_NAME = "IMCB_FEMIS_Tracking";

function doGet(e) {
  try {
    const sheet = getOrCreateFemisSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      // Sheet is empty or only header exists, populate defaults
      populateDefaultRecords(sheet);
      return doGet(e);
    }
    
    const headers = data[0];
    const records = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] && !row[2]) continue; // Skip empty rows
      
      const total = parseInt(row[6]) || 0;
      const entered = parseInt(row[7]) || 0;
      const rem = Math.max(0, total - entered);
      const pct = total > 0 ? Math.round((entered / total) * 100) : 0;
      let status = "In Progress";
      if (pct === 100 && total > 0) status = "Completed";
      else if (pct === 0) status = "Pending";
      
      records.push({
        id: String(row[0] || ("femis-" + i)),
        sNo: parseInt(row[1]) || i,
        teacherName: String(row[2] || ""),
        assignment: String(row[3] || ""),
        className: String(row[4] || ""),
        section: String(row[5] || ""),
        totalStudents: total,
        dataEntered: entered,
        remainingStudents: rem,
        completion: pct + "%",
        status: status,
        remarks: String(row[11] || ""),
        updatedAt: String(row[12] || "")
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify(records))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      error: true,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const contents = e.postData ? e.postData.contents : "";
    if (!contents) {
      return jsonResponse({ success: false, message: "No data payload received" });
    }
    
    const payload = JSON.parse(contents);
    const sheet = getOrCreateFemisSheet();
    const data = sheet.getDataRange().getValues();
    
    // Check if updating existing record or adding new
    const recordId = payload.id;
    const assignment = payload.assignment || (payload.className + "-" + (payload.section || "").replace(/Section /i, ""));
    let targetRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][0]);
      const rowAssignment = String(data[i][3]);
      if ((recordId && rowId === String(recordId)) || (assignment && rowAssignment.toLowerCase() === assignment.toLowerCase())) {
        targetRow = i + 1; // 1-indexed for sheet
        break;
      }
    }
    
    const total = parseInt(payload.totalStudents) || 0;
    const entered = parseInt(payload.dataEntered) || 0;
    const rem = Math.max(0, total - entered);
    const pct = total > 0 ? Math.round((entered / total) * 100) : 0;
    let status = "In Progress";
    if (pct === 100 && total > 0) status = "Completed";
    else if (pct === 0) status = "Pending";
    
    const timestamp = payload.updatedAt || Utilities.formatDate(new Date(), "GMT+5", "dd MMM yyyy, hh:mm a");
    
    if (targetRow !== -1) {
      // Update existing row
      sheet.getRange(targetRow, 3).setValue(payload.teacherName || data[targetRow - 1][2]); // Teacher Name
      sheet.getRange(targetRow, 4).setValue(assignment);                                      // Assignment
      sheet.getRange(targetRow, 5).setValue(payload.className || data[targetRow - 1][4]);   // Class
      sheet.getRange(targetRow, 6).setValue(payload.section || data[targetRow - 1][5]);     // Section
      sheet.getRange(targetRow, 7).setValue(total);                                          // Total Students
      sheet.getRange(targetRow, 8).setValue(entered);                                        // Data Entered
      sheet.getRange(targetRow, 9).setValue(rem);                                            // Remaining
      sheet.getRange(targetRow, 10).setValue(pct + "%");                                     // Completion %
      sheet.getRange(targetRow, 11).setValue(status);                                        // Status
      sheet.getRange(targetRow, 12).setValue(payload.remarks || "");                         // Remarks
      sheet.getRange(targetRow, 13).setValue(timestamp);                                     // Last Updated
      
      return jsonResponse({
        success: true,
        message: "Updated record for " + assignment,
        action: "updated"
      });
    } else {
      // Append new row
      const newId = recordId || ("femis-" + Date.now());
      const newSNo = data.length;
      sheet.appendRow([
        newId,
        newSNo,
        payload.teacherName || "Unknown Teacher",
        assignment,
        payload.className || "General",
        payload.section || "Section A",
        total,
        entered,
        rem,
        pct + "%",
        status,
        payload.remarks || "Added via FEMIS portal",
        timestamp
      ]);
      
      return jsonResponse({
        success: true,
        message: "New record added for " + assignment,
        action: "created"
      });
    }
    
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Error updating FEMIS cloud database: " + err.toString()
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFemisSheet() {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!ss) {
    const files = DriveApp.getFilesByName("IMCB_FEMIS_Database");
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create("IMCB_FEMIS_Database");
    }
  }

  let sheet = ss.getSheetByName(FEMIS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(FEMIS_SHEET_NAME);
    // Setup Header Row with formatting
    sheet.appendRow([
      "ID",
      "S.No",
      "Teacher Name",
      "Class-Section",
      "Class",
      "Section",
      "Total Students",
      "Data Entered",
      "Remaining Students",
      "Completion %",
      "Status",
      "Remarks",
      "Last Updated"
    ]);
    
    // Style header row
    const headerRange = sheet.getRange("A1:M1");
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#133c66");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    
    populateDefaultRecords(sheet);
  }
  
  return sheet;
}

function populateDefaultRecords(sheet) {
  const defaults = [
    [1, "Muhammad Sajid", "10th-A", "10th", "Section A", 42, 42],
    [2, "Muhammad Waqas", "10th-B", "10th", "Section B", 44, 44],
    [3, "Nadeem Abbas Abbas", "10th-C", "10th", "Section C", 38, 38],
    [4, "Nawaz Nadeem", "10th-D", "10th", "Section D", 39, 39],
    [5, "Muneeb Saleem Saleem", "10th-E", "10th", "Section E", 35, 35],
    [6, "Zia Ud Din", "11th-A", "11th", "Section A", 40, 40],
    [7, "Imran Siddiqui", "11th-B", "11th", "Section B", 40, 40],
    [8, "Muhammad Ali Awan", "11th-C", "11th", "Section C", 40, 40],
    [9, "Ahmadullah", "11th-D", "11th", "Section D", 40, 40],
    [10, "Iftikhar Hussain Hussain", "11th-E", "11th", "Section E", 41, 41],
    [11, "Mushtaq Hussain Shah", "12th-A", "12th", "Section A", 32, 32],
    [12, "Muhammad Mahmood", "12th-B", "12th", "Section B", 37, 37],
    [13, "Yasir Iqbal", "12th-C", "12th", "Section C", 43, 43],
    [14, "Muhammad Aslam", "12th-D", "12th", "Section D", 39, 39],
    [15, "Aftab Ahmad AHMAD", "12th-E", "12th", "Section E", 32, 32],
    [16, "Shamim akhtar", "6th-A", "6th", "Section A", 41, 41],
    [17, "Rahid Ali", "6th-B", "6th", "Section B", 36, 36],
    [18, "Mamouna Yasmeen", "6th-C", "6th", "Section C", 40, 40],
    [19, "Sobia Ijaz", "6th-D", "6th", "Section D", 40, 40],
    [20, "Saima Awan", "6th-E", "6th", "Section E", 37, 37],
    [21, "Durr E Shahwar", "6th-F", "6th", "Section F", 37, 37],
    [22, "Asya Tabasum Butt", "7th-A", "7th", "Section A", 49, 49],
    [23, "Humaira kiani", "7th-B", "7th", "Section B", 45, 45],
    [24, "Irfan Mahmood", "7th-C", "7th", "Section C", 45, 45],
    [25, "Saniya Sana", "7th-D", "7th", "Section D", 42, 42],
    [26, "M.Saleem", "7th-E", "7th", "Section E", 40, 40],
    [27, "HAFIZ AMIR SHAHZAD", "7th-F", "7th", "Section F", 40, 40],
    [28, "Safia Ishaq", "8th-A", "8th", "Section A", 47, 47],
    [29, "Hafiz Roohul Ameen Roohul Ameen", "8th-B", "8th", "Section B", 45, 45],
    [30, "Kirshan", "8th-C", "8th", "Section C", 49, 49],
    [31, "uzma khatoon", "8th-D", "8th", "Section D", 46, 46],
    [32, "Muhammad Saleem", "8th-E", "8th", "Section E", 38, 38],
    [33, "Chan Mehboob", "8th-F", "8th", "Section F", 41, 41],
    [34, "Sultan Sikandar", "9th-A", "9th", "Section A", 28, 28],
    [35, "Aziz Ullah", "9th-B", "9th", "Section B", 56, 56],
    [36, "Jamil Hussain", "9th-C", "9th", "Section C", 54, 54],
    [37, "Shamsuddin Qureshi", "9th-D", "9th", "Section D", 49, 49],
    [38, "Nadeem Mehmood", "9th-E", "9th", "Section E", 34, 34],
    [39, "Ajmal Khan", "9th-F", "9th", "Section F", 28, 28]
  ];
  
  const now = Utilities.formatDate(new Date(), "GMT+5", "dd MMM yyyy, hh:mm a");
  
  defaults.forEach(function(row) {
    const sNo = row[0];
    const teacher = row[1];
    const assignment = row[2];
    const cName = row[3];
    const sec = row[4];
    const total = row[5];
    const entered = row[6];
    const rem = total - entered;
    const pct = Math.round((entered / total) * 100);
    const status = pct === 100 ? "Completed" : (pct > 0 ? "In Progress" : "Pending");
    
    sheet.appendRow([
      "femis-" + sNo,
      sNo,
      teacher,
      assignment,
      cName,
      sec,
      total,
      entered,
      rem,
      pct + "%",
      status,
      "Completed - FEMIS Entry Finalized",
      now
    ]);
  });
}
