(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var STORE = "wedding-dashboard";
  var state = { rsvp: [], uploads: [] };

  function saved() {
    try { return JSON.parse(localStorage.getItem(STORE) || "null"); }
    catch (e) { return null; }
  }
  function remember(v) {
    try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) {}
  }

  $("couple").textContent = CONFIG.nameA + " and " + CONFIG.nameB;
  $("when").textContent = CONFIG.dateLabel + ", " + CONFIG.venueShort;
  $("mark").textContent = CONFIG.nameA.charAt(0) + CONFIG.nameB.charAt(0).toLowerCase();
  document.title = CONFIG.nameA + " and " + CONFIG.nameB + " dashboard";

  function parties() {
    var byParty = {};
    CONFIG.guests.forEach(function (g) {
      byParty[g.party] = { party: g.party, members: g.members.slice(), replies: {} };
    });
    state.rsvp.forEach(function (r) {
      if (!byParty[r.party]) byParty[r.party] = { party: r.party, members: [], replies: {} };
      byParty[r.party].replies[r.guest] = r;
      if (byParty[r.party].members.indexOf(r.guest) === -1) {
        byParty[r.party].members.push(r.guest);
      }
    });
    return Object.keys(byParty).map(function (k) {
      var p = byParty[k];
      var answered = p.members.filter(function (m) { return p.replies[m]; }).length;
      var going = p.members.filter(function (m) {
        return p.replies[m] && p.replies[m].reply === "Accepts";
      }).length;
      p.state = answered === 0 ? "wait" : (going > 0 ? "yes" : "no");
      p.going = going;
      p.answered = answered;
      return p;
    });
  }

  function paint() {
    var list = parties();
    var invited = 0, going = 0, not = 0, waiting = 0;
    list.forEach(function (p) {
      invited += p.members.length;
      p.members.forEach(function (m) {
        var r = p.replies[m];
        if (!r) { waiting++; return; }
        if (r.reply === "Accepts") going++; else not++;
      });
    });
    $("t-going").textContent = going;
    $("t-not").textContent = not;
    $("t-wait").textContent = waiting;
    $("t-invited").textContent = invited;

    var meals = {};
    (CONFIG.meals || []).forEach(function (m) { meals[m] = 0; });
    state.rsvp.forEach(function (r) {
      if (r.reply === "Accepts" && r.meal) meals[r.meal] = (meals[r.meal] || 0) + 1;
    });
    var top = Math.max(1, Math.max.apply(null, Object.keys(meals).map(function (k) { return meals[k]; })));
    $("meals").innerHTML = Object.keys(meals).map(function (k) {
      return '<div class="meal"><span>' + esc(k) + '</span>' +
        '<span class="track"><span class="fill" style="width:' +
        ((meals[k] / top) * 100).toFixed(1) + '%"></span></span>' +
        '<span class="n">' + meals[k] + '</span></div>';
    }).join("") || '<p class="empty">No dinner choices yet.</p>';

    var days = {};
    state.rsvp.forEach(function (r) {
      var d = String(r.received).slice(0, 10);
      if (d) days[d] = (days[d] || 0) + 1;
    });
    var keys = Object.keys(days).sort();
    var peak = Math.max(1, Math.max.apply(null, keys.map(function (k) { return days[k]; })));
    $("spark").innerHTML = keys.slice(-30).map(function (k) {
      return '<i class="on" style="height:' + ((days[k] / peak) * 100).toFixed(0) +
        '%" title="' + esc(k) + ': ' + days[k] + '"></i>';
    }).join("") || '<p class="empty">No replies yet.</p>';
    $("last-reply").textContent = keys.length
      ? "Latest reply on " + keys[keys.length - 1]
      : "";

    render(list);

    $("upload-count").textContent = state.uploads.length
      ? state.uploads.length + (state.uploads.length === 1 ? " file" : " files")
      : "";
    $("files").innerHTML = state.uploads.length
      ? state.uploads.map(function (u) {
          return '<div class="file"><a href="' + esc(u.link) + '" target="_blank" rel="noopener">' +
            esc(u.file) + '</a><span>' + Math.round(u.sizeKb) + ' KB, ' +
            esc(String(u.received).slice(0, 10)) + '</span></div>';
        }).join("")
      : '<p class="empty">Nothing sent by guests yet.</p>';

    var msgs = state.rsvp.filter(function (r) { return r.song || r.note; });
    var seen = {};
    $("msgs").innerHTML = msgs.filter(function (r) {
      if (seen[r.party]) return false;
      seen[r.party] = true;
      return true;
    }).map(function (r) {
      return '<div class="msg"><b>' + esc(r.party) + '</b>' +
        (r.song ? '<span>Song: ' + esc(r.song) + '</span>' : '') +
        (r.note ? '<div>' + esc(r.note) + '</div>' : '') + '</div>';
    }).join("") || '<p class="empty">No notes yet.</p>';
  }

  function render(list) {
    var term = $("find").value.toLowerCase().trim();
    var filt = $("filt").value;
    var shown = list.filter(function (p) {
      if (filt !== "all" && p.state !== filt) return false;
      if (!term) return true;
      if (p.party.toLowerCase().indexOf(term) !== -1) return true;
      return p.members.some(function (m) { return m.toLowerCase().indexOf(term) !== -1; });
    });
    var label = { yes: "Attending", no: "Cannot come", wait: "No reply yet" };
    $("rows").innerHTML = shown.map(function (p) {
      return '<div class="party"><div class="party-head"><b>' + esc(p.party) + '</b>' +
        '<span class="pill ' + p.state + '">' + label[p.state] + '</span></div>' +
        '<div class="people">' + p.members.map(function (m) {
          var r = p.replies[m];
          var right = !r ? "waiting" : (r.reply === "Accepts" ? (r.meal || "attending") : "declined");
          return '<div class="person"><em>' + esc(m) + '</em><span>' + esc(right) + '</span></div>';
        }).join("") + '</div></div>';
    }).join("") || '<p class="empty">Nothing matches that.</p>';
    $("count-line").textContent = shown.length + " of " + list.length + " parties shown";
  }

  function csv() {
    var rows = [["Party", "Guest", "Reply", "Dinner", "Song", "Note"]];
    parties().forEach(function (p) {
      p.members.forEach(function (m) {
        var r = p.replies[m];
        rows.push([p.party, m, r ? r.reply : "No reply", r ? r.meal : "",
                   r ? r.song : "", r ? r.note : ""]);
      });
    });
    var text = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c || "").replace(/"/g, '""') + '"'; }).join(",");
    }).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv" }));
    a.download = "guest-list.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function load(cfg, quiet) {
    var s = $("gate-status");
    if (!quiet) { s.textContent = "Opening"; s.className = "status"; }
    var url = cfg.endpoint + (cfg.endpoint.indexOf("?") === -1 ? "?" : "&") +
      "what=data&key=" + encodeURIComponent(cfg.key);
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (out) {
        if (!out.ok) throw new Error(out.error || "Refused");
        state.rsvp = out.rsvp || [];
        state.uploads = out.uploads || [];
        remember(cfg);
        $("gate").hidden = true;
        $("board").hidden = false;
        $("forget").hidden = false;
        paint();
      })
      .catch(function (err) {
        $("gate").hidden = false;
        $("board").hidden = true;
        s.textContent = String(err.message || err) === "Wrong key"
          ? "That key does not match the one in the script."
          : "Could not reach the web app. Check the address, and make sure the deployment is set to Anyone.";
        s.className = "status bad";
      });
  }

  $("connect").addEventListener("click", function () {
    var cfg = { endpoint: $("endpoint").value.trim(), key: $("key").value };
    if (!cfg.endpoint) {
      $("gate-status").textContent = "Paste the web app address first.";
      $("gate-status").className = "status bad";
      return;
    }
    load(cfg);
  });
  $("refresh").addEventListener("click", function () {
    var cfg = saved();
    if (cfg) load(cfg, true);
  });
  $("forget").addEventListener("click", function () {
    try { localStorage.removeItem(STORE); } catch (e) {}
    location.reload();
  });
  $("find").addEventListener("input", function () { render(parties()); });
  $("filt").addEventListener("change", function () { render(parties()); });
  $("csv").addEventListener("click", csv);

  var start = saved();
  if (start) {
    $("endpoint").value = start.endpoint;
    $("key").value = start.key;
    $("forget").hidden = false;
    load(start, true);
  } else if (CONFIG.endpoint) {
    $("endpoint").value = CONFIG.endpoint;
  }
})();
