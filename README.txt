Porcelain Wedding Website Template

TWO PAGES

  index.html      the invitation the guests see
  dashboard.html  a private page for the couple, not linked from the site

THE LAYOUT

  Full height sections with dot navigation on the right and a progress line at the top.

  Sections: Invitation, our story, the day, details with travel, reply, album, questions.

WHAT IS IN THIS FOLDER

  index.html                  the page markup, nothing else
  dashboard.html              the private guest list page
  assets/css/fonts.css        loads the typefaces from the fonts folder
  assets/css/style.css        every style rule for the invitation
  assets/css/dashboard.css    every style rule for the dashboard
  assets/js/config.js         names, date, venue, schedule, travel, guest list, album
  assets/js/site.js           guest search, RSVP form, album viewer, upload, motion
  assets/js/dashboard.js      counts, filters, CSV export
  assets/fonts/               great-vibes.woff2, manrope.woff2, playfair-display-italic.woff2, playfair-display.woff2
  assets/img/photos/          empty, this is where your photographs go
  assets/img/
      illustration.svg       the drawing inside the story panel
      paper-grain.svg        the paper texture behind the whole page
      plate-ring-2.svg       the floral ring around the story panel
      plate-ring.svg         the floral ring around the invitation
      veil.svg               artwork
      vine-band.svg          the vine across the top of the page
      wash-hero.svg          the colour wash inside the invitation panel
      wash-story.svg         the colour wash inside the story panel
  backend/Code.gs             the Google Apps Script that receives replies
  backend/appsscript.json     the Apps Script manifest

WHAT TO EDIT

  Everything a couple normally changes lives in assets/js/config.js.
  Open it in any text editor and change the names, the date, the venue,
  the schedule rows, the notes, the travel cards, the questions and the
  guest list. Nothing else needs touching for a standard setup.

  To change colours on the invitation, open assets/css/style.css and edit
  the values at the very top, inside the block that begins with :root.
  The dashboard has its own :root block at the top of dashboard.css.

THE DASHBOARD

  If the site lives at example.com, the dashboard lives at
  example.com/dashboard.html. It is not linked from the invitation, so no
  guest will stumble onto it.

  It shows how many are attending, how many cannot come, how many have not
  replied, and the total invited. A dinner count for the caterer. A chart
  of replies by day. Every party with who answered and what they chose. A
  search box, a filter for the ones who have gone quiet, and a button that
  exports the whole guest list as a CSV. Photos that guests uploaded appear
  as links, and every song request and note is collected in one place.

  It asks once for the web app address and the dashboard key, then keeps
  them on that device. There is a Forget this device button for a shared
  computer.

  The key is the phrase set in dashboardKey inside backend/Code.gs. Change
  it before deploying. It is a light guard, right for a guest list, so pick
  a long phrase and do not put anything in the sheet you would not want
  seen by someone who guessed it.

THE ALBUM

  Drop photographs into assets/img/photos, then list them in the gallery
  array in config.js. The note inside that folder shows the exact format.
  Photographs open in a full screen viewer with arrows and the escape key.
  While the array is empty the album shows labelled frames so the page
  still looks finished.

CONNECTING THE RSVP

  While the endpoint field in config.js is empty the site runs in preview
  mode. The guest search and the upload queue work, but nothing is stored.

  To go live, follow the Deployment Guide. Both files in the backend folder
  are needed. Code.gs holds the logic. appsscript.json sets the permissions
  and publishes the script so that guests without a Google account can
  still reply. The Apps Script editor hides appsscript.json until you open
  Project Settings and tick Show appsscript.json manifest file in editor.

  The manifest is set to the Asia/Manila time zone. Change that line if the
  couple is somewhere else.

REQUIREMENTS

  None. Open index.html in any browser and the site works. There is no
  build step, no framework and no external service. The typefaces are
  inside the folder, so the site looks correct without an internet
  connection.

LICENCE

  The typefaces are released under the SIL Open Font License and may be
  used in commercial work, including work you sell. Their licence files
  are in the Font Licences folder beside this template.
