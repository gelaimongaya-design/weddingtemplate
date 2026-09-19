(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var norm = function (s) {
    return String(s || "").toLowerCase().normalize("NFD")
      .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ").trim();
  };
  var set = function (id, val, html) {
    var el = $(id);
    if (!el) return;
    if (html) el.innerHTML = val; else el.textContent = val;
  };
  var on = function (id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); };

  document.title = CONFIG.nameA + " and " + CONFIG.nameB;
  set("name-a", CONFIG.nameA);
  set("name-b", CONFIG.nameB);
  set("hero-date", CONFIG.dateLabel);
  set("hero-venue", CONFIG.venueShort);
  set("hero-time", CONFIG.timeLabel);
  set("brand", CONFIG.monogram);
  set("foot-names", CONFIG.nameA + " and " + CONFIG.nameB);
  set("foot-line", CONFIG.footerLine, true);
  set("contact", CONFIG.contactLine);
  set("deadline", CONFIG.rsvpDeadline);

  var target = new Date(CONFIG.dateISO);
  var days = Math.ceil((target - new Date()) / 86400000);
  set("countdown", days > 1 ? days + " days" : days === 1 ? "Tomorrow" : days === 0 ? "Today" : "");

  if ($("facts")) {
    $("facts").innerHTML = CONFIG.facts.map(function (f) {
      return '<div class="fact"><span>' + esc(f.label) + '</span><b>' + esc(f.value) + '</b></div>';
    }).join("");
  }
  if ($("schedule")) {
    $("schedule").innerHTML = CONFIG.schedule.map(function (s) {
      return '<div class="slot"><span class="slot-time">' + esc(s.time) + '</span>' +
        '<span class="slot-what">' + esc(s.what) + '</span></div>';
    }).join("");
  }
  if ($("notes")) {
    $("notes").innerHTML = CONFIG.notes.map(function (n) {
      return '<div class="note"><h3>' + esc(n.title) + '</h3><p>' + esc(n.body) + '</p></div>';
    }).join("");
  }

  var store = {
    send: function (payload) {
      if (!CONFIG.endpoint) {
        return new Promise(function (r) { setTimeout(function () { r({ ok: true, preview: true }); }, 420); });
      }
      return fetch(CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      });
    }
  };

  var party = null;

  function matches(term) {
    var n = norm(term);
    if (n.length < 2) return [];
    return CONFIG.guests.filter(function (g) {
      return norm(g.party).indexOf(n) !== -1 ||
        g.members.some(function (m) { return norm(m).indexOf(n) !== -1; });
    }).slice(0, 8);
  }

  function showHits(list, term) {
    var hits = $("hits"), status = $("search-status");
    if (!hits) return;
    if (!term || norm(term).length < 2) {
      hits.innerHTML = "";
      if (status) { status.textContent = ""; status.className = "status"; }
      return;
    }
    if (!list.length) {
      hits.innerHTML = "";
      if (status) {
        status.textContent = "No invitation under that name. Try a surname.";
        status.className = "status bad";
      }
      return;
    }
    if (status) { status.textContent = ""; status.className = "status"; }
    hits.innerHTML = list.map(function (g) {
      return '<button type="button" class="hit" data-id="' + esc(g.id) + '">' +
        '<b>' + esc(g.party) + '</b><small>' + esc(g.members.join(", ")) + '</small></button>';
    }).join("");
  }

  function openParty(g) {
    party = g;
    set("party-label", g.party);
    $("guest-list").innerHTML = g.members.map(function (m, i) {
      return '<div class="guest"><div class="guest-name">' + esc(m) + '</div>' +
        '<div class="opts">' +
        '<label class="opt"><input type="radio" name="att' + i + '" value="yes" checked><span>Joyfully accepts</span></label>' +
        '<label class="opt"><input type="radio" name="att' + i + '" value="no"><span>Respectfully declines</span></label>' +
        '</div>' +
        '<div class="meal-wrap" data-meal="' + i + '">' +
        '<label class="lbl" for="meal' + i + '">Dinner</label>' +
        '<select id="meal' + i + '">' + CONFIG.meals.map(function (x) {
          return '<option>' + esc(x) + '</option>';
        }).join("") + '</select></div></div>';
    }).join("");

    g.members.forEach(function (m, i) {
      Array.prototype.forEach.call(document.getElementsByName("att" + i), function (r) {
        r.addEventListener("change", function () {
          var wrap = document.querySelector('[data-meal="' + i + '"]');
          if (wrap) wrap.hidden = document.querySelector('input[name="att' + i + '"]:checked').value === "no";
        });
      });
    });

    $("step-search").hidden = true;
    $("step-reply").hidden = false;
    $("step-done").hidden = true;
  }

  function resetToSearch() {
    party = null;
    if ($("step-reply")) $("step-reply").hidden = true;
    if ($("step-done")) $("step-done").hidden = true;
    if ($("step-search")) $("step-search").hidden = false;
    if ($("q")) { $("q").value = ""; $("q").focus(); }
    if ($("hits")) $("hits").innerHTML = "";
    set("search-status", "");
    set("reply-status", "");
  }

  on("q", "input", function (e) { showHits(matches(e.target.value), e.target.value); });
  on("q", "keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); if ($("find-btn")) $("find-btn").click(); }
  });
  on("find-btn", "click", function () {
    var term = $("q").value, list = matches(term);
    if (list.length === 1) { openParty(list[0]); return; }
    showHits(list, term);
  });
  on("hits", "click", function (e) {
    var b = e.target.closest(".hit");
    if (!b) return;
    var g = CONFIG.guests.filter(function (x) { return x.id === b.dataset.id; })[0];
    if (g) openParty(g);
  });
  on("back-btn", "click", resetToSearch);
  on("another-btn", "click", resetToSearch);

  on("step-reply", "submit", function (e) {
    e.preventDefault();
    if (!party) return;
    var btn = $("send-btn"), status = $("reply-status");
    var people = party.members.map(function (m, i) {
      var going = document.querySelector('input[name="att' + i + '"]:checked').value === "yes";
      return { name: m, attending: going, meal: going ? $("meal" + i).value : "" };
    });
    var payload = {
      kind: "rsvp",
      partyId: party.id,
      party: party.party,
      people: people,
      song: $("song") ? $("song").value.trim() : "",
      note: $("note") ? $("note").value.trim() : "",
      submittedAt: new Date().toISOString()
    };
    if (btn) btn.disabled = true;
    if (status) { status.textContent = "Sending"; status.className = "status"; }

    store.send(payload).then(function (out) {
      var going = people.filter(function (p) { return p.attending; }).length;
      set("done-title", going ? "See you there" : "Thank you for telling us");
      var body = going
        ? going + (going === 1 ? " seat is" : " seats are") + " reserved for " + party.party + "."
        : "We will miss you.";
      if (out && out.preview) body += " This is a preview, so nothing was stored.";
      set("done-body", body);
      $("step-reply").hidden = true;
      $("step-done").hidden = false;
    }).catch(function () {
      if (status) {
        status.textContent = "That did not send. Please try again.";
        status.className = "status bad";
      }
    }).then(function () { if (btn) btn.disabled = false; });
  });

  var queue = [], drop = $("drop"), input = $("file-input");
  if (drop && input) {
    var human = function (b) {
      return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
    };
    var renderQueue = function () {
      $("queue").innerHTML = queue.map(function (f, i) {
        return '<div class="tile">' +
          (f.kind === "video" ? '<video src="' + f.url + '" muted playsinline></video>'
                              : '<img src="' + f.url + '" alt="">') +
          '<span class="tag">' + esc(human(f.size)) + '</span>' +
          '<button class="kill" type="button" data-i="' + i + '" aria-label="Remove">&times;</button></div>';
      }).join("");
      if ($("upload-actions")) $("upload-actions").hidden = queue.length === 0;
    };
    var addFiles = function (files) {
      var skipped = 0;
      Array.prototype.forEach.call(files, function (file) {
        if (queue.length >= CONFIG.maxUploadFiles) { skipped++; return; }
        if (file.size > CONFIG.maxUploadMB * 1048576) { skipped++; return; }
        if (!/^image\/|^video\//.test(file.type)) { skipped++; return; }
        queue.push({
          file: file, url: URL.createObjectURL(file),
          kind: file.type.indexOf("video") === 0 ? "video" : "image", size: file.size
        });
      });
      var st = $("upload-status");
      if (st) {
        st.textContent = skipped ? skipped + " skipped. Photos and video only, under " + CONFIG.maxUploadMB + " MB." : "";
        st.className = skipped ? "status bad" : "status";
      }
      renderQueue();
    };
    drop.addEventListener("click", function () { input.click(); });
    drop.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
    });
    input.addEventListener("change", function (e) { addFiles(e.target.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
    });
    drop.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });
    on("queue", "click", function (e) {
      var b = e.target.closest(".kill");
      if (!b) return;
      var i = parseInt(b.dataset.i, 10);
      URL.revokeObjectURL(queue[i].url);
      queue.splice(i, 1);
      renderQueue();
    });
    on("clear-btn", "click", function () {
      queue.forEach(function (f) { URL.revokeObjectURL(f.url); });
      queue.length = 0;
      set("upload-status", "");
      renderQueue();
    });
    var readB64 = function (file) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(String(r.result).split(",")[1] || ""); };
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    };
    on("upload-btn", "click", function () {
      if (!queue.length) return;
      var btn = $("upload-btn"), st = $("upload-status");
      btn.disabled = true;
      if (!CONFIG.endpoint) {
        st.textContent = "Preview only. On the live site these reach the couple.";
        st.className = "status bad";
        btn.disabled = false;
        return;
      }
      var done = 0;
      var next = function () {
        if (done >= queue.length) {
          queue.forEach(function (f) { URL.revokeObjectURL(f.url); });
          queue.length = 0;
          renderQueue();
          st.textContent = "Sent. Thank you.";
          st.className = "status ok";
          btn.disabled = false;
          return;
        }
        var item = queue[done];
        st.textContent = "Sending " + (done + 1) + " of " + queue.length;
        st.className = "status";
        readB64(item.file).then(function (b64) {
          return fetch(CONFIG.endpoint, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              kind: "upload", filename: item.file.name,
              mimeType: item.file.type, data: b64,
              submittedAt: new Date().toISOString()
            })
          });
        }).then(function (res) {
          if (!res.ok) throw new Error("http");
          done++;
          next();
        }).catch(function () {
          st.textContent = done + " sent before a problem. Please retry the rest.";
          st.className = "status bad";
          btn.disabled = false;
        });
      };
      next();
    });
  }
})();

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var photos = (CONFIG.gallery && CONFIG.gallery.length) ? CONFIG.gallery : [];
  var slots = CONFIG.gallerySlots || 8;

  if ($("gallery")) {
    var html = "";
    if (photos.length) {
      photos.forEach(function (p, i) {
        var src = typeof p === "string" ? p : p.src;
        var cap = typeof p === "string" ? "" : (p.caption || "");
        var wide = typeof p === "object" && p.wide ? " wide" : "";
        html += '<button type="button" class="shot' + wide + '" data-i="' + i + '">' +
          '<img src="' + esc(src) + '" alt="' + esc(cap) + '" loading="lazy"></button>';
      });
    } else {
      for (var s = 0; s < slots; s++) {
        html += '<div class="shot empty"><span>Photo ' + (s + 1) + '</span></div>';
      }
    }
    $("gallery").innerHTML = html;
  }

  var at = 0;
  function show(i) {
    if (!photos.length) return;
    at = (i + photos.length) % photos.length;
    var p = photos[at];
    $("lb-img").src = typeof p === "string" ? p : p.src;
    $("lb-cap").textContent = typeof p === "string" ? "" : (p.caption || "");
    $("lightbox").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function hide() {
    $("lightbox").hidden = true;
    document.body.style.overflow = "";
  }
  if ($("gallery") && $("lightbox")) {
    $("gallery").addEventListener("click", function (e) {
      var b = e.target.closest(".shot");
      if (b && !b.classList.contains("empty")) show(parseInt(b.dataset.i, 10));
    });
    $("lb-close").addEventListener("click", hide);
    $("lb-prev").addEventListener("click", function () { show(at - 1); });
    $("lb-next").addEventListener("click", function () { show(at + 1); });
    $("lightbox").addEventListener("click", function (e) {
      if (e.target === $("lightbox")) hide();
    });
    document.addEventListener("keydown", function (e) {
      if ($("lightbox").hidden) return;
      if (e.key === "Escape") hide();
      if (e.key === "ArrowLeft") show(at - 1);
      if (e.key === "ArrowRight") show(at + 1);
    });
  }

  if ($("travel") && CONFIG.travel) {
    $("travel").innerHTML = CONFIG.travel.map(function (t) {
      return '<div class="trip"><h3>' + esc(t.title) + '</h3><p>' + esc(t.body) + '</p>' +
        (t.meta ? '<span class="meta">' + esc(t.meta) + '</span>' : '') + '</div>';
    }).join("");
  }

  if ($("faq") && CONFIG.faq) {
    $("faq").innerHTML = CONFIG.faq.map(function (f) {
      return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>';
    }).join("");
  }

  if ($("party-list") && CONFIG.weddingParty) {
    $("party-list").innerHTML = CONFIG.weddingParty.map(function (w) {
      return '<div class="who"><span class="role">' + esc(w.role) + '</span>' +
        '<span class="name">' + esc(w.name) + '</span></div>';
    }).join("");
  }

  if ($("registry") && CONFIG.registry) {
    $("registry").innerHTML = '<p>' + esc(CONFIG.registry.note) + '</p><div class="links">' +
      (CONFIG.registry.links || []).map(function (l) {
        return '<a class="btn ghost" href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
          esc(l.label) + '</a>';
      }).join("") + '</div>';
  }
})();

(function () {
  var cover = document.getElementById("cover");
  if (!cover) return;
  document.body.classList.add("sealed");
  var mark = document.getElementById("cover-mark");
  if (mark) mark.textContent = CONFIG.nameA.charAt(0) + CONFIG.nameB.charAt(0).toLowerCase();
  var to = document.getElementById("cover-names");
  if (to) to.textContent = CONFIG.nameA + " and " + CONFIG.nameB;
  function open() {
    cover.classList.add("gone");
    document.body.classList.remove("sealed");
    setTimeout(function () { cover.setAttribute("hidden", ""); }, 900);
  }
  cover.addEventListener("click", open);
  cover.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  setTimeout(open, 9000);
})();

(function () {
  var els = document.querySelectorAll(".veil");
  var showAll = function () {
    Array.prototype.forEach.call(els, function (el) { el.classList.add("seen"); });
  };
  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    showAll();
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  setTimeout(showAll, 3500);
})();
(function () {
  var s = document.getElementById("seal-mark");
  if (s) s.textContent = CONFIG.nameA.charAt(0) + CONFIG.nameB.charAt(0).toLowerCase();
})();
