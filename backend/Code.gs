const SETTINGS = {
  uploadFolderName: "Website Uploads",
  notifyEmail: "",
  notifyOnRsvp: true,
  notifyOnBooking: true,
  dashboardKey: "change-this-key"
};

const SHEETS = {
  rsvp: {
    name: "RSVP",
    headers: ["Received", "Party", "Guest", "Reply", "Dinner", "Song", "Note"]
  },
  booking: {
    name: "Bookings",
    headers: ["Received", "Reference", "Name", "Email", "Phone", "Service", "Date",
              "Time", "Minutes", "Staff", "Price", "Notes", "Status"]
  },
  upload: {
    name: "Uploads",
    headers: ["Received", "File", "Type", "Size KB", "Link"]
  },
  message: {
    name: "Messages",
    headers: ["Received", "Name", "Email", "Phone", "Message"]
  }
};

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const kind = String(body.kind || "").toLowerCase();

    if (kind === "rsvp") return reply(saveRsvp(body));
    if (kind === "booking") return reply(saveBooking(body));
    if (kind === "upload") return reply(saveUpload(body));
    if (kind === "message") return reply(saveMessage(body));

    return reply({ ok: false, error: "Unknown kind" });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const what = String(params.what || "");
  if (what === "slots") return reply({ ok: true, booked: bookedList() });
  if (what === "data") {
    if (String(params.key || "") !== SETTINGS.dashboardKey) {
      return reply({ ok: false, error: "Wrong key" });
    }
    return reply({ ok: true, rsvp: rsvpRows(), uploads: uploadRows(), bookings: bookedList() });
  }
  return reply({ ok: true, status: "ready" });
}

function rowsOf(key) {
  const spec = SHEETS[key];
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(spec.name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const width = spec.headers.length;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
}

function stamp(value) {
  return value instanceof Date ? value.toISOString() : String(value || "");
}

function rsvpRows() {
  return rowsOf("rsvp").map(function (r) {
    return {
      received: stamp(r[0]),
      party: String(r[1] || ""),
      guest: String(r[2] || ""),
      reply: String(r[3] || ""),
      meal: String(r[4] || ""),
      song: String(r[5] || ""),
      note: String(r[6] || "")
    };
  });
}

function uploadRows() {
  return rowsOf("upload").map(function (r) {
    return {
      received: stamp(r[0]),
      file: String(r[1] || ""),
      type: String(r[2] || ""),
      sizeKb: Number(r[3] || 0),
      link: String(r[4] || "")
    };
  });
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetFor(key) {
  const spec = SHEETS[key];
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(spec.name);
  if (!sheet) {
    sheet = book.insertSheet(spec.name);
    sheet.appendRow(spec.headers);
    sheet.getRange(1, 1, 1, spec.headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function saveRsvp(body) {
  const sheet = sheetFor("rsvp");
  const now = new Date();
  const party = String(body.party || "");
  const people = Array.isArray(body.people) ? body.people : [];

  const existing = sheet.getDataRange().getValues();
  for (let r = existing.length - 1; r >= 1; r--) {
    if (String(existing[r][1]) === party) sheet.deleteRow(r + 1);
  }

  people.forEach(function (p) {
    sheet.appendRow([
      now,
      party,
      String(p.name || ""),
      p.attending ? "Accepts" : "Declines",
      String(p.meal || ""),
      String(body.song || ""),
      String(body.note || "")
    ]);
  });

  const going = people.filter(function (p) { return p.attending; }).length;

  if (SETTINGS.notifyOnRsvp && SETTINGS.notifyEmail) {
    MailApp.sendEmail(
      SETTINGS.notifyEmail,
      "RSVP received: " + party,
      party + " replied with " + going + " attending out of " + people.length + ".\n\n" +
      people.map(function (p) {
        return p.name + ": " + (p.attending ? "Accepts" : "Declines") + (p.meal ? " (" + p.meal + ")" : "");
      }).join("\n") +
      (body.song ? "\n\nSong request: " + body.song : "") +
      (body.note ? "\n\nNote: " + body.note : "")
    );
  }

  return { ok: true, saved: people.length, attending: going };
}

function saveBooking(body) {
  const sheet = sheetFor("booking");
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const clash = conflicts(String(body.date || ""), String(body.time || ""),
                            Number(body.minutes || 30), String(body.staff || ""));
    if (clash) {
      return { ok: false, taken: true, error: "That time was just taken" };
    }
    const reference = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd") +
      "-" + Math.floor(Math.random() * 9000 + 1000);
    sheet.appendRow([
      new Date(),
      reference,
      String(body.name || ""),
      String(body.email || ""),
      String(body.phone || ""),
      String(body.service || ""),
      String(body.date || ""),
      String(body.time || ""),
      Number(body.minutes || 30),
      String(body.staff || ""),
      Number(body.price || 0),
      String(body.notes || ""),
      "New"
    ]);
    body.reference = reference;
  } finally {
    lock.releaseLock();
  }

  if (SETTINGS.notifyOnBooking && SETTINGS.notifyEmail) {
    MailApp.sendEmail(
      SETTINGS.notifyEmail,
      "New booking: " + body.service + " on " + body.date,
      [
        "Name: " + body.name,
        "Email: " + body.email,
        "Phone: " + body.phone,
        "Service: " + body.service,
        "When: " + body.date + " at " + body.time,
        "Notes: " + (body.notes || "none")
      ].join("\n")
    );
  }

  return { ok: true, reference: body.reference };
}

function minutesOf(time) {
  const bits = String(time || "").split(":");
  return (Number(bits[0]) || 0) * 60 + (Number(bits[1]) || 0);
}

function bookedList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.booking.name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, SHEETS.booking.headers.length).getValues();
  const out = [];
  for (let r = 0; r < rows.length; r++) {
    if (String(rows[r][12]) === "Cancelled") continue;
    const date = rows[r][6] instanceof Date
      ? Utilities.formatDate(rows[r][6], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(rows[r][6] || "");
    if (!date) continue;
    out.push({
      date: date,
      time: String(rows[r][7] || ""),
      minutes: Number(rows[r][8] || 30),
      staff: String(rows[r][9] || "")
    });
  }
  return out;
}

function conflicts(date, time, minutes, staff) {
  const start = minutesOf(time);
  const end = start + minutes;
  const list = bookedList();
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.date !== date) continue;
    if (staff && b.staff && b.staff !== staff) continue;
    const bs = minutesOf(b.time);
    if (start < bs + b.minutes && bs < end) return true;
  }
  return false;
}

function saveMessage(body) {
  const sheet = sheetFor("message");
  sheet.appendRow([
    new Date(),
    String(body.name || ""),
    String(body.email || ""),
    String(body.phone || ""),
    String(body.message || "")
  ]);
  return { ok: true };
}

function saveUpload(body) {
  const folder = uploadFolder();
  const bytes = Utilities.base64Decode(body.data);
  const blob = Utilities.newBlob(bytes, body.mimeType || "application/octet-stream", safeName(body.filename));
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  sheetFor("upload").appendRow([
    new Date(),
    file.getName(),
    String(body.mimeType || ""),
    Math.round(file.getSize() / 1024),
    file.getUrl()
  ]);

  return { ok: true, url: file.getUrl() };
}

function uploadFolder() {
  const found = DriveApp.getFoldersByName(SETTINGS.uploadFolderName);
  return found.hasNext() ? found.next() : DriveApp.createFolder(SETTINGS.uploadFolderName);
}

function safeName(name) {
  const clean = String(name || "upload").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + clean;
}
