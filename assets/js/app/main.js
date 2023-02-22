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
            <li>TODO: <s>Choose how much of each you want sampled</s></li>
            <li>Click/tap '# MAKE HASH' and a download link to your new sampler will be created for you to download</li>
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

  // adjust <title> for env
  if (AudioHash.env == 'local') {
    document.title = '(LH) ' + document.title
  }

  // update DOM status elements
  AudioHash.dom.lblSPCount.innerText = AudioHash._getSPNextId()
  AudioHash.dom.lblSPCountMax.innerText = AH_SP_COUNT_MAX

  // attach event listeners to DOM elements
  AudioHash._attachEventListeners()

  AudioHash._initWebWorker()

  AudioHash._getNebyooApps()

  // create some sample soundplayers
  AudioHash.createSP(AH_INIT_SP_COUNT)

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
}
AudioHash.removeSP = function(sp) {
  const sId = sp.soundId

  if (AudioHash.config._soundPlayerArray.length > 0) {
    var position = AudioHash.config._soundPlayerArray.indexOf(sId)

    AudioHash.config._soundPlayerArray.splice(position, 1)
    AudioHash._updateSPCount()
  } else {
    AudioHash._resetSPCount()
  }

  AudioHash.dom.soundPlayers.removeChild(document.getElementById(`sound${sId}`))
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

AudioHash._getSP = function(sId) {
  var position = AudioHash._listSPIds().indexOf(parseInt(sId))

  return AudioHash.config._soundPlayerArray[position]
}
AudioHash._updateSPCount = function() {
  AudioHash.dom.lblSPCount.innerText = AudioHash._getSPCount()
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

// // new method that DOES work!
// make a new sampler of 2 or more sounds
AudioHash._createAudioHash = function(sndArr) {
  let byteLength = 0

  sndArr.forEach(snd => {
    console.log('snd', snd)
    byteLength += snd.byteLength
  })

  // create temp array with size to hold all buffers
  let tmp = new Uint8Array(byteLength)
  let fullByteLength

  // set first buffer to beginning of array
  sndArr.forEach((snd, i) => {
    // set initial buffer to beginning of array
    if (i == 0) {
      fullByteLength = 0
      tmp.set(new Uint8Array(snd), fullByteLength)
    }
    // set subsequent buffers to end of previous buffer
    else {
      fullByteLength = snd.byteLength

      for (let j = i - 1; j > 0; j--) {
        fullByteLength += sndArr[j].byteLength;
      }

      tmp.set(new Uint8Array(snd), fullByteLength)
    }
  })

  // get sndArr[0] audio data to create the new combined wav
  const audioData = AudioHash.__getAudioData.WavHeader.readHeader(new DataView(sndArr[0]))

  // send combined buffer+audio data to create the audio data of combined
  const arrBytesFinal = AudioHash.__getWavBytes(
    tmp,
    {
      isFloat: false,       // floating point or 16-bit integer
      numChannels: audioData.channels,
      sampleRate: audioData.sampleRate,
    }
  )

  console.log('arrBytesFinal', arrBytesFinal)

  // create a Blob as Base64 Raw data with audio/wav type
  const audioBlob = new Blob([arrBytesFinal], {
    type: 'audio/wav; codecs=MS_PCM'
  })

  let combineBase64Wav
  const readerBlob = new FileReader()

  readerBlob.addEventListener('loadend', () => {
    combineBase64Wav = readerBlob.result.toString()

    // console.log('combineBase64Wav', combineBase64Wav)

    // makes a temp audio buffer source and plays the new sampler mix
    if (AudioHash.settings.mixDemo) {
      var mixRate = AudioHash.settings.mixRate

      if (mixRate !== '') {
        mixRate = mixRate / 100
      }

      // assign to audiocontrol to allow the new combined wav to be played.
      const audio = document.getElementById('audio')
      audio.src = combineBase64Wav
      audio.volume = 0.5
      audio.style.display = 'block'
    }

    // post hex dump
    if (AudioHash.settings.dumpHex) {
      var decoder = new TextDecoder('utf-8')
      var decodedString = decoder.decode(arrBytesFinal)

      AudioHash.__displayHexDump(decodedString)
    }
  });

  readerBlob.readAsDataURL(audioBlob)

  // post new wav file to download link
  AudioHash.__enableDownload(audioBlob)

  return combineBase64Wav
}

// // old method that does not work
// // make a new sampler of 2 or more sounds
// AudioHash._createAudioHash = function(sndArr) {
//   const numberOfChannels = AudioHash.__getSoundChannelsMin(sndArr)
//   const sndLengthSum = AudioHash.__getSoundLengthSum(sndArr)
//   let newSampler = [] // Float32Array

//   // create new buffer to hold all the SoundPlayer audio data
//   const sndSampleRate = sndArr[0].audioBuffer.sampleRate

//   const newSamplerBuffer = AudioHash.config._audioContext().createBuffer(
//     numberOfChannels,
//     sndLengthSum,
//     sndSampleRate
//   )

//   // create array of indices to choose from
//   // and then mix up order
//   let indices = []

//   for (let i = 0; i < sndArr.length; i++) {
//     indices.push(i)
//   }

//   const indicesShuffled = AudioHash.__shuffleArray(indices)

//   // fill new audio buffer with SoundPlayer audio data
//   for (let channel = 0; channel < numberOfChannels; channel++) {
//     // initialize newSampler's array with 0s
//     newSampler = newSamplerBuffer.getChannelData(channel)

//     // while we still have indices, choose random index to add next
//     let count = 0
//     let offset = 0
//     let index = 0

//     while (indicesShuffled.length > 0) {
//       // console.log('indicesShuffled', indicesShuffled)
//       // console.log('indicesShuffled.length', indicesShuffled.length)
//       // console.log('count', count)

//       if (count > 0) {
//         offset = sndArr[count - 1].audioBuffer.length
//       }

//       // grab the nth shuffled index for sndArr
//       index = indicesShuffled[0]

//       // console.log('index', index)

//       // remove it from the shuffled index
//       indicesShuffled.splice(0, 1)

//       // console.log('indicesShuffled', indicesShuffled)

//       // write sndArr[index] to newSampler
//       // offset by the last sndArr[index]
//       // or start at 0 if just begun
//       newSampler.set(
//         sndArr[index].audioBuffer.getChannelData(channel),
//         offset
//       )

//       count += 1
//     }
//   }

//   // encode our newly-made audio buffer into a wav file
//   var dataView = AudioHash.__encodeWavFile(newSampler, newSamplerBuffer.sampleRate / 2)
//   var audioBlob = new Blob([dataView], { type : 'audio/wav' })

//   // post new wav file to download link
//   AudioHash.__enableDownload(audioBlob)

//   // makes a temp audio buffer source and plays the new sampler mix
//   if (AudioHash.settings.mixDemo) {
//     var mixRate = AudioHash.settings.mixRate

//     if (mixRate !== '') {
//       mixRate = mixRate / 100
//     }

//     var audioSource = AudioHash.config._audioContext().createBufferSource()

//     audioSource.buffer = newSamplerBuffer
//     audioSource.connect(AudioHash.config._audioContext().destination)
//     audioSource.playbackRate.value = mixRate
//     audioSource.start()
//   }

//   // post hex dump
//   if (AudioHash.settings.dumpHex) {
//     var decoder = new TextDecoder('utf-8')
//     var decodedString = decoder.decode(dataView)

//     AudioHash.__displayHexDump(decodedString)
//   }
// }

/************************************************************************
 * _private __helper methods *
 ************************************************************************/

// returns Uint8Array of WAV bytes
AudioHash.__getWavBytes = function(buffer, options) {
  const type = options.isFloat ? Float32Array : Uint16Array
  const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT

  console.log('_getWavBytes byteLength', buffer.byteLength)

  const headerBytes = AudioHash.__getWavHeader(Object.assign({}, options, { numFrames }))
  console.log('_getWavBytes headerBytes', headerBytes.length, buffer.byteLength)
  const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);
  console.log('_getWavBytes wavBytes', wavBytes)

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

AudioHash.__writePCMSamples = function(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2){
    const s = Math.max(-1, Math.min(1, input[i]))

    if (s < 0) {
      output.setInt16(offset, s * 0x8000, true)
    } else {
      output.setInt16(offset, s * 0x7FFF, true)
    }

  }
}
AudioHash.__writeString = function(view, offset, string) {
  for (let i = 0; i < string.length; i++){
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
// TODO
AudioHash.__getSoundSlice = function(audioBuffer) {
  var sliceNumber = AudioHash.settings.sampleSize
  var randBegin = Math.Random() * (audioBuffer.length - sliceNumber)
  var randEnd = randBegin + sliceNumber

  // console.log('randBegin randEnd', randBegin, randEnd)

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
  if (AudioHash.dom.interactive.btnDownloadAH.href) {
    AudioHash.dom.interactive.btnDownloadAH.style.display = 'none'
    AudioHash.dom.interactive.btnDownloadAH.href = ''
  }

  const url = (window.URL || window.webkitURL).createObjectURL(blob)
  const d = new Date(parseInt(ep.time * 1000)).toLocaleDateString('en-CA')
  const defaultFilename = 'audio-hash-' + d + '.wav'

  AudioHash.dom.interactive.btnDownloadAH.style.display = 'flex'
  AudioHash.dom.interactive.btnDownloadAH.href = url
  AudioHash.dom.interactive.btnDownloadAH.download = givenFilename || defaultFilename
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
