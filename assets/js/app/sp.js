/* soundplayer */
/* class declaration for custom SoundPlayer */

// Constructor
function SoundPlayer(id, ac) {
  if (!(this instanceof SoundPlayer)) {
    throw new TypeError('SoundPlayer constructor cannot be called as a function.')
  }

  this.soundId = id
  this.audioContext = ac
  this.audioBuffer = null
  this.gainNode = this.audioContext.createGain()
  this.source = null
  this.startTime = 0
  this.startOffset = 0
  this.isPaused = false
  this.isStopped = true
  this.isPlaying = false

  this.createSoundPlayerUI()
}

// Prototypes
SoundPlayer.prototype = {
  constructor: SoundPlayer,

  initVolumeToRangeVal: function(el) {
    var volume = el.value
    var volumeMax = el.max
    var fraction = parseInt(volume) / parseInt(volumeMax)
    var gainVal = fraction * fraction

    this.gainNode.gain.value = gainVal
  },

  // change the internal gain node value
  changeVolume: function(event) {
    var volume = event.srcElement.value
    var volumeMax = event.srcElement.max
    var fraction = parseInt(volume) / parseInt(volumeMax)
    var gainVal = fraction * fraction

    this.gainNode.gain.value = gainVal
  },

  updateVolumeLabel: function(event) {
    var rangeVolN = event.srcElement
    var lblVolumeId = 'lblVolume'.concat(this.soundId)
    var lblVolumeN = document.getElementById(lblVolumeId)
    var newVol = rangeVolN.value
    if (newVol < 100) newVol = '0' + newVol
    if (newVol < 10) newVol = '0' + newVol
    lblVolumeN.innerText = newVol
  },

  // clear sound info (whilst loading, etc.)
  clearSoundInfo: function(sId) {
    var sndInfo = document.getElementById('soundInfo' + sId)
    sndInfo.innerHTML = ''
  },

  // updates info about the loaded sound (duration, channels, sample rate)
  updateSoundInfo: function(msg) {
    this.soundInfo.style.display = 'block'

    if (msg) {
      this.soundInfo.innerHTML = msg
    } else {
      var sndDuration = this.audioBuffer.duration

      sndDuration = sndDuration > 60 ? Math.round(sndDuration / 60) + 'm, ' : Math.round(sndDuration) + 's, '

      var sndSampleRate = this.audioBuffer.sampleRate / 1000
      var sndChannels = this.audioBuffer.numberOfChannels

      this.soundInfo.innerHTML = sndDuration + sndChannels + 'ch, ' + Math.round(sndSampleRate) + 'KHz'
    }
  },

  // updates the current sound status label (playing, paused, etc)
  updateSoundStatus: function(sId, status) {
    var curSoundStatusId = 'soundStatus'.concat(sId)
    var curSoundStatusN = document.getElementById(curSoundStatusId)
    curSoundStatusN.innerText = status

    if (status == AH_STATUS_PAUSED || status == AH_STATUS_STOPPED) {
      document.getElementById('sound' + sId).classList.remove('playing')
      document.getElementById('sound' + sId).classList.add('loaded')
    } else if (status == AH_STATUS_PLAYING) {
      document.getElementById('sound' + sId).classList.remove('loaded')
      document.getElementById('sound' + sId).classList.add('playing')
    } else if (status == AH_STATUS_LOADED) {
      document.getElementById('sound' + sId).classList.add('loaded')
    }
  },

  // load the sound into a buffer
  initSound: function(arrayBuffer, sId) {
    var that = this

    this.audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      that.audioBuffer = buffer

      var btnP = document.getElementById('btnPlay' + sId)
      var btnS = document.getElementById('btnStop' + sId)

      btnP.disabled = false
      btnS.disabled = false

      that.updateSoundStatus(sId, AH_STATUS_LOADED)
      that.updateSoundInfo()

      that.saveCache(buffer)
    }, function(e) {
      console.warn(AH_ERROR_DECODING, e)
    })
  },

  // set audioBuffer to null and turn off play/pause/stop controls
  disableSound: function(sId) {
    document.getElementById('sound' + sId).classList.remove('loaded')

    this.audioBuffer = null
    document.getElementById('btnPlay' + sId).disabled = true
    document.getElementById('btnStop' + sId).disabled = true
  },

  // play the sound from a specific startOffset
  playSound: function() {
    this.startTime = this.audioContext.currentTime

    if(!this.audioContext.createGain) {
      this.audioContext.createGain = this.audioContext.createGainNode
    }
    this.gainNode = this.audioContext.createGain()
    this.initVolumeToRangeVal(this.rngVolume)

    this.source = this.audioContext.createBufferSource()
    this.source.buffer = this.audioBuffer

    var sp = this

    this.source.onended = function() {
      var pauseOrStopStatus = sp.isPaused ? AH_STATUS_PAUSED : AH_STATUS_STOPPED

      if (pauseOrStopStatus == AH_STATUS_STOPPED) {
        sp.isStopped = true
        sp.isPaused = false
        sp.isPlaying = false
        sp.startOffset = 0
      }

      sp.updateSoundStatus(sp.soundId, pauseOrStopStatus)
    }

    this.source.connect(this.gainNode)
    this.gainNode.connect(this.audioContext.destination)
    this.source.loop = false

    this.source.start(0, this.startOffset % this.audioBuffer.duration)

    this.isStopped = false
    this.isPaused = false

    this.updateSoundStatus(this.soundId, AH_STATUS_PLAYING)
  },

  // pause the sound and record its currentTime
  pauseSound: function() {
    this.source.stop()
    this.isPaused = true
    this.startOffset += this.audioContext.currentTime - this.startTime

    this.updateSoundStatus(this.soundId, AH_STATUS_PAUSED)
  },

  // stop the sound and reset status variables
  stopSound: function() {
    this.startOffset = 0
    this.source.stop()
    this.isPlaying = false
    this.isPaused = false
    this.isStopped = true

    this.updateSoundStatus(this.soundId, AH_STATUS_STOPPED)
  },

  // when the play/pause button is pressed, toggle the current sound's status
  togglePlayState: function() {
    // if playing, pause and capture currentTime
    // if not, then play from startOffset
    if (this.isPlaying) {
      this.pauseSound(this)
    } else {
      this.playSound()
    }
    // flip playing mode status
    this.isPlaying = !this.isPlaying
  },

  // CREATE UI
  createSoundPlayerUI: function() {
    var divSoundPlayers = document.querySelector('#soundPlayers')

    this.createSoundDiv()
    this.createSoundHeader()
    this.createSoundDestroyer()
    this.createSoundStatus()
    this.createSoundInfo()
    this.createFileUpload()
    this.createRngVolume()
    this.createBtnPlay()
    this.createBtnStop()
    this.createInitVol()
    this.createLblVolume()

    divSoundPlayers.appendChild(this.soundDiv)
    this.soundDiv.appendChild(this.soundHeader)
    this.soundHeader.appendChild(this.soundDestroyer)
    this.soundDiv.appendChild(this.soundStatus)
    this.soundDiv.appendChild(this.soundInfo)
    this.soundDiv.appendChild(this.fileUpload)
    this.soundDiv.appendChild(this.rngVolume)
    this.soundDiv.appendChild(this.lblVolume)
    this.soundDiv.appendChild(this.btnPlay)
    this.soundDiv.appendChild(this.btnStop)
  },

  createSoundDiv: function() {
    var elem = document.createElement('div')
    elem.classList.add('sound')
    elem.id = 'sound' + this.soundId

    this.soundDiv = elem
  },
  createSoundHeader: function() {
    var elem = document.createElement('div')
    elem.classList.add('sound-header')
    elem.innerText = 'SoundPlayer ' + this.soundId

    this.soundHeader = elem
  },
  createSoundDestroyer: function() {
    var elem = document.createElement('div')
    var sId = this.soundId
    var elemId = `sound-destroyer${sId}`

    elem.id = elemId
    elem.title = `Destroy sound${sId}`
    elem.classList.add('sound-destroyer')
    elem.innerHTML = '<a href="#"><i class="fas fa-times"></i></a>'

    var sp = this

    elem.addEventListener('click', function() {
      AudioHash.removeSP(sp)
    })

    this.soundDestroyer = elem
  },
  createSoundStatus: function() {
    var elem = document.createElement('div')
    elem.id = 'soundStatus' + this.soundId
    elem.classList.add('sound-status')
    elem.innerText = AH_STATUS_UNLOADED

    this.soundStatus = elem
  },
  createSoundInfo: function() {
    var elem = document.createElement('div')
    elem.id = 'soundInfo' + this.soundId
    elem.classList.add('sound-info')
    elem.style.display = 'none'

    this.soundInfo = elem
  },
  createFileUpload: function() {
    var elem = document.createElement('input')
    elem.id = 'fileUpload' + this.soundId
    elem.type = 'file'
    elem.accept = 'audio/mp3, audio/wav'
    var that = this

    elem.addEventListener('change', function(e) {
      var reader = new FileReader()
      var sId = that.soundId
      that.clearSoundInfo(sId)

      reader.onloadstart = function() {
        that.updateSoundInfo(AH_STATUS_LOADING)
      }

      reader.onload = function() {
        if (this.result.byteLength > AH_FILE_MAX_LENGTH) {
          alert(AH_ERROR_LENGTH)
          that.disableSound(sId)
          this.abort()
        } else {
          that.initSound(this.result, sId)
        }
      }

      reader.onabort = function() {
        console.error('sound upload aborted')
      }

      if (e.srcElement.value != ''){
        reader.readAsArrayBuffer(this.files[0])
      } else {
        that.disableSound(sId)
      }
    }, false)

    this.fileUpload = elem
  },
  createRngVolume: function() {
    var elem = document.createElement('input')
    elem.id = 'rngVolume' + this.soundId
    elem.type = 'range'
    elem.min = 0
    elem.max = 100
    elem.value = 75

    var sp = this

    elem.addEventListener('input', function(event) {
      sp.changeVolume(event)
    })
    elem.addEventListener('change', function(event) {
      sp.updateVolumeLabel(event)
    })

    this.rngVolume = elem
  },
  createBtnPlay: function() {
    var elem = document.createElement('button')
    elem.id = 'btnPlay' + this.soundId
    elem.innerHTML = '<i class="fas fa-play"></i> <i class="fas fa-pause"></i>'
    elem.disabled = true

    var sp = this

    elem.addEventListener('click', function() {
      sp.togglePlayState()
    })

    this.btnPlay = elem
  },
  createBtnStop: function() {
    var elem = document.createElement('button')
    elem.id = 'btnStop' + this.soundId
    elem.innerHTML = '<i class="fas fa-stop"></i>'
    elem.disabled = true

    var sp = this

    elem.addEventListener('click', function() {
      sp.stopSound()
    })

    this.btnStop = elem
  },
  createInitVol: function() {
    var iv = this.rngVolume.value

    iv = iv < 100 ? '0' + iv : iv
    iv = iv < 10 ? '0' + iv : iv

    this.initVol = iv
  },
  createLblVolume: function() {
    var elem = document.createElement('label')
    elem.id = 'lblVolume' + this.soundId
    elem.innerText = this.initVol

    this.lblVolume = elem
  },

  loadCache: function(url) {
    const cacheStorage = await caches.open(AH_CACHE_AUDIO_KEY);
    const cachedResponse = await cacheStorage.match(url);

    if (!cachedResponse || !cachedResponse.ok) {
      return false
    }

    return await cachedResponse.arrayBuffer();
  },
  saveCache: async function(file) {
    await caches.open(AH_CACHE_AUDIO_KEY).then(cache => {
      cache.add(file)
    })
  }
}
