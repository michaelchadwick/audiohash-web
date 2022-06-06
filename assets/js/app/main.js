/* main */
/* app entry point and main functions */
/* global AudioHash */

// settings: saved in LOCAL STORAGE
AudioHash.settings = {
  "dumpHex": false,
  "mixDemo": false,
  "mixRate": 100,
  "sampleSize": 5
}

// config: only saved while game is loaded
AudioHash.config = {
  "_soundPlayerNextId": 0, // used to give each SP a unique ID
  "_soundPlayerCountMax": 10, // arbitrary, may change or go away
  "_soundPlayerArray": [], // holds all the existing SPs
  "_audioContext": function() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return console.warn(AH_ERROR_NO_WEB_AUDIO)
    } else {
      return new (window.AudioContext || window.webkitAudioContext)()
    }
  }
}

/* ******************************** *
 * public methods                   *
 * ******************************** */

async function modalOpen(type) {
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
                <div class="description">Dump the raw hex of the hash when it is created (experimental TODO)</div>
              </div>
              <div class="control">
                <div class="container">
                  <div id="button-setting-dump-hex" data-status="" class="switch" onclick="AudioHash._changeSetting('dumpHex')">
                    <span class="knob"></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- mixDemo -->
            <div class="setting-row">
              <div class="text">
                <div class="title">Play hash on make?</div>
                <div class="description">Play audio hash when created (experimental TODO)</div>
              </div>
              <div class="control">
                <div class="container">
                  <div id="button-setting-mix-demo" data-status="" class="switch" onclick="AudioHash._changeSetting('mixDemo')">
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
                  <input id="input-setting-mix-rate" type="number" min="1" max="500" value="100" pattern="[0-9]+" onchange="AudioHash._changeSetting('mixRate')">
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
                  <input id="range-setting-sample-size" type="range" min="1" max="30" value="5" onchange="AudioHash._changeSetting('sampleSize', event)">
                  <label id="text-setting-sample-size" for="range-setting-sample-size">5</label>
                </div>
              </div>
            </div>

          </div>
        `,
        null,
        null
      )

      AudioHash._loadSettings()

      break

  }
}

AudioHash.initApp = function() {
  // set env
  AudioHash.env = AH_ENV_PROD_URL.includes(document.location.hostname) ? 'prod' : 'local'

  // set <title>
  document.title = `${AH_APP_TITLE || 'AH'} | ${AH_APP_TAGLINE || 'audio hash'}`

  // adjust <title> for env
  if (AudioHash.env == 'local') {
    document.title = '(LH) ' + document.title
  }

  // update DOM status elements
  AudioHash.dom.lblSPCount.innerText = AudioHash._getSPNextId()
  AudioHash.dom.lblSPCountMax.innerText = AudioHash._getSPCountMax()

  // attach event listeners to DOM elements
  AudioHash._attachEventListeners()

  AudioHash._initWebWorker()

  // create some sample soundplayers
  AudioHash.createSP(AH_INIT_SP_COUNT)

  // load localStorage settings
  AudioHash._loadSettings()

  AudioHash._saveSettings()
}

// add new Sound Player to the array
AudioHash.createSP = function(quantity) {
  var playerCount = (quantity || 1)

  if (playerCount <= 0) playerCount = 1

  for (var i = 0; i < playerCount; i++) {
    const newSP = new SoundPlayer(AudioHash._getSPNextId(), AudioHash._getAudioContext())

    AudioHash._getSPArray().push(newSP)
    AudioHash._updateSPCount()
    AudioHash._incSPNextId()
  }

  // console.log('createSP AudioHash._listSPIds', AudioHash._listSPIds())
}
// remove Sound Player from the array
AudioHash.removeSP = function(sp) {
  const sId = sp.soundId

  if (AudioHash.config._soundPlayerArray.length > 1) {
    var position = AudioHash.config._soundPlayerArray.indexOf(sId)

    AudioHash.config._soundPlayerArray.splice(position, 1)
    AudioHash._updateSPCount()
  } else {
    AudioHash._resetSPCount()
  }

  var divSoundPlayers = document.querySelector('#soundPlayers')
  var soundToRemove = document.querySelector(`#sound${sId}`)

  divSoundPlayers.removeChild(soundToRemove)
}

