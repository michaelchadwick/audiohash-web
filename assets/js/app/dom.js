/* dom */
/* grab references to dom elements */
/* global define */

define(() => {
  return {
    // DOM > main divs/elements
    "navOverlay": document.getElementById('nav-overlay'),
    "navContent": document.getElementById('nav-content'),
    "lblSPCount": document.getElementById('lblSoundPlayersCount'),
    "lblSPCountMax": document.getElementById('lblSoundPlayersCountMax'),

    // DOM > interactive elements
    "interactive": {
      "btnNav": document.getElementById('button-nav'),
      "btnNavClose": document.getElementById('button-nav-close'),
      "btnHelp": document.getElementById('button-help'),
      "btnSettings": document.getElementById('button-settings'),
      "btnCreateSP": document.getElementById('button-create-sp'),
      "btnCreateAH": document.getElementById('button-create-ah')
    }
  }
})
