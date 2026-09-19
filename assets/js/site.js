(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  if (!$("flow")) return;

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];
  var state = { service: null, date: null, time: null, booked: [], month: null };

  function money(n) {
    if (!n) return "Free";
    return CONFIG.currency + Number(n).toLocaleString("en-PH");
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fromIso(s) {
    var b = s.split("-");
    return new Date(Number(b[0]), Number(b[1]) - 1, Number(b[2]));
  }
  function mins(t) {
    var b = String(t).split(":");
    return Number(b[0]) * 60 + Number(b[1]);
  }
  function clock(m) {
    var h = Math.floor(m / 60), n = m % 60;
    var ap = h < 12 ? "AM" : "PM";
    var hh = h % 12 === 0 ? 12 : h % 12;
    return hh + ":" + pad(n) + " " + ap;
  }
  function longDate(s) {
    var d = fromIso(s);
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }
  function hoursFor(s) {
    var key = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][fromIso(s).getDay()];
    return CONFIG.hours[key] || null;
  }
  function closed(s) {
    return (CONFIG.closedDates || []).indexOf(s) !== -1 || !hoursFor(s);
  }

  function freeSlots(dateStr, service) {
    var span = hoursFor(dateStr);
    if (!span) return [];
    var step = CONFIG.slotMinutes || 30;
    var need = service.minutes;
    var open = mins(span.open), shut = mins(span.close);
    var now = new Date();
    var lead = (CONFIG.leadHours || 0) * 60;
    var today = iso(now);
    var nowMins = now.getHours() * 60 + now.getMinutes();
    var taken = state.booked.filter(function (b) { return b.date === dateStr; });
    var out = [];
    for (var t = open; t + need <= shut; t += step) {
      if (dateStr === today && t < nowMins + lead) continue;
      if (dateStr < today) continue;
      var clash = taken.some(function (b) {
        if (service.staff && b.staff && b.staff !== service.staff) return false;
        var bs = mins(b.time);
        return t < bs + b.minutes && bs < t + need;
      });
      if (!clash) out.push(t);
    }
    return out;
  }

  function headSize() {
    var h = document.querySelector("header");
    return h ? Math.round(h.getBoundingClientRect().height) : 74;
  }
  function syncHead() {
    document.documentElement.style.setProperty("--hdr", headSize() + "px");
  }
  syncHead();
  window.addEventListener("resize", syncHead);

  function show(n) {
    var rec = $("recap");
    if (rec) rec.hidden = n === 5 || n === 1;
    $("flow").classList.toggle("solo", !rec || rec.hidden);
    [1, 2, 3, 4, 5].forEach(function (i) {
      var p = $("pane-" + i);
      if (p) p.hidden = i !== n;
    });
    Array.prototype.forEach.call(document.querySelectorAll(".step"), function (el) {
      var i = Number(el.dataset.step);
      el.className = "step" + (i === n ? " on" : (i < n ? " done" : ""));
    });
    $("steps").hidden = n === 5;
    var live = document.querySelector(".step.on");
    if (live && $("steps").scrollWidth > $("steps").clientWidth) {
      $("steps").scrollTo({ left: Math.max(0, live.offsetLeft - 16), behavior: "smooth" });
    }
    var top = $("flow").getBoundingClientRect().top + window.scrollY - headSize() - 12;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
  }

  function summary() {
    var bits = [];
    if (state.service) bits.push(esc(state.service.name) + ", " + state.service.minutes +
      " min, " + money(state.service.price));
    if (state.date) bits.push(longDate(state.date));
    if (state.time !== null) bits.push(clock(state.time));
    return bits.join("  &middot;  ");
  }
  function paintSummary() {
    ["sum-2", "sum-3", "sum-4"].forEach(function (id) {
      if ($(id)) $(id).innerHTML = summary();
    });
    var list = $("recap-list");
    if (!list) return;
    var rows = [
      ["Service", state.service ? state.service.name : "Not chosen"],
      ["Date", state.date ? longDate(state.date) : "Not chosen"],
      ["Time", state.time !== null ? clock(state.time) : "Not chosen"],
      ["Length", state.service ? state.service.minutes + " minutes" : "Not chosen"],
      ["Price", state.service ? money(state.service.price) : "Not chosen"]
    ];
    list.innerHTML = rows.map(function (r) {
      var unset = r[1] === "Not chosen";
      return '<div class="rrow"><dt>' + esc(r[0]) + "</dt><dd" +
        (unset ? ' class="muted"' : "") + ">" + esc(r[1]) + "</dd></div>";
    }).join("");
    var note = $("recap-note");
    if (note) {
      note.textContent = state.time !== null
        ? "Nothing is charged online. Pay at the counter."
        : "Nothing is held until you confirm.";
    }
  }

  $("services").innerHTML = CONFIG.services.map(function (s, i) {
    return '<button type="button" class="pick" data-i="' + i + '">' +
      '<b>' + esc(s.name) + '</b>' +
      (s.blurb ? '<small>' + esc(s.blurb) + '</small>' : '') +
      '<span class="meta">' + s.minutes + ' min<i>' + money(s.price) + '</i></span></button>';
  }).join("");

  function drawMonth() {
    var first = new Date(state.month.getFullYear(), state.month.getMonth(), 1);
    var start = (first.getDay() + 6) % 7;
    var total = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 0).getDate();
    $("month").textContent = MONTHS[state.month.getMonth()] + " " + state.month.getFullYear();
    var today = iso(new Date());
    var horizon = new Date();
    horizon.setDate(horizon.getDate() + (CONFIG.bookAheadDays || 60));
    var cells = "";
    for (var b = 0; b < start; b++) cells += '<span class="cell blank"></span>';
    for (var d = 1; d <= total; d++) {
      var s = iso(new Date(state.month.getFullYear(), state.month.getMonth(), d));
      var off = s < today || s > iso(horizon) || closed(s) ||
        freeSlots(s, state.service).length === 0;
      cells += '<button type="button" class="cell' + (off ? " off" : "") +
        (s === state.date ? " on" : "") + '"' + (off ? " disabled" : "") +
        ' data-date="' + s + '">' + d + '</button>';
    }
    $("days").innerHTML = cells;
    var canPrev = state.month > new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    $("prev").disabled = !canPrev;
  }

  function drawSlots() {
    var list = freeSlots(state.date, state.service);
    $("slots").innerHTML = list.map(function (t) {
      return '<button type="button" class="slot" data-t="' + t + '">' + clock(t) + '</button>';
    }).join("");
    $("slot-note").textContent = list.length
      ? list.length + " open, each " + state.service.minutes + " minutes"
      : "Nothing left on this day. Pick another date.";
  }

  function loadBooked() {
    if (!CONFIG.endpoint) return Promise.resolve();
    return fetch(CONFIG.endpoint + (CONFIG.endpoint.indexOf("?") === -1 ? "?" : "&") + "what=slots")
      .then(function (r) { return r.json(); })
      .then(function (out) { state.booked = out.booked || []; })
      .catch(function () { state.booked = []; });
  }

  $("services").addEventListener("click", function (e) {
    var b = e.target.closest(".pick");
    if (!b) return;
    state.service = CONFIG.services[Number(b.dataset.i)];
    state.date = null;
    state.time = null;
    state.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    paintSummary();
    loadBooked().then(function () { drawMonth(); show(2); });
  });

  $("prev").addEventListener("click", function () {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
    drawMonth();
  });
  $("next").addEventListener("click", function () {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
    drawMonth();
  });
  $("days").addEventListener("click", function (e) {
    var b = e.target.closest(".cell");
    if (!b || b.disabled || !b.dataset.date) return;
    state.date = b.dataset.date;
    state.time = null;
    paintSummary();
    drawSlots();
    show(3);
  });
  $("slots").addEventListener("click", function (e) {
    var b = e.target.closest(".slot");
    if (!b) return;
    state.time = Number(b.dataset.t);
    paintSummary();
    show(4);
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-back]"), function (b) {
    b.addEventListener("click", function () { show(Number(b.dataset.back)); });
  });

  $("pane-4").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("bk-name").value.trim();
    var phone = $("bk-phone").value.trim();
    var status = $("book-status");
    if (!name || !phone) {
      status.textContent = "Your name and mobile number are needed.";
      status.className = "status bad";
      return;
    }
    var btn = $("book-btn");
    btn.disabled = true;
    status.textContent = "Holding your slot";
    status.className = "status";

    var payload = {
      kind: "booking",
      name: name,
      phone: phone,
      email: $("bk-email").value.trim(),
      service: state.service.name,
      staff: state.service.staff || "",
      price: state.service.price,
      minutes: state.service.minutes,
      date: state.date,
      time: pad(Math.floor(state.time / 60)) + ":" + pad(state.time % 60),
      notes: $("bk-notes").value.trim()
    };

    var send = CONFIG.endpoint
      ? fetch(CONFIG.endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        }).then(function (r) { return r.json(); })
      : new Promise(function (r) {
          setTimeout(function () { r({ ok: true, preview: true, reference: "PREVIEW-0000" }); }, 500);
        });

    send.then(function (out) {
      if (!out.ok && out.taken) {
        status.textContent = "Someone booked that minute before you. Pick another time.";
        status.className = "status bad";
        btn.disabled = false;
        loadBooked().then(function () { drawSlots(); show(3); });
        return;
      }
      if (!out.ok) throw new Error(out.error || "Failed");
      $("done-head").textContent = "You are booked";
      $("done-detail").innerHTML = summary() + "<br>" + esc(CONFIG.address);
      $("done-ref").textContent = out.preview
        ? "This is a preview, so nothing was stored."
        : "Reference " + out.reference;
      show(5);
    }).catch(function () {
      status.textContent = "That did not go through. Please try again, or call us.";
      status.className = "status bad";
    }).then(function () { btn.disabled = false; });
  });

  $("again").addEventListener("click", function () {
    state = { service: null, date: null, time: null, booked: state.booked, month: null };
    $("pane-4").reset();
    $("book-status").textContent = "";
    show(1);
  });

  window.BookingFlow = {
    open: function (opts) {
      opts = opts || {};
      var idx = Number(opts.service);
      if (!isNaN(idx) && CONFIG.services[idx]) {
        state.service = CONFIG.services[idx];
        state.date = null;
        state.time = null;
        state.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      }
      if (!state.service) { paintSummary(); show(1); jump(); return; }
      loadBooked().then(function () {
        if (opts.date && !closed(opts.date) && hoursFor(opts.date)) {
          state.date = opts.date;
          drawSlots();
        }
        drawMonth();
        if (state.date && opts.time !== undefined && opts.time !== null) {
          var free = freeSlots(state.date, state.service);
          if (free.indexOf(Number(opts.time)) !== -1) {
            state.time = Number(opts.time);
            paintSummary();
            show(4);
            jump();
            return;
          }
        }
        paintSummary();
        show(state.date ? 3 : 2);
        jump();
      });
    },
    free: function (dateStr, serviceIndex) {
      var svc = CONFIG.services[Number(serviceIndex) || 0];
      if (!svc) return [];
      return freeSlots(dateStr, svc);
    },
    label: clock,
    day: longDate,
    isOpen: function (dateStr) { return !!hoursFor(dateStr) && !closed(dateStr); },
    hours: hoursFor,
    ready: loadBooked
  };

  function jump() {
    var top = $("flow").getBoundingClientRect().top + window.scrollY - headSize() - 12;
    window.scrollTo({ top: top, behavior: "smooth" });
  }

  paintSummary();
  show(1);
})();

(function () {
  var NAMES = ["sun","mon","tue","wed","thu","fri","sat"];
  var key = NAMES[new Date().getDay()];
  var cell = document.querySelector('.slotday[data-day="' + key + '"]');
  if (cell) cell.classList.add("today");
})();
