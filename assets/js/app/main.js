/* main */
/* app entry point and main functions */
/* global AudioHash */

// settings: saved in LOCAL STORAGE
AudioHash.settings = {
  'dumpHex': false,
  'mixDemo': false,
  'mixRate': 100
}

// config: only saved while app is loaded
AudioHash.config = {
  '_soundPlayerNextId': 0,    // used to give each SP a unique ID
  '_soundPlayerCountMax': 10, // arbitrary, may change or go away
  '_soundPlayerArray': []     // holds all the existing SPs
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

    // add some default file energy through magic hidden XHR
    // https://stackoverflow.com/questions/1696877/how-to-set-a-value-to-a-file-input-in-html
    AudioHash._addDefaultFiles()
  }

  // load localStorage settings
  AudioHash._loadSettings()

  AudioHash._saveSettings()
}

AudioHash.createSP = function(quantity) {
  var playerCount = (quantity || 1)

  if (playerCount <= 0) playerCount = 1

  for (var i = 0; i < playerCount; i++) {
    const newSP = new SoundPlayer(AudioHash._getSPNextId(), AudioHash._getAudioContext())

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

AudioHash._getAudioContext = function() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return console.warn(AH_ERROR_NO_WEB_AUDIO)
  } else {
    return new (window.AudioContext || window.webkitAudioContext)()
  }
}

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
    // console.log('btnCreateAH clicked')

    if (AudioHash._getSPCount() < 2) {
      modalOpen('min-count-unmet')
    } else if (AudioHash._areSPBuffersEmpty()) {
      modalOpen('sound-buffer-unmet')
    } else {
      AudioHash._createAudioHash()
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

// using hidden XHRs, auto-load default SoundPlayers with audio files
AudioHash._addDefaultFiles = function() {
  const options = {
    type: 'audio/wav',
    lastModified: new Date().getTime()
  }

  AH_DEFAULT_FILES.forEach((url, index) => {
    AudioHash._getAudioUrl(url, (audioBlob) => {
      const myFile = new File(
        [audioBlob],
        AH_DEFAULT_FILES[index].substring(AH_DEFAULT_FILES[index].lastIndexOf('/') + 1),
        options
      )

      // transfer from xhr->File to <input> value
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(myFile)
      document.querySelector(`#fileUpload${index}`).files = dataTransfer.files

      // make it like a user clicked "Choose File" and made a selection
      document.querySelector(`#fileUpload${index}`)
        .dispatchEvent(new Event(
          'change',
          {
            bubbles: true
          }
        ))
    })
  })
}

// xhr to get audio blob from url
AudioHash._getAudioUrl = function(url, callback) {
  const xhr = new XMLHttpRequest()
  xhr.onload = function() {
    callback(xhr.response)
  }
  xhr.open('GET', url)
  xhr.responseType = 'blob'
  xhr.send()
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

AudioHash._createAudioHash = function() {
  // does audio voodoo to use later
  AudioHash.__getAudioData()

  const spArr = []

  // ******************************************************** //
  // create array w/ byte offsets from main _soundPlayerArray //
  // ******************************************************** //

  AudioHash.config._soundPlayerArray.forEach(sp => {
    const spFileTitle = sp.dom.fileUpload[0].value

    // TODO: make audioHash function work with randomly-chosen snippets of files
    // TODO: make audioHash function work with crossfade between files
    // get percentage of song to grab for snippet
    const snippetLengthPerc = (sp.snippetSeconds / sp.audioBuffer.duration).toFixed(2)

    // get length in bytes of said snippet
    const snippetByteLength = Math.round(sp.arrayBuffer.byteLength * snippetLengthPerc) - 500000

    const snippetSampleRate = sp.audioBuffer.sampleRate
    const snippetChannels = sp.audioBuffer.numberOfChannels

    const bitRate = 16

    const originalDuration = sp.arrayBuffer.byteLength / (sp.audioBuffer.sampleRate * sp.audioBuffer.numberOfChannels * (bitRate / 8))

    // console.log('originalDuration', originalDuration)

    //                      bytes             / (samplerate        * channels        * (bps / 8))
    //                      2626647           / (44100             * 2               * (?   / 8))
    const snippetDuration = snippetByteLength / (snippetSampleRate * snippetChannels * (bitRate / 8))


    // snippetByteEnd cannot be higher than this
    const maxByteEnd = sp.arrayBuffer.byteLength - snippetByteLength

    // start by grabbing a random byte start offset
    let snippetByteStart = Math.round(Math.random() * sp.arrayBuffer.byteLength)
    // next, grab end, which is just start + length
    let snippetByteEnd = snippetByteStart + snippetByteLength
    // check for validity of chunk
    let isValidChunk = Boolean(snippetByteEnd <= maxByteEnd)

    // console.log(`${spFileTitle} - snippetByteStart: ${snippetByteStart}, snippetByteEnd: ${snippetByteEnd}, maxByteEnd: ${maxByteEnd}; valid? ${isValidChunk}`)

    let retry = 0

    // if the start + length > maxByteEnd, then grab a new snippet
    while (!isValidChunk && retry < 10) {
      // console.warn('snippet out of bounds; grabbing a new random one')

      snippetByteStart = Math.round(Math.random() * sp.arrayBuffer.byteLength)
      snippetByteEnd = snippetByteStart + snippetByteLength
      isValidChunk = Boolean(snippetByteEnd <= maxByteEnd)
      retry++

      // console.log(`${spFileTitle} - snippetByteStart: ${snippetByteStart}, snippetByteEnd: ${snippetByteEnd}, maxByteEnd: ${maxByteEnd}; valid? ${isValidChunk}`)
    }

    console.log(`make snippet of ${spFileTitle}:
* ${sp.snippetSeconds}s / ${Math.round(sp.audioBuffer.duration)}s, ${(snippetLengthPerc * 100).toFixed(2)}% of track
* Start   : ${snippetByteStart.toLocaleString().padStart(11, ' ')} / ${sp.arrayBuffer.byteLength.toLocaleString()}
* Length  : ${snippetByteLength.toLocaleString().padStart(11, ' ')} / ${sp.arrayBuffer.byteLength.toLocaleString()}
* End     : ${(snippetByteStart + snippetByteLength).toLocaleString().padStart(11, ' ')} / ${sp.arrayBuffer.byteLength.toLocaleString()}
* Duration:  ${snippetDuration.toFixed(2).padStart(4, ' ')} s
    `)
    console.log('sp', sp)

    spArr.push({
      buffer: sp.arrayBuffer,
      snippet: {
        beg: snippetByteStart,
        end: snippetByteEnd,
        len: snippetByteLength,
        sec: snippetDuration
      },
      title: spFileTitle
    })
  })

  // ******************************************************** //
  // main magic moment where we make the actual audio hash    //
  // ******************************************************** //

  console.log('COOKING UP A NEW AUDIO HASH!')
  spArr.forEach(sp => {
    console.log(sp.snippet)
  })

  // get combined original byte length by adding up all byte lengths
  let spArrByteLength = 0
  spArr.forEach(sp => {
    spArrByteLength += sp.buffer.byteLength
  })

  // get combined audioHash byte length by adding up all snippets' byte length
  let audioHashByteLength = 0
  spArr.forEach(sp => {
    audioHashByteLength += sp.snippet.len
  })

  const hashPercOfOriginal = Math.round((audioHashByteLength / spArrByteLength) * 100)

  console.log(`hashPercOfOriginal  : ${hashPercOfOriginal.toLocaleString().padStart(3, ' ')}%`)
  console.log(`spArrByteLength     : ${spArrByteLength.toLocaleString().padStart(11, ' ')} bytes`)
  console.log(`audioHashByteLength : ${audioHashByteLength.toLocaleString().padStart(11, ' ')} bytes`)

  this.myModal = new Modal('temp-loading', 'Creating Audio Hash',
    'Mixing your audio files into a delicious hash...',
    null,
    null
  )

  // create audioHashByteArray with size to hold all spArr buffers
  let audioHashByteArray = new Uint8Array(audioHashByteLength)

  // set initial offset to beginning of audioHashByteArray
  let spOffset = 0

  let audioHashDuration = 0

  console.log(`initial spOffset    : ${spOffset.toLocaleString().padStart(11, ' ')} bytes`)

  // iterate through soundplayer array, adding each buffer's start to previous buffer's end
  for (let i = 0; i < spArr.length; i++) {
    const spBuffer = spArr[i].buffer
    const spStart  = spArr[i].snippet.beg
    const spLength = spArr[i].snippet.len
    const arr = new Uint8Array(spBuffer, spStart, spLength)

    // console.log('arr', arr, spStart, spLength)

    audioHashByteArray.set(arr, spOffset)

    spOffset += spLength
    audioHashDuration += spArr[i].snippet.sec

    console.log(`next spOffset       : ${spOffset.toLocaleString().padStart(11, ' ')} bytes`)
  }

  console.log(`final audioHash     : ${audioHashByteArray.byteLength.toLocaleString().padStart(11, ' ')} bytes`)
  console.log(`                    : ${audioHashDuration.toLocaleString().padStart(11, ' ')} s`)

  // get spArr[0] audio data to create the new combined wav header
  const audioHashAudioHeader = AudioHash.__getAudioData
    .WavHeader
    .readHeader(new DataView(spArr[0].buffer))

  // console.log('audioHashAudioHeader', audioHashAudioHeader)

  // actually get the final audio hash audio data
  const audioHashAudioByteArray = AudioHash.__getWavByteArray(
    audioHashByteArray,
    {
      isFloat: false, // floating point or 16-bit integer
      numChannels: audioHashAudioHeader.channels,
      sampleRate: audioHashAudioHeader.sampleRate
    }
  )

  // create new Blob to hold audioHash data
  const audioHashBlob = new Blob([audioHashAudioByteArray], { type: 'audio/wav; codecs=MS_PCM' })

  // read that blob (so it can be downloaded, and possibly previewed/hex dumped)
  const audioHashBlobReader = new FileReader()
  audioHashBlobReader.readAsDataURL(audioHashBlob)

  // when done reading the blob, optionally create preview or show hex dump
  audioHashBlobReader.addEventListener('loadend', () => {
    // close "creating hash" modal
    this.myModal._destroyModal()

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
      const audioPreviewElement = document.getElementById('audio')

      audioPreviewElement.src = audioHashBlobReader.result.toString()
      audioPreviewElement.volume = 0.5
      audioPreviewElement.style.display = 'block'

      const loadingModal = this.myModal
      let shouldCloseModal = true

      // once <audio> source is filled, close loading modal
      audioPreviewElement.addEventListener('canplaythrough', () => {
        if (shouldCloseModal) {
          loadingModal._destroyModal()

          shouldCloseModal = false
        }
      })
    }

    // optional thing #2: add hex dump to page
    if (AudioHash.settings.dumpHex) {
      var decoder = new TextDecoder('utf-8')
      var decodedString = decoder.decode(audioHashAudioByteArray)

      AudioHash.__displayHexDump(decodedString)
    }
  })

  // display new hash wav file download link
  AudioHash.__enableDownload(audioHashBlob)
}

/************************************************************************
 * _private __helper methods *
 ************************************************************************/

// returns Uint8Array of WAV bytes
AudioHash.__getWavByteArray = function(buffer, options) {
  const arrayType = options.isFloat ? Float32Array : Uint16Array
  const numFrames = buffer.byteLength / arrayType.BYTES_PER_ELEMENT
  const headerBytesArray = AudioHash.__getWavHeader(Object.assign({}, options, { numFrames }))
  const audioBytesArray = new Uint8Array(headerBytesArray.length + buffer.byteLength)

  // prepend header, then add pcmBytes
  audioBytesArray.set(headerBytesArray, 0)
  audioBytesArray.set(new Uint8Array(buffer), headerBytesArray.length)

  return audioBytesArray
}

// adapted from https://gist.github.com/also/900023
// returns 44-byte WAV header
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

  const headerArray = new Uint8Array(buffer)

  return headerArray
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
