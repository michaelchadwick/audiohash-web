/**
 * AudioHash - combine sounds for one sound sampler platter **
 */

ENV_PROD_URL = 'https://audiohash.neb.host'

var btnNav = document.getElementById('button-nav')
var navOverlay = document.getElementById('nav-overlay')
var btnNavClose = document.getElementById('button-nav-close')
var navContent = document.getElementById('nav-content')

var btnHelp = document.getElementById('button-help')
var btnSettings = document.getElementById('button-settings')

// var optionsChoices = document.getElementById('options-main')

var lblSPCount = document.getElementById('lblSoundPlayersCount')
var lblSPCountMax = document.getElementById('lblSoundPlayersCountMax')

var btnCreateSP = document.getElementById('btnCreateSP')
var btnCreateAH = document.getElementById('btnCreateAH')

// var sampleSizeVal = document.getElementById('rngSampleSize')
// var sampleSizeTxt = document.getElementById('txtSampleSize')

// sampleSizeTxt.value = sampleSizeVal.value

/**
 * JS Worker
 */



// modal methods
async function modalOpen(type) {
  console.log('opening a modal')

  require(['app/modal'],
    (Modal) => {
      switch(type) {
        case 'help':
          this.myModal = new Modal('perm', 'How to use Audio Hash',
            `
              <p>Mix multiple sounds into one.</p>

              <ol class="help">
                <li>Create some SoundPlayers</li?
                <li>Load up files</li>
                <li>Choose how much of each you want sampled</li>
                <li>Click "Hash it!" and a link to your new sampler will be created for you to download.</li>
              </ol>
            `,
            null,
            null
          )
          break

        case 'settings':
          this.myModal = new Modal('perm', 'Settings',
            `
              <div id="settings">
                <div class="setting-row">
                  <div class="text">
                    <div class="title">Dump hex on make?</div>
                    <div class="description">Dump the raw hex of the hash when it is created</div>
                  </div>
                  <div class="control">
                    <div class="container">
                      <div id="button-setting-dump-hex" data-status="" class="switch" onclick="changeSetting('dumpHex')">
                        <span class="knob"></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="text">
                    <div class="title">Play hash on make?</div>
                    <div class="description">Play audio hash when created</div>
                  </div>
                  <div class="control">
                    <div class="container">
                      <div id="button-setting-mix-demo" data-status="" class="switch" onclick="changeSetting('mixDemo')">
                        <span class="knob"></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="text">
                    <div class="title">Play mix rate</div>
                    <div class="description">???</div>
                  </div>
                  <div class="control">
                    <div class="container">
                      <div id="button-setting-mix-rate" data-status="" class="number" onchange="changeSetting('mixRate')">
                        <input id="numPlaybackPerc" type="number" min="1" max="500" value="100" pattern="[0-9]+">
                      </div>
                    </div>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="text">
                    <div class="title">Sample size</div>
                    <div class="description">???</div>
                  </div>
                  <div class="control">
                    <div class="container">
                      <div id="button-setting-sample-size" data-status="" class="range" onchange="changeSetting('sampleSize')">
                        <input id="rngSampleSize" type="range" min="1" max="30" value="5">
                        <input id="txtSampleSize" type="text">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `,
            null,
            null
          )


          loadGlobalSettings()

          break
      }
    }
  )
}

// create web worker
function initWebWorker() {
  if (window.Worker) {
    var myWorker = new Worker('./assets/js/app/worker.js')

    myWorker.onmessage = function(e) {
      console.log('Message received from worker', e.data)

      var workerCommand = e.data.command

      switch (workerCommand) {
      case 'hexDump':
        document.getElementById('hex-dump-contents').innerHTML = e.data.ascii
        break
      }
    }
  }
}

function changeSetting(setting, value) {
  console.log('TODO: change setting', setting, value)
}

function loadGlobalSettings() {
  console.log('TODO: load global settings')
}

// create dom event listeners
function initEventListeners() {
  // event listeners
  btnNav.addEventListener('click', () => {
    navOverlay.classList.toggle('show')
  })
  btnNavClose.addEventListener('click', () => {
    navOverlay.classList.toggle('show')
  })

  btnHelp.addEventListener('click', () => {
    modalOpen('help')
  })
  btnSettings.addEventListener('click', () => {
    modalOpen('settings')
  })

  btnCreateSP.addEventListener('click', () => {
    if (AudioHash.getSPArrayLength() < AudioHash.getSPCountMax()) {
      AudioHash.createSP()
    } else {
      alert(constants.AH_ERROR_SP_COUNT_MAX_REACHED)
    }
  })
  btnCreateAH.addEventListener('click', () => {
    if (AudioHash.getSPArrayLength() < 2) {
      alert(constants.AH_ERROR_SP_COUNT_MIN_NOT_MET)
    }
    else if (AudioHash.areSPBuffersEmpty()) {
      alert(constants.AH_ERROR_SP_INCOMPLETE)
    }
    else {
      AudioHash.createAH(AudioHash.getSPArray())
    }
  })

  // When the user clicks or touches anywhere outside of the modal, close it
  window.addEventListener('click', handleClickTouch)
  window.addEventListener('touchend', handleClickTouch)

  // sampleSizeVal.addEventListener('change', () => {
  //   sampleSizeTxt.value = e.srcElement.value
  // })
}

// handle both clicks and touches outside of modals
function handleClickTouch(event) {

  var dialog = document.getElementsByClassName('modal-dialog')[0]

  if (dialog) {
    var isConfirm = dialog.classList.contains('modal-confirm')

    // only close if not a confirmation!
    if (event.target == dialog && !isConfirm) {
      dialog.remove()
    }
  }

  if (event.target == this.navOverlay) {
    this.navOverlay.classList.toggle('show')
  }
}

// engine
function init() {
  console.log('initializing page UI...')

  // set env
  this.env = document.location.hostname == this.ENV_PROD_URL ? 'prod' : 'local'

  require([
    'app/constants',
    'app/audiohash'
  ],
  (constants, AudioHash) => {
    // set <title>
    document.title = `${constants.AH_APP_TITLE || 'AH'} | ${constants.AH_APP_TAGLINE || 'audio hash'}`

    // adjust <title>
    if (this.env == 'local') {
      document.title = '(LH) ' + document.title
    }

    // update DOM status elements
    lblSPCount.innerText = AudioHash.getSPNextId()
    lblSPCountMax.innerText = AudioHash.getSPCountMax()

    // attach event listeners to DOM elements
    initEventListeners()

    initWebWorker()
  })
}

/*************************************************/

// start the engine
this.init()

// create some sample soundplayers
require([
  'app/constants',
  'app/audiohash'
],
(constants, AudioHash) => {
  AudioHash.createSP(constants.AH_INIT_SP_COUNT)
})
