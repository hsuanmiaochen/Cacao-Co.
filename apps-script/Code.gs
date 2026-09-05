/**
 * 許願池後端 — 把這個檔案貼到 Google 試算表的 Apps Script 專案裡。
 * 部署步驟見 apps-script/SETUP.md。
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'data';
  if (action === 'data') return jsonResponse(getAllData());
  return jsonResponse({ error: 'unknown action' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var payload = body.payload || {};
    var result;
    if (action === 'addWish') result = addWish(payload);
    else if (action === 'vote') result = castVote(payload);
    else if (action === 'comment') result = addComment(payload);
    else if (action === 'setStatus') result = setStatus(payload);
    else result = { error: 'unknown action' };
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSS() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

var SHEET_DEFS = {
  Settings: ['Key', 'Value'],
  Wishes: ['id', 'title', 'category', 'proposerName', 'reason', 'itemsJson', 'receiptNote', 'status', 'createdAt'],
  Votes: ['id', 'wishId', 'voterId', 'name', 'choice'],
  Comments: ['id', 'wishId', 'name', 'text', 'createdAt']
};

/** 第一次執行時自動建立分頁與預設設定值,之後每次呼叫都會確認一次(很快,不會重複建立)。 */
function ensureSheets() {
  var ss = getSS();
  Object.keys(SHEET_DEFS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(SHEET_DEFS[name]);
    }
  });
  var settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet.getLastRow() < 2) {
    settingsSheet.appendRow(['totalMembers', 36]);
    settingsSheet.appendRow(['annualCap', 20000]);
  }
}

