/* dom */
/* grab references to dom elements */
/* global AudioHash */

// DOM > main divs/elements
AudioHash.dom = {
  "navOverlay": document.getElementById('nav-overlay'),
  "navContent": document.getElementById('nav-content'),
  "lblSPCount": document.getElementById('lblSoundPlayersCount'),
  "lblSPCountMax": document.getElementById('lblSoundPlayersCountMax'),
  "hexDump": document.getElementById('hex-dump'),
  "hexDumpContents": document.getElementById('hex-dump-contents')
}

// DOM > interactive elements
AudioHash.dom.interactive = {
  "btnNav": document.getElementById('button-nav'),
  "btnNavClose": document.getElementById('button-nav-close'),
  "btnHelp": document.getElementById('button-help'),
  "btnSettings": document.getElementById('button-settings'),
  "btnCreateSP": document.getElementById('button-create-sp'),
  "btnCreateAH": document.getElementById('button-create-ah')
}
