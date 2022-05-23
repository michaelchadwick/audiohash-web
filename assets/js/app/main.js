/**
 * AudioHash - combine sounds for one sound sampler platter **
 */

// AudioHash object init
if ((typeof AudioHash) === 'undefined') var AudioHash = {}

AudioHash.settings = {
  "dumpHex": false,
  "mixDemo": false,
  "mixRate": 100,
  "sampleSize": 5
}

AudioHash.state = {
  "_soundPlayerNextId": 0, // used to give each SP a unique ID
  "_soundPlayerCountMax": 10, // arbitrary, may change or go away
  "_soundPlayerArray": [], // holds all the existing SPs
  "_audioContext": function() {
    if ( !window.AudioContext && !window.webkitAudioContext ) {
      return console.warn(constants.AH_ERROR_NO_WEB_AUDIO)
    } else {
      return new ( window.AudioContext || window.webkitAudioContext )()
    }
  }
}

/* ******************************** *
 * public methods                   *
 * ******************************** */

async function modalOpen(type) {
  require(['app/modal'],
    (Modal) => {
      switch(type) {
        case 'help':
          this.myModal = new Modal('perm', 'How to use Audio Hash',
            `
              <p>Mix multiple sounds into one.</p>

              <ol class="help">
                <li>Create some SoundPlayers</li>
                <li>Load up files</li>
                <li>Choose how much of each you want sampled</li>
                <li>Click/tap '#' and a link to your new sampler will be created for you to download</li>
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

                <!-- dumpHex -->
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

                <!-- mixDemo -->
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

                <!-- mixRate -->
                <div class="setting-row">
                  <div class="text">
                    <div class="title">Play mix rate</div>
                    <div class="description">???</div>
                  </div>
                  <div class="control">
                    <div class="container">
                      <input id="input-setting-mix-rate" type="number" min="1" max="500" value="100" pattern="[0-9]+" onchange="changeSetting('mixRate')">
                    </div>
                  </div>
                </div>

                <!-- sampleSize -->
                <div class="setting-row">
                  <div class="text">
                    <div class="title">Sample size</div>
                    <div class="description">???</div>
                  </div>
                  <div class="control">
                    <div class="container">
                      <input id="range-setting-sample-size" type="range" min="1" max="30" value="5" onchange="changeSetting('sampleSize', event)">
                      <label id="text-setting-sample-size" for="range-setting-sample-size">5</label>
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

function initApp() {
  require(['app/constants', 'app/dom'], (constants, dom) => {
    // set env
    AudioHash.env = constants.ENV_PROD_URL.includes(document.location.hostname) ? 'prod' : 'local'

    // set <title>
    document.title = `${constants.AH_APP_TITLE || 'AH'} | ${constants.AH_APP_TAGLINE || 'audio hash'}`

    // adjust <title> for env
    if (AudioHash.env == 'local') {
      document.title = '(LH) ' + document.title
    }

    // update DOM status elements
    dom.lblSPCount.innerText = getSPNextId()
    dom.lblSPCountMax.innerText = getSPCountMax()

    // attach event listeners to DOM elements
    attachEventListeners()

    initWebWorker()

    // create some sample soundplayers
    createSP(constants.AH_INIT_SP_COUNT)

    // load localStorage settings
    loadGlobalSettings()

    saveGlobalSettings()
  })
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

function loadGlobalSettings() {
  require(['app/constants'], (constants) => {
    if (localStorage.getItem(constants.LS_SETTINGS_KEY)) {
      var lsConfig = JSON.parse(localStorage.getItem(constants.LS_SETTINGS_KEY))

      if (lsConfig) {
        if (lsConfig.dumpHex) {
          AudioHash.settings.dumpHex = lsConfig.dumpHex

          var setting = document.getElementById('button-setting-dump-hex')

          if (setting) {
            setting.dataset.status = 'true'
          }
        }

        if (lsConfig.mixDemo) {
          AudioHash.settings.mixDemo = lsConfig.mixDemo

          var setting = document.getElementById('button-setting-mix-demo')

          if (setting) {
            setting.dataset.status = 'true'
          }
        }

        if (lsConfig.mixRate) {
          AudioHash.settings.mixRate = parseInt(lsConfig.mixRate)

          var setting = document.getElementById('input-setting-mix-rate')

          if (setting) {
            setting.value = AudioHash.settings.mixRate
          }
        }

        if (lsConfig.sampleSize) {
          AudioHash.settings.sampleSize = parseInt(lsConfig.sampleSize)

          var setting_range = document.getElementById('range-setting-sample-size')
          var setting_text = document.getElementById('text-setting-sample-size')

          if (setting_range) {
            setting_range.value = AudioHash.settings.sampleSize
          }
          if (setting_text) {
            setting_text.innerText = AudioHash.settings.sampleSize
          }
        }
      }
    }
  })
}
function saveGlobalSettings() {
  require(['app/constants'], (constants) => {
    try {
      localStorage.setItem(constants.LS_SETTINGS_KEY, JSON.stringify(AudioHash.settings))

      // console.log('!localStorage global settings saved!', JSON.parse(localStorage.getItem(constants.LS_SETTINGS_KEY)))
    } catch(error) {
      console.error('localStorage global settings save failed', error)
    }
  })
}
function changeSetting(setting, event = null) {
  switch (setting) {
    case 'dumpHex':
      var st = document.getElementById('button-setting-dump-hex').dataset.status

      if (st == '' || st == 'false') {
        // update setting DOM
        document.getElementById('button-setting-dump-hex').dataset.status = 'true'

        // save to code/LS
        saveSetting('dumpHex', true)
      } else {
        // update setting DOM
        document.getElementById('button-setting-dump-hex').dataset.status = 'false'

        // save to code/LS
        saveSetting('dumpHex', false)
      }
      break

    case 'mixDemo':
      var st = document.getElementById('button-setting-mix-demo').dataset.status

      if (st == '' || st == 'false') {
        document.getElementById('button-setting-mix-demo').dataset.status = 'true'

        saveSetting('mixDemo', true)
      } else {
        document.getElementById('button-setting-mix-demo').dataset.status = 'false'

        saveSetting('mixDemo', false)
      }
      break

    case 'mixRate':
      var st = document.getElementById('input-setting-mix-rate').value

      if (st !== '') {
        saveSetting('mixRate', parseInt(st))
      }

      break

    case 'sampleSize':
      var st = document.getElementById('range-setting-sample-size').value

      if (st !== '') {
        document.getElementById('text-setting-sample-size').innerText = st

        saveSetting('sampleSize', parseInt(st))
      }

      break
  }
}
function saveSetting(setting, value) {
  console.log('saving setting to code/LS...', setting, value)

  require(['app/constants'], (constants) => {
    var settings = JSON.parse(localStorage.getItem(constants.LS_SETTINGS_KEY))

    if (settings) {
      // set internal code model
      AudioHash.settings[setting] = value

      // set temp obj that will go to LS
      settings[setting] = value

      // save all settings to LS
      localStorage.setItem(constants.LS_SETTINGS_KEY, JSON.stringify(settings))
    }
  })

  console.log('!setting saved!', AudioHash.settings)
}

function attachEventListeners() {
  require(['app/dom'], (dom) => {
    // event listeners
    dom.interactive.btnNav.addEventListener('click', () => {
      dom.navOverlay.classList.toggle('show')
    })
    dom.interactive.btnNavClose.addEventListener('click', () => {
      dom.navOverlay.classList.toggle('show')
    })

    dom.interactive.btnHelp.addEventListener('click', () => {
      modalOpen('help')
    })
    dom.interactive.btnSettings.addEventListener('click', () => {
      modalOpen('settings')
    })

    dom.interactive.btnCreateSP.addEventListener('click', () => {
      if (getSPArrayLength() < getSPCountMax()) {
        createSP()
      } else {
        require(['app/constants'], (constants) => alert(constants.AH_ERROR_SP_COUNT_MAX_REACHED))
      }
    })
    dom.interactive.btnCreateAH.addEventListener('click', () => {
      if (getSPArrayLength() < 2) {
        require(['app/constants'], (constants) => alert(constants.AH_ERROR_SP_COUNT_MIN_NOT_MET))
      }
      else if (areSPBuffersEmpty()) {
        require(['app/constants'], (constants) => alert(constants.AH_ERROR_SP_INCOMPLETE))
      }
      else {
        createAudioHash(getSPArray())
      }
    })
  })

  // When the user clicks or touches anywhere outside of the modal, close it
  window.addEventListener('click', handleClickTouch)
  window.addEventListener('touchend', handleClickTouch)
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

function areSPBuffersEmpty() {
  var empty = false

  this.getSPArray().forEach(function(sound) {
    if (!sound.audioBuffer) {
      empty = true
    }
  })

  return empty
}

function getSPNextId() { return AudioHash.state._soundPlayerNextId }
function incSPNextId() { AudioHash.state._soundPlayerNextId += 1 }
function getSPArray() { return AudioHash.state._soundPlayerArray }
function getSPArrayLength() { return AudioHash.state._soundPlayerArray.length }
function getSPCountMax() { return AudioHash.state._soundPlayerCountMax }
function listSPIds() {
  var arrIds = []

  this._soundPlayerArray.forEach(sp => { arrIds.push(sp.soundId) })

  return arrIds
}

// add new Sound Player to the array
function createSP(quantity) {
  require(['app/soundplayer'], (SoundPlayer) => {
    var playerCount = (quantity || 1)

    if (playerCount <= 0) playerCount = 1

    for (var i = 0; i < playerCount; i++) {
      const newSP = new SoundPlayer(this.getSPNextId(), this._getAudioContext())
      this.getSPArray().push(newSP)
      this._updateSPCount()
      this.incSPNextId()
    }

    // console.log('createSP this.listSPIds', this.listSPIds())
  })
}
// remove Sound Player from the array
function removeSP(sp) {
  const sId = sp.soundId

  if (AudioHash.state._soundPlayerArray.length > 1) {
    var position = AudioHash.state._soundPlayerArray.indexOf(sId)

    AudioHash.state._soundPlayerArray.splice(position, 1)
    this._updateSPCount()
  } else {
    this._resetSPCount()
  }

  var divSoundPlayers = document.querySelector('#soundPlayers')
  var soundToRemove = document.querySelector(`#sound${sId}`)

  divSoundPlayers.removeChild(soundToRemove)
}
// make a new sampler of 2 or more sounds
function createAudioHash(sndArr) {
  let newSampler = [] // Float32Array
  const numberOfChannels = this._getSoundChannelsMin(sndArr)
  const sndLengthSum = this._getSoundLengthSum(sndArr)

  // const sampleSize = document.getElementById('rngSampleSize').value

  // create new buffer to hold all the SoundPlayer audio data
  const sndSampleRate = sndArr[0].audioBuffer.sampleRate

  const newSamplerBuffer = this._getAudioContext()
    .createBuffer(
      numberOfChannels,
      sndLengthSum,
      sndSampleRate
    )

  // create array of indices to choose from
  // and then mix up order
  let indices = []

  for (var i = 0; i < sndArr.length; i++) {
    indices.push(i)
  }
  const indicesShuffled = this._shuffleArray(indices)

  // fill new audio buffer with SoundPlayer audio data
  for (var channel = 0; channel < numberOfChannels; channel++) {
    // initialize newSampler's array with 0s
    newSampler = newSamplerBuffer.getChannelData(channel)

    // while we still have indices, choose random index to add next
    let count = 0
    let offset = 0
    let index = 0
    while (indicesShuffled.length > 0) {
      // console.log('indicesShuffled', indicesShuffled)
      // console.log('indicesShuffled.length', indicesShuffled.length)
      // console.log('count', count)

      if (count > 0) {
        offset = sndArr[count - 1].audioBuffer.length
      }

      // grab the nth shuffled index for sndArr
      index = indicesShuffled[0]
      // console.log('index', index)
      // remove it from the shuffled index
      indicesShuffled.splice(0, 1)
      // console.log('indicesShuffled', indicesShuffled)

      // write sndArr[index] to new Audio Hash
      // offset by the last sndArr[index]
      // or start at 0 if just begun
      newSampler.set(
        sndArr[index].audioBuffer.getChannelData(channel),
        offset
      )

      count += 1
    }
  }

  // encode our newly-made audio buffer into a wav file
  var dataView = this._encodeWavFile(newSampler, newSamplerBuffer.sampleRate / 2)
  var audioBlob = new Blob([dataView], { type : 'audio/wav' })

  // post new wav file to download link
  this._enableDownload(audioBlob)

  // makes a temp audio buffer source and plays the new sampler mix
  if (AudioHash.settings.mixDemo) {
    var mixSpeed = document.getElementById('numPlaybackPerc').value
    if (mixSpeed !== '') mixSpeed = mixSpeed / 100
    var audioSource = this._getAudioContext().createBufferSource()
    audioSource.buffer = newSamplerBuffer
    audioSource.connect(this._getAudioContext().destination)
    audioSource.playbackRate.value = mixSpeed
    audioSource.start()
  }

  // post hex dump
  if (AudioHash.settings.dumpHex) {
    var decoder = new TextDecoder('utf-8')
    var decodedString = decoder.decode(dataView)
    this._displayHexDump(decodedString)
  }
}

/* ******************************** *
 * _private methods                 *
 * ******************************** */

function _getAudioContext() {
  return AudioHash.state._audioContext()
}
function _getSP(sId) {
  var position = this.listSPIds().indexOf(parseInt(sId))
  return this._soundPlayerArray[position]
}
function _setSPArray(arr) {
  this._soundPlayerArray = arr
}
function _updateSPCount() {
  document.getElementById('lblSoundPlayersCount').innerText = this.getSPArrayLength()
  // console.log('audiohash.js this.getSPNextId()', this.getSPNextId())
}
function _resetSPCount() {
  this._soundPlayerArray = []
  this._soundPlayerNextId = 0
}

function _displayHexDump(bufferString) {
  document.getElementById('hex-dump').style.display = 'block'
  document.getElementById('hex-dump-contents').innerHTML = 'dumping hex...'
  myWorker.postMessage({
    command: 'hexDump',
    buffer: bufferString
  })
}

function _shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

function _getSoundChannelsMin(sndArr) {
  var sndChannelsArr = []
  sndArr.forEach(function(snd) {
    sndChannelsArr.push(snd.audioBuffer.numberOfChannels)
  })
  return Math.min.apply(Math, sndChannelsArr)
}

function _getSoundLengthSum(sndArr) {
  var lng = 0
  for (var i = 0; i < sndArr.length; i++) {
    lng += sndArr[i].audioBuffer.length
  }
  return lng
}

function _getSoundSlice(audioBuffer) {
  var sliceNumber = document.getElementById('txtSampleSize')
  var randBegin = Math.Random() * (audioBuffer.length - sliceNumber)
  var randEnd = randBegin + sliceNumber
  return audioBuffer.slice(randBegin, randEnd)
}

function _enableDownload(blob, givenFilename) {
  var url = (window.URL || window.webkitURL).createObjectURL(blob)
  var link = document.getElementById('linkDownloadAH')
  var d = new Date()
  var defaultFilename = 'sampler' + d.toJSON() + '.wav'

  link.style.display = 'inline'
  link.href = url
  link.download = givenFilename || defaultFilename
}

function _writePCMSamples(output, offset, input) {
  for (var i = 0; i < input.length; i++, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
}

function _writeString(view, offset, string) {
  for (var i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function _encodeWavFile(samples, sampleRate) {
  var buffer = new ArrayBuffer(44 + samples.length * 2)
  var view = new DataView(buffer)

  // RIFF identifier
  this._writeString(view, 0, 'RIFF')
  // file length
  view.setUint32(4, 32 + samples.length * 2, true)
  // RIFF type
  this._writeString(view, 8, 'WAVE')
  // format chunk identifier
  this._writeString(view, 12, 'fmt ')
  // format chunk length
  view.setUint32(16, 16, true)
  // sample format (raw)
  view.setUint16(20, 1, true)
  // stereo (2 channels)
  view.setUint16(22, 2, true)
  // sample rate
  view.setUint32(24, sampleRate, true)
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 4, true)
  // block align (channels * bytes/sample)
  view.setUint16(32, 4, true)
  // bits/sample
  view.setUint16(34, 16, true)
  // data chunk identifier
  this._writeString(view, 36, 'data')
  // data chunk length
  view.setUint32(40, samples.length * 2, true)
  // write the PCM samples
  this._writePCMSamples(view, 44, samples)

  return view
}

/* ******************************** *
 * START THE ENGINE                 *
 * ******************************** */

window.onload = this.initApp()
