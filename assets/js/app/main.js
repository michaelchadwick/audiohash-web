/* main */
/* app entry point and main functions */
/* global AudioHash */

// settings: saved in LOCAL STORAGE
AudioHash.settings = {
  "dumpHex": false,
  "mixDemo": false,
  "mixRate": 100
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
            <li>Load files into SoundPlayers</li>
            <li>TODO: <s>Choose how much of each you want sampled</s> (currently, entire audio file will be sampled)</li>
            <li>Optionally: turn on "Play hash on make?" in Settings (gear icon) for an audio player to be created upon successful hash</li>
            <li>Click/tap '# MAKE HASH' and a download link to your new sampler will be created for you to download</li>
          </ol>
        `,
        null,
        null
      )
      break

    case 'settings':
      let markup = `
        <div id="settings">
      `
      markup += `
          <!-- mixDemo -->
          <div class="setting-row">
            <div class="text">
              <div class="title">Play hash on make?</div>
              <div class="description">Create sound player for audio hash when created</div>
            </div>
            <div class="control">
              <div class="container">
                <div id="button-setting-mix-demo" data-status="" class="switch" onclick="AudioHash._changeSetting('mixDemo')">
                  <span class="knob"></span>
                </div>
              </div>
            </div>
          </div>
        `

        if (AudioHash.env == 'local') {
          markup += `
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

            <!-- TODO: mixRate
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
            -->
          `
        }

      markup += `
        </div>
      `
      this.myModal = new Modal('perm', 'Settings',
        markup,
        null,
        null
      )

      AudioHash._loadSettings()

      break

    case 'max-count-reached':
      this.myModal = new Modal('temp', null,
        AH_ERROR_SP_COUNT_MAX_REACHED,
        null,
        null
      )
      break

    case 'min-count-unmet':
      this.myModal = new Modal('temp', null,
        AH_ERROR_SP_COUNT_MIN_NOT_MET,
        null,
        null
      )
      break

    case 'sound-buffer-unmet':
      this.myModal = new Modal('temp', null,
        AH_ERROR_SP_INCOMPLETE,
        null,
        null
      )
      break
  }
}

AudioHash.initApp = function() {
  // set env
  AudioHash.env = AH_ENV_PROD_URL.includes(document.location.hostname) ? 'prod' : 'local'

  // set <title>
  document.title = `${AH_APP_TITLE || 'AH'} | ${AH_APP_TAGLINE || 'audio hash'}`

  // update DOM status elements
  AudioHash.dom.lblSPCount.innerText = AudioHash._getSPNextId().toString().padStart(2, '0')
  AudioHash.dom.lblSPCountMax.innerText = AH_SP_COUNT_MAX.toString().padStart(2, '0')

  // attach event listeners to DOM elements
  AudioHash._attachEventListeners()

  AudioHash._initWebWorker()

  AudioHash._getNebyooApps()

  // create some sample soundplayers
  AudioHash.createSP(AH_SP_COUNT_INIT)

  // adjust <title> for env
  if (AudioHash.env == 'local') {
    document.title = '(LH) ' + document.title

    // AudioHash._addDefaultFiles()
  }

  // load localStorage settings
  AudioHash._loadSettings()

  AudioHash._saveSettings()
}

AudioHash.createSP = function(quantity) {
  var playerCount = (quantity || 1)

  if (playerCount <= 0) playerCount = 1

  for (var i = 0; i < playerCount; i++) {
    const newSP = new SoundPlayer(AudioHash._getSPNextId(), AudioHash.config._audioContext())

    AudioHash.config._soundPlayerArray.push(newSP)
    AudioHash._updateSPCount()
    AudioHash._incSPNextId()
  }

  if (AudioHash._getSPCount() >= 10) {
    AudioHash.dom.interactive.btnCreateSP.setAttribute('disabled', true)
  }
}
AudioHash.removeSP = function(sp) {
  const confirm = sp.isLoaded ? window.confirm('Are you sure you want to delete this SoundPlayer?') : true

  if (confirm) {
    const sId = sp.soundId

    if (AudioHash.config._soundPlayerArray.length > 0) {
      var position = AudioHash.config._soundPlayerArray.indexOf(sId)

      AudioHash.config._soundPlayerArray.splice(position, 1)
      AudioHash._updateSPCount()

      AudioHash.dom.interactive.btnCreateSP.removeAttribute('disabled')
    } else {
      AudioHash._resetSPCount()
    }

    AudioHash.dom.players.removeChild(document.getElementById(`sound${sId}`))

    if (AudioHash._getSPCount() >= 2 && !AudioHash._areSPBuffersEmpty()) {
      AudioHash.dom.interactive.btnCreateAH.removeAttribute('disabled')
    } else {
      AudioHash.dom.interactive.btnCreateAH.setAttribute('disabled', 'true')
    }
  }
}

/* ******************************** *
 * _private methods                 *
 * ******************************** */

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
    if (AudioHash._getSPCount() < AH_SP_COUNT_MAX) {
      AudioHash.createSP()
    } else {
      modalOpen('max-count-reached')
    }
  })
  AudioHash.dom.interactive.btnCreateAH.addEventListener('click', () => {
    if (AudioHash._getSPCount() < 2) {
      modalOpen('min-count-unmet')
    } else if (AudioHash._areSPBuffersEmpty()) {
      modalOpen('sound-buffer-unmet')
    } else {
      AudioHash.__getAudioData()

      const buffers = AudioHash.config._soundPlayerArray.map(snd => snd.arrayBuffer)

      AudioHash._createAudioHash(buffers)
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

AudioHash._addDefaultFiles = function() {
  const fileInput0 = document.querySelector('#fileUpload0')
  const fileInput1 = document.querySelector('#fileUpload1')

  const myFile0 = new File(['waymu0.wav'], '/assets/audio/waymu0.wav', {
    type: 'audio/mp3',
  })
  const myFile1 = new File(['waymu1.wav'], '/assets/audio/waymu1.wav', {
    type: 'audio/mp3',
  })

  const dataTransfer0 = new DataTransfer()
  dataTransfer0.items.add(myFile0)
  fileInput0.files = dataTransfer0.files

  const dataTransfer1 = new DataTransfer()
  dataTransfer1.items.add(myFile1)
  fileInput1.files = dataTransfer1.files
}

AudioHash._getSP = function(sId) {
  var position = AudioHash._listSPIds().indexOf(parseInt(sId))

  return AudioHash.config._soundPlayerArray[position]
}
AudioHash._updateSPCount = function() {
  AudioHash.dom.lblSPCount.innerText = AudioHash._getSPCount().toString().padStart(2, '0')
}
AudioHash._resetSPCount = function() {
  AudioHash.config._soundPlayerArray = []
  AudioHash.config._soundPlayerNextId = 0
}
AudioHash._areSPBuffersEmpty = function() {
  var empty = false

  AudioHash.config._soundPlayerArray.forEach(function(sound) {
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
AudioHash._getSPCount = function() {
  return AudioHash.config._soundPlayerArray.length
}
AudioHash._listSPIds = function() {
  var arrIds = []

  AudioHash.config._soundPlayerArray.forEach(sp => { arrIds.push(sp.soundId) })

  return arrIds
}

AudioHash._getNebyooApps = async function() {
  const response = await fetch(NEBYOOAPPS_SOURCE_URL)
  const json = await response.json()
  const apps = json.body
  const appList = document.querySelector('.nav-list')

  Object.values(apps).forEach(app => {
    const appLink = document.createElement('a')
    appLink.href = app.url
    appLink.innerText = app.title
    appLink.target = '_blank'
    appList.appendChild(appLink)
  })
}

// main magic function
// INPUT: array of ArrayBuffer objects
// OUTPUT: wav file
AudioHash._createAudioHash = function(spArr) {
  this.myModal = new Modal('temp-loading', 'Creating Audio Hash',
    'Mixing your audio files into a delicious hash...',
    null,
    null
  )

  // let hashByteLength = spArr.reduce((a, b) => a.byteLength + b.byteLength, 0);

  // get combined byte length by adding up all sounds' byte length
  let hashByteLength = 0

  spArr.forEach(snd => {
    hashByteLength += snd.byteLength
  })

  console.log('hashByteLength', hashByteLength)

  // create temp array with size to hold all buffers
  let tmp = new Uint8Array(hashByteLength)
  let spByteOffset = spArr[0].byteLength

  // set first buffer to beginning of array
  tmp.set(new Uint8Array(spArr[0], 0))

  // set subsequent buffers to end of previous buffer
  for (let i = 1; i < spArr.length; i++) {
    tmp.set(new Uint8Array(spArr[i]), spByteOffset)

    spByteOffset += spArr[i].byteLength
  }

  // get spArr[0] audio data to create the new combined wav header
  const audioData = AudioHash.__getAudioData.WavHeader.readHeader(new DataView(spArr[0]))

  // send combined buffer+audio data to create the audio data of combined
  const arrBytesFinal = AudioHash.__getWavBytes(
    tmp,
    {
      isFloat: false, // floating point or 16-bit integer
      numChannels: audioData.channels,
      sampleRate: audioData.sampleRate,
    }
  )

  console.log('arrBytesFinal', arrBytesFinal)

  const audioBlob = new Blob([arrBytesFinal], {
    type: 'audio/wav; codecs=MS_PCM'
  })

  const readerBlob = new FileReader()

  // when hash is done being created, do
  readerBlob.addEventListener('loadend', () => {
    // close "creating hash" modal
    this.myModal._destroyModal()

    let combineBase64Wav = readerBlob.result.toString()

    // optional thing #1: add <audio> of hash to page
    if (AudioHash.settings.mixDemo) {
      this.myModal = new Modal('temp-loading', 'Loading Audio',
        'Loading preview of your new delicious audio hash...',
        null,
        null
      )

      // show mix-demo section
      AudioHash.dom.mixDemo.style.display = 'block'

      // assign to <audio> element
      const audio = document.getElementById('audio')

      audio.src = combineBase64Wav
      audio.volume = 0.5
      audio.style.display = 'block'

      // once <audio> source is filled, close loading modal
      audio.addEventListener('canplaythrough', () => {
        this.myModal._destroyModal()
      })
    }

    // optional thing #2: add hex dump to page
    if (AudioHash.settings.dumpHex) {
      var decoder = new TextDecoder('utf-8')
      var decodedString = decoder.decode(arrBytesFinal)

      AudioHash.__displayHexDump(decodedString)
    }
  });

  // read hash audio data into hash wav file
  readerBlob.readAsDataURL(audioBlob)

  // display new hash wav file download link
  AudioHash.__enableDownload(audioBlob)
}

/************************************************************************
 * _private __helper methods *
 ************************************************************************/

// returns Uint8Array of WAV bytes
AudioHash.__getWavBytes = function(buffer, options) {
  const type = options.isFloat ? Float32Array : Uint16Array
  const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT

  // console.log('_getWavBytes byteLength', buffer.byteLength)

  const headerBytes = AudioHash.__getWavHeader(Object.assign({}, options, { numFrames }))
  // console.log('_getWavBytes headerBytes', headerBytes.length, buffer.byteLength)
  const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);
  // console.log('_getWavBytes wavBytes', wavBytes)

  // prepend header, then add pcmBytes
  wavBytes.set(headerBytes, 0)
  wavBytes.set(new Uint8Array(buffer), headerBytes.length)

  return wavBytes
}

// adapted from https://gist.github.com/also/900023
// returns Uint8Array of WAV header bytes
AudioHash.__getWavHeader = function(options) {
  const numFrames =      options.numFrames
  const numChannels =    options.numChannels || 2
  const sampleRate =     options.sampleRate || 44100
  const bytesPerSample = options.isFloat? 4 : 2
  const format =         options.isFloat? 3 : 1

  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign

  const buffer = new ArrayBuffer(44)
  const dv = new DataView(buffer)

  let p = 0

  function writeString(s) {
    for (let i = 0; i < s.length; i++) {
      dv.setUint8(p + i, s.charCodeAt(i))
    }
    p += s.length
  }

  function writeUint32(d) {
    dv.setUint32(p, d, true)
    p += 4
  }

  function writeUint16(d) {
    dv.setUint16(p, d, true)
    p += 2
  }

  writeString('RIFF')              // ChunkID
  writeUint32(dataSize + 36)       // ChunkSize
  writeString('WAVE')              // Format
  writeString('fmt ')              // Subchunk1ID
  writeUint32(16)                  // Subchunk1Size
  writeUint16(format)              // AudioFormat
  writeUint16(numChannels)         // NumChannels
  writeUint32(sampleRate)          // SampleRate
  writeUint32(byteRate)            // ByteRate
  writeUint16(blockAlign)          // BlockAlign
  writeUint16(bytesPerSample * 8)  // BitsPerSample
  writeString('data')              // Subchunk2ID
  writeUint32(dataSize)            // Subchunk2Size

  return new Uint8Array(buffer)
}

AudioHash.__getAudioData = function() {
  // console.log('running _getAudioData()')

  function WavHeader() {
    this.dataOffset = 0;
    this.dataLen = 0;
    this.channels = 0;
    this.sampleRate = 0;
  }

  function fourccToInt(fourcc) {
    return fourcc.charCodeAt(0) << 24 | fourcc.charCodeAt(1) << 16 | fourcc.charCodeAt(2) << 8 | fourcc.charCodeAt(3);
  }

  WavHeader.RIFF = fourccToInt("RIFF");
  WavHeader.WAVE = fourccToInt("WAVE");
  WavHeader.fmt_ = fourccToInt("fmt ");
  WavHeader.data = fourccToInt("data");

  WavHeader.readHeader = function (dataView) {
    var w = new WavHeader();

    var header = dataView.getUint32(0, false);
    if (WavHeader.RIFF != header) {
      return;
    }

    var fileLen = dataView.getUint32(4, true);
    if (WavHeader.WAVE != dataView.getUint32(8, false)) {
      return;
    }
    if (WavHeader.fmt_ != dataView.getUint32(12, false)) {
      return;
    }
    var fmtLen = dataView.getUint32(16, true);
    var pos = 16 + 4;

    switch (fmtLen) {
      case 16:
      case 18:
        w.channels = dataView.getUint16(pos + 2, true);
        w.sampleRate = dataView.getUint32(pos + 4, true);
        break;
      default:
        throw 'extended fmt chunk not implemented';
    }

    pos += fmtLen;

    var data = WavHeader.data;
    var len = 0;

    while (data != header) {
      header = dataView.getUint32(pos, false);
      len = dataView.getUint32(pos + 4, true);

      if (data == header) {
        break;
      }

      pos += (len + 8);
    }

    w.dataLen = len;
    w.dataOffset = pos + 8;

    return w;
  };

  AudioHash.__getAudioData.WavHeader = WavHeader;
}

// returns bytePosition in file at number of seconds in from beginning
AudioHash.__getBytePosition = function(seconds, samples, channels, bits) {
  const sampleNumber = Floor(seconds * samples * channels)
  const bytePosition = sampleNumber * bits/8

  return bytePosition
}

// enables a link with the base64 version of the audiohash
AudioHash.__enableDownload = function(blob, givenFilename) {
  if (AudioHash.dom.interactive.btnDownloadAH.href) {
    AudioHash.dom.interactive.btnDownloadAH.style.display = 'none'
    AudioHash.dom.interactive.btnDownloadAH.href = ''
  }

  const url = (window.URL || window.webkitURL).createObjectURL(blob)
  const d = new Date(parseInt(Date.now()))
  let date = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0')
  const defaultFilename = 'audiohash_' + date + '.wav'

  AudioHash.dom.interactive.btnDownloadAH.style.display = 'flex'
  AudioHash.dom.interactive.btnDownloadAH.href = url
  AudioHash.dom.interactive.btnDownloadAH.download = givenFilename || defaultFilename
}

// displays textarea with hex version of audiohash
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
