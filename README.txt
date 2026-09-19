Velvet Wedding Website Template

WHAT IS IN THIS FOLDER

  index.html                  the page markup, nothing else
  assets/css/fonts.css        loads the typefaces from the fonts folder
  assets/css/style.css        every style rule for the page
  assets/js/config.js         names, date, venue, schedule, notes, guest list
  assets/js/site.js           guest search, RSVP form, photo upload, motion
  assets/fonts/               cinzel.woff2, jost.woff2, tangerine.woff2
  assets/img/
      corner-bl.svg          corner artwork, bottom left
      corner-br.svg          corner artwork, bottom right
      corner-tl.svg          corner artwork, top left
      corner-tr.svg          corner artwork, top right
      deco-frame-2.svg       the stepped frame on the story panel
      deco-frame.svg         the stepped frame on the invitation panel
      divider.svg            the small ornament between sections
      illustration.svg       the drawing inside the story panel
      paper-grain.svg        the paper texture behind the whole page
      sunburst.svg           the rays behind the names
      wash-hero.svg          the colour wash inside the invitation panel
  backend/Code.gs             the Google Apps Script that receives replies
  backend/appsscript.json     the Apps Script manifest

WHAT TO EDIT

  Everything a couple normally changes lives in assets/js/config.js.
  Open it in any text editor and change the names, the date, the venue,
  the schedule rows, the notes and the guest list. Nothing else needs
  touching for a standard setup.

  To change colours, open assets/css/style.css and edit the values at the
  very top, inside the block that begins with :root. Every colour on the
  page is taken from there, so one edit changes the whole site.

  To swap the panel artwork for a real photograph, replace
  assets/img/wash-hero.svg or assets/img/wash-story.svg with your own
  image and update the file name in index.html.

CONNECTING THE RSVP

  While the endpoint field in config.js is left empty, the site runs in
  preview mode. The guest search and the upload queue work, but nothing
  is stored.

  To go live, follow the Deployment Guide. Both files in the backend
  folder are needed. Code.gs holds the logic. appsscript.json sets the
  permissions the script asks for and publishes it so that guests without
  a Google account can still send a reply. The Apps Script editor hides
  appsscript.json until you open Project Settings and tick the box marked
  Show appsscript.json manifest file in editor.

  The manifest is set to the Asia/Manila time zone. Change that line if
  the couple is somewhere else, because it decides how dates and uploaded
  file names are stamped.

  Once deployed, paste the web app address into the endpoint field in
  config.js. Replies then land in a Google Sheet and uploaded photos land
  in a Google Drive folder.

REQUIREMENTS

  None. Open index.html in any browser and the site works. There is no
  build step, no framework and no external service. The typefaces are
  inside the folder, so the site looks correct without an internet
  connection.

LICENCE

  The typefaces are released under the SIL Open Font License and may be
  used in commercial work, including work you sell. Their licence files
  are in the Font Licences folder beside this template.
