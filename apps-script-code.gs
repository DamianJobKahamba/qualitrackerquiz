/* ============================================================
   QualiTracker Quiz — Google Apps Script backend
   Paste this whole file into: your Sheet > Extensions > Apps Script
   Then edit the three CONFIGURE values below.
   ============================================================ */

const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';       // from the sheet's URL: .../d/THIS_PART/edit
const ADMIN_PASSWORD = 'qualitracker2026';                 // must match config.js on the website
const DRIVE_FOLDER_ID = 'PASTE_YOUR_DRIVE_FOLDER_ID_HERE'; // optional — leave the placeholder to skip photos

/* ============================================================
   No need to edit below this line
   ============================================================ */

const PARTICIPANTS_SHEET = 'Participants';
const QUESTIONS_SHEET = 'Questions';
const PARTICIPANT_HEADERS = ['ID','Name','Region','District','Facility','PIN','Completed','Score','CorrectCount','TotalQuestions','RegisteredAt','CompletedAt','PhotoURL'];
const QUESTION_HEADERS = ['ID','Prompt','OptionA','OptionB','OptionC','OptionD','CorrectIndex'];

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'participantNames') return json(getParticipantNames());
    if (action === 'leaderboard') return json(getLeaderboard());
    if (action === 'questions') return json(getQuestions());
    if (action === 'adminParticipants') {
      if (e.parameter.password !== ADMIN_PASSWORD) return json({ error: 'unauthorized' });
      return json(getAllParticipants());
    }
    return json({ error: 'unknown action' });
  } catch (err) {
    return json({ error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    if (action === 'register') return json(registerParticipant(body));
    if (action === 'login') return json(loginParticipant(body));
    if (action === 'submitResult') return json(submitResult(body));
    if (action === 'addQuestion') return json(withAdmin(body, () => addQuestion(body)));
    if (action === 'bulkAddQuestions') return json(withAdmin(body, () => bulkAddQuestions(body)));
    if (action === 'deleteQuestion') return json(withAdmin(body, () => deleteQuestionById(body.id)));
    return json({ error: 'unknown action' });
  } catch (err) {
    return json({ error: String(err) });
  }
}

function withAdmin(body, fn) {
  if (body.adminPassword !== ADMIN_PASSWORD) return { error: 'unauthorized' };
  return fn();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function readRows(sheetName, headers) {
  const sh = sheet(sheetName);
  const data = sh.getDataRange().getValues();
  const rows = data.slice(1).filter(r => r[0]);
  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

function findRowIndexById(sheetName, id) {
  const sh = sheet(sheetName);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

function getParticipantNames() {
  return readRows(PARTICIPANTS_SHEET, PARTICIPANT_HEADERS).map(p => ({ id: p.ID, name: p.Name, facility: p.Facility }));
}

function getAllParticipants() {
  return readRows(PARTICIPANTS_SHEET, PARTICIPANT_HEADERS);
}

function getLeaderboard() {
  return readRows(PARTICIPANTS_SHEET, PARTICIPANT_HEADERS)
    .filter(p => p.Completed === true || p.Completed === 'TRUE')
    .map(p => ({
      name: p.Name, region: p.Region, district: p.District, facility: p.Facility,
      score: Number(p.Score), correctCount: Number(p.CorrectCount), totalQuestions: Number(p.TotalQuestions),
      photoUrl: p.PhotoURL, completedAt: p.CompletedAt
    }));
}

function getQuestions() {
  return readRows(QUESTIONS_SHEET, QUESTION_HEADERS).map(q => ({
    id: q.ID, prompt: q.Prompt,
    options: [q.OptionA, q.OptionB, q.OptionC, q.OptionD],
    correctIndex: Number(q.CorrectIndex)
  }));
}

function registerParticipant(body) {
  const sh = sheet(PARTICIPANTS_SHEET);
  const id = Utilities.getUuid();
  let photoUrl = '';
  if (body.photo && DRIVE_FOLDER_ID && DRIVE_FOLDER_ID.indexOf('PASTE_') === -1) {
    try { photoUrl = savePhotoToDrive(body.photo, (body.name || 'participant') + '_' + id); } catch (err) { photoUrl = ''; }
  }
  sh.appendRow([id, body.name, body.region, body.district, body.facility, body.pin, false, 0, 0, 0, new Date().toISOString(), '', photoUrl]);
  return { ok: true, id: id, pin: body.pin };
}

function savePhotoToDrive(base64DataUrl, name) {
  const parts = base64DataUrl.split(',');
  const match = parts[0].match(/data:(.*);base64/);
  const contentType = match ? match[1] : 'image/jpeg';
  const bytes = Utilities.base64Decode(parts[1]);
  const blob = Utilities.newBlob(bytes, contentType, name + '.jpg');
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function loginParticipant(body) {
  const rows = readRows(PARTICIPANTS_SHEET, PARTICIPANT_HEADERS);
  const p = rows.find(r => String(r.ID) === String(body.id));
  if (!p) return { ok: false, error: 'Participant not found.' };
  if (String(p.PIN).toUpperCase() !== String(body.pin).toUpperCase()) {
    return { ok: false, error: 'Name and PIN don\u2019t match. Please check and try again.' };
  }
  if (p.Completed === true || p.Completed === 'TRUE') {
    return { ok: false, error: 'You\u2019ve already completed this quiz — thanks for participating!' };
  }
  return { ok: true, participant: { id: p.ID, name: p.Name, region: p.Region, district: p.District, facility: p.Facility } };
}

function submitResult(body) {
  const rowNum = findRowIndexById(PARTICIPANTS_SHEET, body.id);
  if (rowNum === -1) return { ok: false, error: 'Participant not found' };
  const sh = sheet(PARTICIPANTS_SHEET);
  sh.getRange(rowNum, 7, 1, 4).setValues([[true, body.score, body.correctCount, body.totalQuestions]]); // Completed, Score, CorrectCount, TotalQuestions
  sh.getRange(rowNum, 12).setValue(new Date().toISOString()); // CompletedAt
  return { ok: true };
}

function addQuestion(body) {
  const sh = sheet(QUESTIONS_SHEET);
  const id = Utilities.getUuid();
  sh.appendRow([id, body.prompt, body.options[0], body.options[1], body.options[2], body.options[3], body.correctIndex]);
  return { ok: true, id: id };
}

function bulkAddQuestions(body) {
  const sh = sheet(QUESTIONS_SHEET);
  const rows = body.questions.map(q => [Utilities.getUuid(), q.prompt, q.options[0], q.options[1], q.options[2], q.options[3], q.correctIndex]);
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  return { ok: true, added: rows.length };
}

function deleteQuestionById(id) {
  const rowNum = findRowIndexById(QUESTIONS_SHEET, id);
  if (rowNum === -1) return { ok: false };
  sheet(QUESTIONS_SHEET).deleteRow(rowNum);
  return { ok: true };
}
