/* soundplayer */
/* custom class for soundplayers */

class SoundPlayer {
  constructor(id, ac) {
    this.soundId = id
    this.audioContext = ac

    this.dom = {}
    this.arrayBuffer = null
    this.audioBuffer = null
    this.gainNode = this.audioContext.createGain()
    this.snippet = 0
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

        this.dom.soundHeaderTitle = document.createElement('span')
        this.dom.soundHeaderTitle.classList.add('sound-header-title')
        this.dom.soundHeaderTitle.innerText = 'SoundPlayer ' + this.soundId

        this.dom.btnPlay = this._createBtnPlay()
        this.dom.btnStop = this._createBtnStop()

        this.dom.soundDestroyer = this._createSoundDestroyer()

        this.dom.soundHeader.appendChild(this.dom.soundHeaderTitle)
        this.dom.soundHeader.appendChild(this.dom.btnPlay)
        this.dom.soundHeader.appendChild(this.dom.btnStop)
        this.dom.soundHeader.appendChild(this.dom.soundDestroyer)

      this.dom.soundStatus = document.createElement('div')
      this.dom.soundStatus.id = 'soundStatus' + this.soundId
      this.dom.soundStatus.classList.add('sound-status')
      this.dom.soundStatus.innerText = AH_STATUS_UNLOADED

      this.dom.soundInfo = document.createElement('div')
      this.dom.soundInfo.id = 'soundInfo' + this.soundId
      this.dom.soundInfo.classList.add('sound-info')
      this.dom.soundInfo.innerText = AH_INFO_UNLOADED

      this.dom.fileUpload = this._createFileUpload()

      this.dom.lblPreRngVolume = document.createElement('span')
      this.dom.lblPreRngVolume.classList.add('control-label')
      this.dom.lblPreRngVolume.innerText = 'Volume Amt (%)'

      this.dom.rngVolume = this._createRngVolume()

      this.dom.lblPostRngVolume = document.createElement('label')
      this.dom.lblPostRngVolume.classList.add('amount-label')
      this.dom.lblPostRngVolume.id = 'lblPostRngVolume' + this.soundId
      this.dom.lblPostRngVolume.innerText = this.initVol

      this.dom.lblPreRngSnippet = document.createElement('span')
      this.dom.lblPreRngSnippet.classList.add('control-label')
      this.dom.lblPreRngSnippet.innerText = 'Snippet Amt (s)'

      this.dom.rngSnippet = this._createRngSnippet()

      this.dom.lblPostRngSnippet = document.createElement('label')
      this.dom.lblPostRngSnippet.classList.add('amount-label')
      this.dom.lblPostRngSnippet.id = 'lblPostRngSnippet' + this.soundId
      this.dom.lblPostRngSnippet.innerText = this.initSnip

      this.dom.soundDiv.appendChild(this.dom.soundHeader)
      this.dom.soundDiv.appendChild(this.dom.soundStatus)
      this.dom.soundDiv.appendChild(this.dom.soundInfo)

      this.dom.soundDiv.appendChild(this.dom.fileUpload)

      this.dom.soundDiv.appendChild(this.dom.lblPreRngVolume)
      this.dom.soundDiv.appendChild(this.dom.rngVolume)
      this.dom.soundDiv.appendChild(this.dom.lblPostRngVolume)

      this.dom.soundDiv.appendChild(this.dom.lblPreRngSnippet)
      this.dom.soundDiv.appendChild(this.dom.rngSnippet)
      this.dom.soundDiv.appendChild(this.dom.lblPostRngSnippet)

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
  updateVolume(event) {
    var volume = event.srcElement.value
    var volumeMax = event.srcElement.max
    var fraction = parseInt(volume) / parseInt(volumeMax)
    var gainVal = fraction * fraction

    this.gainNode.gain.value = gainVal
  }

  updateVolumeLabel(event) {
    var rangeVolN = event.srcElement
    var lblVolumeId = 'lblPostRngVolume'.concat(this.soundId)
    var lblVolumeN = document.getElementById(lblVolumeId)
    var newVol = rangeVolN.value

    if (newVol < 100) newVol = '0' + newVol
    if (newVol < 10) newVol = '0' + newVol

    lblVolumeN.innerText = newVol
  }

  // change the snippet value
  updateSnippet(event) {
    var snippet = event.srcElement.value
    var snippetMax = event.srcElement.max
    var fraction = parseInt(snippet) / parseInt(snippetMax)
    var snippetVal = fraction * fraction

    this.snippet = snippetVal
  }

  updateSnippetLabel(event) {
    var rangeSnipN = event.srcElement
    var lblSnipId = 'lblPostRngSnippet'.concat(this.soundId)
    var lblSnipN = document.getElementById(lblSnipId)
    var newSnip = rangeSnipN.value

    if (newSnip < 100) newSnip = '0' + newSnip
    if (newSnip < 10) newSnip = '0' + newSnip

    lblSnipN.innerText = newSnip
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
  initSound(arrayBuffer, arrBytesWav, sId) {
    var sound = this

    sound.arrayBuffer = arrBytesWav

    this.audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      sound.audioBuffer = buffer

      // enabled the play/pause and stop buttons
      document.getElementById('btnPlay' + sId).disabled = false
      document.getElementById('btnStop' + sId).disabled = false

      // update snippet range so it's 1/sound.length -> sound.length
      const newMax = Math.floor(buffer.duration)
      const newVal = Math.round(Math.floor(buffer.duration) * .2)

      document.getElementById('rngSnippet' + sId).max = newMax
      document.getElementById('rngSnippet' + sId).value = newVal

      let newLblVal = newVal < 100 ? '0' + newVal : newVal
      newLblVal = newLblVal < 10 ? '0' + newLblVal : newLblVal

      document.getElementById('lblPostRngSnippet' + sId).innerText = newLblVal

      sound.updateSoundStatus(sId, AH_STATUS_LOADED)
      sound.updateSoundInfo()

      // if we now have at least 2 SoundPlayers with audioBuffers
      // then enable the "MAKE HASH" button
      if (AudioHash._getSPCount() >= 2 && !AudioHash._areSPBuffersEmpty()) {
        AudioHash.dom.interactive.btnCreateAH.removeAttribute('disabled')
      }
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
    elem.accept = 'audio/wav'

    elem.addEventListener('change', function(e) {
      var reader = new FileReader()
      var sId = that.soundId

      that.clearSoundInfo(sId)

      reader.onabort = (e) => { console.error('FileReader read aborted', e) }

      reader.onerror = (e) => { console.error('FileReader read error', e) }

      reader.onloadstart = (e) => {
        // console.log('FileReader read started', e)

        that.updateSoundInfo(AH_STATUS_LOADING)
      }

      reader.onloadend = (e) => {
        // console.log('FileReader read ended', e)
      }

      // finished loading successfully
      reader.onload = function() {
        // console.log('FileReader read success', this.result)

        if (this.result.byteLength > AH_FILE_MAX_LENGTH) {
          alert(AH_ERROR_LENGTH)

          that.disableSound(sId)

          this.abort()
        } else {
          const buf = this.result
          const blob = new Blob([this.result], { type: 'audio/wav; codecs=MS_PCM' })

          // console.log('FileReader read arrayBuffer:', buf)

          const promise = new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onerror = (error) => { reject(error) }

            reader.onload = async () => {
              try {
                // const response = arrBytesWav.push(reader.result)
                // console.log('arrBytesWav', arrBytesWav)

                const arrBytesWav = reader.result

                // that._saveToIDB(buf, sId)

                that.initSound(buf, arrBytesWav, sId)

                resolve(arrBytesWav)
              } catch (err) {
                reject(err)
              }
            }

            reader.readAsArrayBuffer(blob)
          })
        }
      }

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          console.log(`FileReader progress: ${e.loaded} / ${e.total}`)
        }
      }

      if (e.target.value != '') {
        console.log('this.files[0]', this.files[0])

        reader.readAsArrayBuffer(this.files[0])
      } else {
        that.disableSound(sId)
      }
    }, false)

    return elem
  }

  _createRngVolume() {
    var elem = document.createElement('input')

    elem.classList.add('volume')
    elem.id = 'rngVolume' + this.soundId
    elem.type = 'range'
    elem.min = 0
    elem.max = 100
    elem.value = 75

    var sp = this

    elem.addEventListener('input', function(event) {
      sp.updateVolume(event)
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

  // create an <input type="range">
  // controls amount, in seconds, of file to use in hash
  // will be updated upon file upload
  _createRngSnippet() {
    var elem = document.createElement('input')

    elem.classList.add('snippet')
    elem.id = 'rngSnippet' + this.soundId
    elem.type = 'range'
    elem.min = 1
    elem.max = 60
    elem.value = 5

    var sp = this

    elem.addEventListener('input', function(event) {
      sp.updateSnippet(event)
    })
    elem.addEventListener('change', function(event) {
      sp.updateSnippetLabel(event)
    })

    // create this.initSnip
    let initSnip = elem.value

    initSnip = initSnip < 100 ? '0' + initSnip : initSnip
    initSnip = initSnip < 10 ? '0' + initSnip : initSnip

    this.initSnip = initSnip

    return elem
  }

  // TODO
  _saveToIDB(buf, id) {
    const request = indexedDB.open(AH_DB_NAME, 1)

    console.log('_saveToIDB buf:', buf)

    var that = this

    request.addEventListener('success', that._handleFileUpload.bind(null, request, id, buf))

    request.onerror = e => {
      console.error(`IndexedDB request.onerror: ${ e.target.errorCode }`)
    }

    request.onupgradeneeded = (e) => {
      console.log('IndexedDB request.onupgradeneeded:', e)

      const db = request.result

      let objectStore = db.createObjectStore(AH_DB_STORE, { keyPath: "id" })

      objectStore.createIndex("id", "id", { unique: true })
    }
  }

  _handleFileUpload(request, id, buf) {
    console.log('indexedDB opened successfully')
    console.log(request, id, buf)

    const db = request.result

    const transaction = db.transaction([AH_DB_STORE], 'readwrite')

    transaction.oncomplete = (e) => {
      console.log('transaction complete', e)
    }

    transaction.onerror = (e) => {
      console.error('transaction failed', e)
    }

    const objectStore = transaction.objectStore(AH_DB_STORE)

    console.log('_saveToIDB request.onsuccess buf:', buf)

    const objectStoreRequest = objectStore.put({ "id": id, "sound": buf })

    objectStoreRequest.onsuccess = (e) => {
      console.log('objectStoreRequest.onsuccess:', e)
    }

    objectStoreRequest.onerror = (e) => {
      console.log('objectStoreRequest.onerror:', e)
    }

    const query = objectStore.get(1)

    query.onsuccess = () => {
      console.log('query.onsuccess:', query.result)
    }

    query.onerror = (e) => {
      console.log('query.onerror:', e)
    }
  }

  // TODO
  async _loadFromIDB(id) {}
}