function sheetObjects(name) {
  var sh = getSS().getSheetByName(name);
  var values = sh.getDataRange().getValues();
  var headers = values.shift();
  return values.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function getAllData() {
  ensureSheets();
  var settings = {};
  sheetObjects('Settings').forEach(function (r) { settings[r.Key] = r.Value; });

  var wishes = sheetObjects('Wishes').map(function (w) {
    var items = [];
    try { items = JSON.parse(w.itemsJson || '[]'); } catch (e) {}
    return {
      id: w.id, title: w.title, category: w.category, proposerName: w.proposerName,
      reason: w.reason, items: items, receiptNote: w.receiptNote, status: w.status,
      createdAt: Number(w.createdAt), votes: [], comments: []
    };
  });
  var wishMap = {};
  wishes.forEach(function (w) { wishMap[w.id] = w; });

  sheetObjects('Votes').forEach(function (v) {
    var w = wishMap[v.wishId];
    if (w) w.votes.push({ id: v.voterId, name: v.name, choice: v.choice });
  });
  sheetObjects('Comments').forEach(function (c) {
    var w = wishMap[c.wishId];
    if (w) w.comments.push({ id: c.id, name: c.name, text: c.text, createdAt: Number(c.createdAt) });
  });
  wishes.forEach(function (w) { w.comments.sort(function (a, b) { return a.createdAt - b.createdAt; }); });
  wishes.sort(function (a, b) { return b.createdAt - a.createdAt; });

  return { settings: settings, wishes: wishes };
}

function addWish(p) {
  ensureSheets();
  var id = 'w_' + Utilities.getUuid().slice(0, 8);
  getSS().getSheetByName('Wishes').appendRow([
    id, p.title, p.category, p.proposerName, p.reason,
    JSON.stringify(p.items || []), p.receiptNote || '', '許願中', Date.now()
  ]);
  return { ok: true, id: id };
}

function castVote(p) {
  ensureSheets();
  var sh = getSS().getSheetByName('Votes');
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var wishIdCol = headers.indexOf('wishId'), voterCol = headers.indexOf('voterId'),
      choiceCol = headers.indexOf('choice'), nameCol = headers.indexOf('name');
  for (var i = 1; i < values.length; i++) {
    if (values[i][wishIdCol] === p.wishId && values[i][voterCol] === p.voterId) {
      if (values[i][choiceCol] === p.choice) {
        sh.deleteRow(i + 1); // 再按一次＝收回投票
      } else {
        sh.getRange(i + 1, choiceCol + 1).setValue(p.choice);
        sh.getRange(i + 1, nameCol + 1).setValue(p.name);
      }
      return { ok: true };
    }
  }
  sh.appendRow([Utilities.getUuid().slice(0, 8), p.wishId, p.voterId, p.name, p.choice]);
  return { ok: true };
}

function addComment(p) {
  ensureSheets();
  getSS().getSheetByName('Comments').appendRow([Utilities.getUuid().slice(0, 8), p.wishId, p.name, p.text, Date.now()]);
  return { ok: true };
}

function setStatus(p) {
  ensureSheets();
  var sh = getSS().getSheetByName('Wishes');
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var idCol = headers.indexOf('id'), statusCol = headers.indexOf('status');
  for (var i = 1; i < values.length; i++) {
    if (values[i][idCol] === p.wishId) {
      sh.getRange(i + 1, statusCol + 1).setValue(p.status);
      return { ok: true };
    }
  }
  return { ok: false, error: 'not found' };
}

/**
 * 選用：在 Apps Script 編輯器裡手動執行一次,會建立分頁並塞入幾筆範例資料,
 * 方便部署後馬上看到效果。不需要範例資料的話可以跳過這個函式。
 */
function seedExampleData() {
  ensureSheets();
  var ss = getSS();
  var now = Date.now(), day = 864e5;
  var wishSheet = ss.getSheetByName('Wishes');
  if (wishSheet.getLastRow() > 1) return; // 已經有資料就不重複塞

  wishSheet.appendRow(['w1', '羽球拍與羽球補貨', '耗材', '林亭妤',
    '社課用球拍老化、羽球消耗快,補齊公用裝備讓大家練球不斷手。',
    JSON.stringify([{ name: '羽球拍（公用）', qty: 4, unitPrice: 450 }, { name: '羽球筒（12顆裝）', qty: 6, unitPrice: 280 }]),
    '將於運動用品店現場開統編收據', '已核准', now - 9 * day]);

  wishSheet.appendRow(['w2', '校外場地租借（友誼賽前練習）', '場地租借', '陳柏宇',
    '友誼賽對手場館較遠,想租借鄰近場館練習,方便社員賽前熱身。',
    JSON.stringify([{ name: '場地租借（2小時）', qty: 1, unitPrice: 1500 }]),
    '場館收據將於活動後由財務上傳', '討論中', now - 5 * day]);

  wishSheet.appendRow(['w3', '直播用混音器一台', '大型設備', '吳宗翰',
    '社課直播常有雜音,添購混音器統一收音,之後也能留給下一屆社員使用。',
    JSON.stringify([{ name: 'USB 混音器', qty: 1, unitPrice: 6800 }]),
    '已向店家詢價,可提供估價單', '討論中', now - 3 * day]);

  var votesSheet = ss.getSheetByName('Votes');
  ['v1','v2','v3','v4','v5','v6','v7','v8'].forEach(function (v, idx) {
    votesSheet.appendRow([Utilities.getUuid().slice(0, 8), 'w3', v, '社員' + (idx + 1), 'for']);
  });
  votesSheet.appendRow([Utilities.getUuid().slice(0, 8), 'w3', 'v9', '志明', 'against']);
  votesSheet.appendRow([Utilities.getUuid().slice(0, 8), 'w3', 'v10', '雅婷', 'against']);

  var commentsSheet = ss.getSheetByName('Comments');
  commentsSheet.appendRow([Utilities.getUuid().slice(0, 8), 'w1', '財務 阿凱', '金額在額度內沒問題,附上估價單就能核准。', now - 8 * day]);
  commentsSheet.appendRow([Utilities.getUuid().slice(0, 8), 'w3', '林亭妤', '單價超過 5,000,要走投票程序,我先幫忙統計人數。', now - 2 * day]);
}
