/**
 * AudioHash - combine sounds for one sound sampler platter **
 */

/* global require */

// help-square
var helpLink = document.getElementById('help-link')
var helpSquare = document.getElementById('help-square')
helpLink.addEventListener('click', function(e) {
  e.preventDefault()
  if (helpSquare.style.display !== 'block') {
    helpSquare.style.display = 'block'
  } else {
    helpSquare.style.display = 'none'
  }
})

/**
 * JS Worker
 */

if (window.Worker) {
  var myWorker = new Worker('/assets/js/app/worker.js')

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

/**
 * Set up the initial web application user interface
 */

function initPageUI() {
  require(['app/constants', 'app/AudioHash'], function (constants, AudioHash) {
    document.title = `${constants.AH_APP_TITLE || 'AH'} | ${constants.AH_APP_TAGLINE || 'audio hash'}`

    var optionsLink = document.getElementById('options-link')
    var optionsChoices = document.getElementById('options-main')
    var lblSPCount = document.getElementById('lblSoundPlayersCount')
    var lblSPCountMax = document.getElementById('lblSoundPlayersCountMax')
    var btnCreateSP = document.getElementById('btnCreateSP')
    var btnCreateAH = document.getElementById('btnCreateAH')
    var sampleSizeVal = document.getElementById('rngSampleSize')
    var sampleSizeTxt = document.getElementById('txtSampleSize')

    lblSPCount.innerText = AudioHash.getSPNextId()
    lblSPCountMax.innerText = AudioHash.getSPCountMax()
    sampleSizeTxt.value = sampleSizeVal.value

    // event listeners
    optionsLink.addEventListener('click', function() {
      var disp = optionsChoices.style.display
      optionsChoices.style.display = (disp === 'none' || disp === '') ? 'block' : 'none'
    })
    btnCreateSP.addEventListener('click', function() {
      if (AudioHash.getSPArrayLength() < AudioHash.getSPCountMax()) {
        AudioHash.createSP()
      } else {
        alert(constants.AH_ERROR_SP_COUNT_MAX_REACHED)
      }
    })
    btnCreateAH.addEventListener('click', function() {
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
    sampleSizeVal.addEventListener('change', function(e) {
      sampleSizeTxt.value = e.srcElement.value
    })
  })
}

/**
 * Basic Window Init
 */
window.onload = function() {
  // create page UI
  initPageUI()

  // create initial number of SPs
  require(['app/constants', 'app/AudioHash'], function (constants, AudioHash) {
    AudioHash.createSP(constants.AH_INIT_SP_COUNT)
  })
}
