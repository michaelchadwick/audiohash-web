/* sp */
/* custom class for soundplayers */

class SoundPlayer {
  constructor(id, ac) {
    this.soundId = id
    this.audioContext = ac

    this.dom = {}
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

  /************************************************************************
  * public methods *
  ************************************************************************/

  createSoundPlayerUI() {
    this.dom.soundDiv = document.createElement('div')
    this.dom.soundDiv.classList.add('sound')
    this.dom.soundDiv.id = 'sound' + this.soundId

      this.dom.soundHeader = document.createElement('div')
      this.dom.soundHeader.classList.add('sound-header')
      this.dom.soundHeader.innerText = 'SoundPlayer ' + this.soundId

        this.dom.soundDestroyer = this._createSoundDestroyer()
        this.dom.soundHeader.appendChild(this.dom.soundDestroyer)

      this.dom.soundStatus = document.createElement('div')
      this.dom.soundStatus.id = 'soundStatus' + this.soundId
      this.dom.soundStatus.classList.add('sound-status')
      this.dom.soundStatus.innerText = AH_STATUS_UNLOADED

      this.dom.soundInfo = document.createElement('div')
      this.dom.soundInfo.id = 'soundInfo' + this.soundId
      this.dom.soundInfo.classList.add('sound-info')
      this.dom.soundInfo.style.display = 'none'

      this.dom.fileUpload = this._createFileUpload()
      this.dom.rngVolume = this._createRngVolume()

      this.dom.lblVolume = document.createElement('label')
      this.dom.lblVolume.id = 'lblVolume' + this.soundId
      this.dom.lblVolume.innerText = this.initVol

      this.dom.btnPlay = this._createBtnPlay()
      this.dom.btnStop = this._createBtnStop()

      this.dom.soundDiv.appendChild(this.dom.soundHeader)
      this.dom.soundDiv.appendChild(this.dom.soundStatus)
      this.dom.soundDiv.appendChild(this.dom.soundInfo)
      this.dom.soundDiv.appendChild(this.dom.fileUpload)
      this.dom.soundDiv.appendChild(this.dom.rngVolume)
      this.dom.soundDiv.appendChild(this.dom.lblVolume)
      this.dom.soundDiv.appendChild(this.dom.btnPlay)
      this.dom.soundDiv.appendChild(this.dom.btnStop)

    AudioHash.dom.soundPlayers.appendChild(this.dom.soundDiv)
  }

  initVolumeToRangeVal(el) {
    var volume = el.value
    var volumeMax = el.max
    var fraction = parseInt(volume) / parseInt(volumeMax)
    var gainVal = fraction * fraction

    this.gainNode.gain.value = gainVal
  }

  // change the internal gain node value
  changeVolume(event) {
    var volume = event.srcElement.value
    var volumeMax = event.srcElement.max
    var fraction = parseInt(volume) / parseInt(volumeMax)
    var gainVal = fraction * fraction

    this.gainNode.gain.value = gainVal
  }

  updateVolumeLabel(event) {
    var rangeVolN = event.srcElement
    var lblVolumeId = 'lblVolume'.concat(this.soundId)
    var lblVolumeN = document.getElementById(lblVolumeId)
    var newVol = rangeVolN.value

    if (newVol < 100) newVol = '0' + newVol
    if (newVol < 10) newVol = '0' + newVol

    lblVolumeN.innerText = newVol
  }

  // clear sound info (whilst loading, etc.)
  clearSoundInfo(sId) {
    document.getElementById('soundInfo' + sId).innerHTML = ''
  }

  // updates info about the loaded sound (duration, channels, sample rate)
  updateSoundInfo(msg) {
    this.dom.soundInfo.style.display = 'block'

    if (msg) {
      this.dom.soundInfo.innerHTML = msg
    } else {
      var sndDuration = this.audioBuffer.duration

      sndDuration = sndDuration > 60 ? Math.round(sndDuration / 60) + 'm, ' : Math.round(sndDuration) + 's, '

      var sndSampleRate = this.audioBuffer.sampleRate / 1000
      var sndChannels = this.audioBuffer.numberOfChannels

      this.dom.soundInfo.innerHTML = sndDuration + sndChannels + 'ch, ' + Math.round(sndSampleRate) + 'KHz'
    }
  }

  // updates the current sound status label (playing, paused, etc)
  updateSoundStatus(sId, status) {
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
  }

  // load the sound into a buffer
  initSound(arrayBuffer, sId) {
    var that = this

    console.log('initSound arrayBuffer', arrayBuffer)

    this.audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      that.audioBuffer = buffer

      var btnP = document.getElementById('btnPlay' + sId)
      var btnS = document.getElementById('btnStop' + sId)

      btnP.disabled = false
      btnS.disabled = false

      that.updateSoundStatus(sId, AH_STATUS_LOADED)
      that.updateSoundInfo()
    }, function(e) {
      console.warn(AH_ERROR_DECODING, e)
    })
  }

  // set audioBuffer to null and turn off play/pause/stop controls
  disableSound(sId) {
    document.getElementById('sound' + sId).classList.remove('loaded')

    this.audioBuffer = null

    document.getElementById('btnPlay' + sId).disabled = true
    document.getElementById('btnStop' + sId).disabled = true
  }

  // play the sound from a specific startOffset
  playSound() {
    this.startTime = this.audioContext.currentTime

    if(!this.audioContext.createGain) {
      this.audioContext.createGain = this.audioContext.createGainNode
    }

    this.gainNode = this.audioContext.createGain()
    this.initVolumeToRangeVal(this.dom.rngVolume)

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
  }

  // pause the sound and record its currentTime
  pauseSound() {
    this.source.stop()
    this.isPaused = true
    this.startOffset += this.audioContext.currentTime - this.startTime

    this.updateSoundStatus(this.soundId, AH_STATUS_PAUSED)
  }

  // stop the sound and reset status variables
  stopSound() {
    this.startOffset = 0
    this.source.stop()
    this.isPlaying = false
    this.isPaused = false
    this.isStopped = true

    this.updateSoundStatus(this.soundId, AH_STATUS_STOPPED)
  }

  // when the play/pause button is pressed, toggle the current sound's status
  togglePlayState() {
    // if playing, pause and capture currentTime
    // if not, then play from startOffset
    if (this.isPlaying) {
      this.pauseSound(this)
    } else {
      this.playSound()
    }

    this.isPlaying = !this.isPlaying
  }

  /************************************************************************
  * _private methods *
  ************************************************************************/

  _createSoundDestroyer() {
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

    return elem
  }

  _createFileUpload() {
    var elem = document.createElement('input')
    var that = this

    elem.id = 'fileUpload' + this.soundId
    elem.type = 'file'
    elem.accept = 'audio/mp3, audio/wav'

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
          const buf = this.result

          console.log('reader.onload buf', typeof buf, buf)

          // that._saveToIDB(buf, sId)

          that.initSound(buf, sId)
        }
      }

      reader.onabort = function() {
        console.error('sound upload aborted')
      }

      if (e.target.value != ''){
        reader.readAsArrayBuffer(this.files[0])
      } else {
        that.disableSound(sId)
      }
    }, false)

    return elem
  }

  _createRngVolume() {
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

    // create this.initVol
    let iv = elem.value

    iv = iv < 100 ? '0' + iv : iv
    iv = iv < 10 ? '0' + iv : iv

    this.initVol = iv

    return elem
  }

  _createBtnPlay() {
    var elem = document.createElement('button')

    elem.id = 'btnPlay' + this.soundId
    elem.innerHTML = '<i class="fas fa-play"></i> <i class="fas fa-pause"></i>'
    elem.disabled = true

    var sp = this

    elem.addEventListener('click', function() {
      sp.togglePlayState()
    })

    return elem
  }

  _createBtnStop() {
    var elem = document.createElement('button')

    elem.id = 'btnStop' + this.soundId
    elem.innerHTML = '<i class="fas fa-stop"></i>'
    elem.disabled = true

    var sp = this

    elem.addEventListener('click', function() {
      sp.stopSound()
    })

    return elem
  }

  // TODO
  _saveToIDB(buf, id) {
    const request = indexedDB.open(AH_DB_NAME, 1)

    // buffer is 0 at this point?!?
    console.log('_saveToIDB buf', typeof this.buf, this.buf)

    request.onsuccess = () => {
      console.log('indexedDB opened successfully')

      const db = request.result

      const transaction = db.transaction([AH_DB_STORE], 'readwrite')

      const store = transaction.objectStore(AH_DB_STORE)

      console.log('_saveToIDB request.onsuccess buf', typeof this.buf, this.buf)

      store.put({ id: id, sound: buf })
      store.put({ id: 4, sound: "foo" })
      store.put({ id: 5, sound: "bar" })
      store.put({ id: 6, sound: "baz" })

      const query = store.get(1)

      query.onsuccess = () => {
        console.log('query', query.result)
      }

      transaction.oncomplete = () => {
        console.log('transaction complete')
        db.close()
      }
    };

    request.onerror = e => {
      console.error(`connect error: ${ e.target.errorCode }`);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      const store = db.createObjectStore(AH_DB_STORE, { keyPath: "id" })
    }
  }

  // TODO
  async _loadFromIDB(id) {}
}