/* ******************************** *
 * _private methods                 *
 * ******************************** */

// create web worker
AudioHash._initWebWorker = function() {
  if (window.Worker) {
    AudioHash.myWorker = new Worker('./assets/js/app/worker.js')

    AudioHash.myWorker.onmessage = function(e) {
      console.log('Message received from worker', e.data)

      const command = e.data.command
      const ascii = e.data.ascii

      switch (command) {
        case 'asciiDump':
          AudioHash.dom.hexDumpContents.innerHTML = ascii

          break
        }
    }
  }
}

AudioHash._loadSettings = function() {
  if (localStorage.getItem(AH_SETTINGS_KEY)) {
    var lsConfig = JSON.parse(localStorage.getItem(AH_SETTINGS_KEY))

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
}
AudioHash._saveSettings = function() {
  try {
    localStorage.setItem(AH_SETTINGS_KEY, JSON.stringify(AudioHash.settings))

    // console.log('!localStorage global settings saved!', JSON.parse(localStorage.getItem(AH_SETTINGS_KEY)))
  } catch(error) {
    console.error('localStorage global settings save failed', error)
  }
}
AudioHash._changeSetting = function(setting, event = null) {
  switch (setting) {
    case 'dumpHex':
      var st = document.getElementById('button-setting-dump-hex').dataset.status

      if (st == '' || st == 'false') {
        // update setting DOM
        document.getElementById('button-setting-dump-hex').dataset.status = 'true'

        // save to code/LS
        AudioHash._saveSetting('dumpHex', true)
      } else {
        // update setting DOM
        document.getElementById('button-setting-dump-hex').dataset.status = 'false'

        // save to code/LS
        AudioHash._saveSetting('dumpHex', false)
      }
      break

    case 'mixDemo':
      var st = document.getElementById('button-setting-mix-demo').dataset.status

      if (st == '' || st == 'false') {
        document.getElementById('button-setting-mix-demo').dataset.status = 'true'

        AudioHash._saveSetting('mixDemo', true)
      } else {
        document.getElementById('button-setting-mix-demo').dataset.status = 'false'

        AudioHash._saveSetting('mixDemo', false)
      }
      break

    case 'mixRate':
      var st = document.getElementById('input-setting-mix-rate').value

      if (st !== '') {
        AudioHash._saveSetting('mixRate', parseInt(st))
      }

      break

    case 'sampleSize':
      var st = document.getElementById('range-setting-sample-size').value

      if (st !== '') {
        document.getElementById('text-setting-sample-size').innerText = st

        AudioHash._saveSetting('sampleSize', parseInt(st))
      }

      break
  }
}
AudioHash._saveSetting = function(setting, value) {
  // console.log('saving setting to code/LS...', setting, value)

  var settings = JSON.parse(localStorage.getItem(AH_SETTINGS_KEY))

  if (settings) {
    // set internal code model
    AudioHash.settings[setting] = value

    // set temp obj that will go to LS
    settings[setting] = value

    // save all settings to LS
    localStorage.setItem(AH_SETTINGS_KEY, JSON.stringify(settings))
  }

  // console.log('!setting saved!', AudioHash.settings)
}

AudioHash._attachEventListeners = function() {
  AudioHash.dom.interactive.btnNav.addEventListener('click', () => {
    AudioHash.dom.navOverlay.classList.toggle('show')
  })
  AudioHash.dom.interactive.btnNavClose.addEventListener('click', () => {
    AudioHash.dom.navOverlay.classList.toggle('show')
  })

  AudioHash.dom.interactive.btnHelp.addEventListener('click', () => {
    modalOpen('help')
  })
  AudioHash.dom.interactive.btnSettings.addEventListener('click', () => {
    modalOpen('settings')
  })

  AudioHash.dom.interactive.btnCreateSP.addEventListener('click', () => {
    if (AudioHash._getSPArrayLength() < AudioHash._getSPCountMax()) {
      AudioHash.createSP()
    } else {
      alert(AH_ERROR_SP_COUNT_MAX_REACHED)
    }
  })
  AudioHash.dom.interactive.btnCreateAH.addEventListener('click', () => {
    if (AudioHash._getSPArrayLength() < 2) {
      alert(AH_ERROR_SP_COUNT_MIN_NOT_MET)
    }
    else if (AudioHash._areSPBuffersEmpty()) {
      alert(AH_ERROR_SP_INCOMPLETE)
    }
    else {
      AudioHash._createAudioHash(AudioHash._getSPArray())
    }
  })

  // When the user clicks or touches anywhere outside of the modal, close it
  window.addEventListener('click', AudioHash._handleClickTouch)
  window.addEventListener('touchend', AudioHash._handleClickTouch)
}
AudioHash._handleClickTouch = function(event) {

  var dialog = document.getElementsByClassName('modal-dialog')[0]

  if (dialog) {
    var isConfirm = dialog.classList.contains('modal-confirm')

    // only close if not a confirmation!
    if (event.target == dialog && !isConfirm) {
      dialog.remove()
    }
  }

  if (event.target == AudioHash.navOverlay) {
    AudioHash.navOverlay.classList.toggle('show')
  }
}

AudioHash._getAudioContext = function() {
  return AudioHash.config._audioContext()
}
AudioHash._getSP = function(sId) {
  var position = AudioHash._listSPIds().indexOf(parseInt(sId))
  return AudioHash.config._soundPlayerArray[position]
}
AudioHash._setSPArray = function(arr) {
  AudioHash.config._soundPlayerArray = arr
}
AudioHash._updateSPCount = function() {
  document.getElementById('lblSoundPlayersCount').innerText = AudioHash._getSPArrayLength()
  // console.log('audiohash.js AudioHash._getSPNextId()', AudioHash._getSPNextId())
}
AudioHash._resetSPCount = function() {
  AudioHash.config._soundPlayerArray = []
  AudioHash.config._soundPlayerNextId = 0
}
AudioHash._areSPBuffersEmpty = function() {
  var empty = false

  AudioHash._getSPArray().forEach(function(sound) {
    if (!sound.audioBuffer) {
      empty = true
    }
  })

  return empty
}
AudioHash._getSPNextId = function() {
  return AudioHash.config._soundPlayerNextId
}
AudioHash._incSPNextId = function() {
  AudioHash.config._soundPlayerNextId += 1
}
AudioHash._getSPArray = function() {
  return AudioHash.config._soundPlayerArray
}
AudioHash._getSPArrayLength = function() {
  return AudioHash.config._soundPlayerArray.length
}
AudioHash._getSPCountMax = function() {
  return AudioHash.config._soundPlayerCountMax
}
AudioHash._listSPIds = function() {
  var arrIds = []

  AudioHash.config._soundPlayerArray.forEach(sp => { arrIds.push(sp.soundId) })

  return arrIds
}


// make a new sampler of 2 or more sounds
AudioHash._createAudioHash = function(sndArr) {
  const numberOfChannels = AudioHash.__getSoundChannelsMin(sndArr)
  const sndLengthSum = AudioHash.__getSoundLengthSum(sndArr)
  let newSampler = [] // Float32Array

  // const sampleSize = document.getElementById('rngSampleSize').value

  // create new buffer to hold all the SoundPlayer audio data
  const sndSampleRate = sndArr[0].audioBuffer.sampleRate

  const newSamplerBuffer = AudioHash._getAudioContext()
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

  const indicesShuffled = AudioHash.__shuffleArray(indices)

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

      // write sndArr[index] to newSampler
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
  var dataView = AudioHash.__encodeWavFile(newSampler, newSamplerBuffer.sampleRate / 2)
  var audioBlob = new Blob([dataView], { type : 'audio/wav' })

  // post new wav file to download link
  AudioHash.__enableDownload(audioBlob)

  // makes a temp audio buffer source and plays the new sampler mix
  if (AudioHash.settings.mixDemo) {
    var mixRate = AudioHash.settings.mixRate

    if (mixRate !== '') {
      mixRate = mixRate / 100
    }

    var audioSource = AudioHash._getAudioContext().createBufferSource()

    audioSource.buffer = newSamplerBuffer
    audioSource.connect(AudioHash._getAudioContext().destination)
    audioSource.playbackRate.value = mixRate
    audioSource.start()
  }

  // post hex dump
  if (AudioHash.settings.dumpHex) {
    var decoder = new TextDecoder('utf-8')
    var decodedString = decoder.decode(dataView)

    AudioHash.__displayHexDump(decodedString)
  }
}

/************************************************************************
 * _private __helper methods *
 ************************************************************************/

AudioHash.__writePCMSamples = function(output, offset, input) {
  for (var i = 0; i < input.length; i++, offset += 2){
    var s = Math.max(-1, Math.min(1, input[i]))

    if (s < 0) {
      output.setInt16(offset, s * 0x8000, true)
    } else {
      output.setInt16(offset, s * 0x7FFF, true)
    }

  }
}
AudioHash.__writeString = function(view, offset, string) {
  for (var i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

AudioHash.__encodeWavFile = function(samples, sampleRate) {
  var buffer = new ArrayBuffer(44 + samples.length * 2)
  var view = new DataView(buffer)

  // RIFF identifier
  AudioHash.__writeString(view, 0, 'RIFF')
  // file length
  view.setUint32(4, 32 + samples.length * 2, true)
  // RIFF type
  AudioHash.__writeString(view, 8, 'WAVE')
  // format chunk identifier
  AudioHash.__writeString(view, 12, 'fmt ')
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
  AudioHash.__writeString(view, 36, 'data')
  // data chunk length
  view.setUint32(40, samples.length * 2, true)
  // write the PCM samples
  AudioHash.__writePCMSamples(view, 44, samples)

  return view
}

AudioHash.__shuffleArray = function(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

AudioHash.__getSoundLengthSum = function(sndArr) {
  var lng = 0
  for (var i = 0; i < sndArr.length; i++) {
    lng += sndArr[i].audioBuffer.length
  }
  return lng
}
AudioHash.__getSoundSlice = function(audioBuffer) {
  var sliceNumber = document.getElementById('txtSampleSize')
  var randBegin = Math.Random() * (audioBuffer.length - sliceNumber)
  var randEnd = randBegin + sliceNumber
  return audioBuffer.slice(randBegin, randEnd)
}
AudioHash.__getSoundChannelsMin = function(sndArr) {
  var sndChannelsArr = []

  sndArr.forEach(function(snd) {
    sndChannelsArr.push(snd.audioBuffer.numberOfChannels)
  })

  return Math.min.apply(Math, sndChannelsArr)
}

AudioHash.__enableDownload = function(blob, givenFilename) {
  var url = (window.URL || window.webkitURL).createObjectURL(blob)
  var link = document.getElementById('linkDownloadAH')
  var d = new Date()
  var defaultFilename = 'sampler' + d.toJSON() + '.wav'

  link.style.display = 'inline'
  link.href = url
  link.download = givenFilename || defaultFilename
}

AudioHash.__displayHexDump = function(bufferString) {
  AudioHash.dom.hexDump.style.display = 'flex'
  AudioHash.dom.hexDumpContents.innerHTML = 'dumping hex...'

  AudioHash.myWorker.postMessage({
    command: 'hexDump',
    buffer: bufferString
  })
}

/*************************************************************************
 * START THE ENGINE *
 *************************************************************************/

window.onload = AudioHash.initApp
