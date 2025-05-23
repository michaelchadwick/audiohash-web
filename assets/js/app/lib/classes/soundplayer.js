/* Soundplayer class */

class SoundPlayer {
  constructor(id, ac, file = null) {
    this.soundId = id
    this.audioContext = ac

    this.dom = {}
    this.arrayBuffer = null
    this.audioBuffer = null
    this.gainNode = this.audioContext.createGain()
    this.snippetSeconds = 0
    this.source = null
    this.startTime = 0
    this.startOffset = 0
    this.isLoaded = false
    this.isPaused = false
    this.isStopped = true
    this.isPlaying = false

    this.createUI(file)
  }

  /************************************************************************
   * public methods *
   ************************************************************************/

  createUI() {
    this.dom.soundDiv = document.createElement('div')
    this.dom.soundDiv.classList.add('sound')
    this.dom.soundDiv.classList.add('dropbox')
    this.dom.soundDiv.id = 'sound' + this.soundId

    const eventOptions = {
      once: false,
    }

    this.dom.soundDiv.addEventListener(
      'dragenter',
      this.__onDragEnter,
      eventOptions
    )
    this.dom.soundDiv.addEventListener(
      'dragleave',
      this.__onDragLeave,
      eventOptions
    )
    this.dom.soundDiv.addEventListener(
      'dragover',
      this.__onDragOver,
      eventOptions
    )
    this.dom.soundDiv.addEventListener('drop', this._onDrop, false)

    this.dom.soundOverlay = document.createElement('div')
    this.dom.soundOverlay.id = 'soundOverlay' + this.soundId
    this.dom.soundOverlay.classList.add('sound-overlay')
    this.dom.soundOverlay.innerHTML =
      '<p>Drop an audio file on me to upload</p>'
    this.dom.soundDiv.appendChild(this.dom.soundOverlay)

    this.dom.soundHeader = document.createElement('div')
    this.dom.soundHeader.id = 'soundHeader' + this.soundId
    this.dom.soundHeader.classList.add('sound-header')

    this.dom.soundHeaderTitle = document.createElement('span')
    this.dom.soundHeaderTitle.classList.add('sound-header-title')

    const headerTitleUserDisplay = `SoundPlayer ${parseInt(this.soundId + 1)
      .toString()
      .padStart(2, '0')}`

    this.dom.soundHeaderTitle.innerText = headerTitleUserDisplay

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

    // TODO: add progress bars to each SoundPlayer

    this.dom.fileUploadRow = document.createElement('div')
    this.dom.fileUploadRow.id = 'soundUpload' + this.soundId
    this.dom.fileUploadRow.classList.add('sound-upload')

    this.dom.fileUpload = this._createFileUpload()

    this.dom.fileUploadRow.appendChild(this.dom.fileUpload)

    this.dom.soundVolumeRow = document.createElement('div')
    this.dom.soundVolumeRow.id = 'soundVolumeRow' + this.soundId
    this.dom.soundVolumeRow.classList.add('sound-volume-row')

    this.dom.lblPreRngVolume = document.createElement('span')
    this.dom.lblPreRngVolume.classList.add('control-label')
    this.dom.lblPreRngVolume.innerText = 'Volume Amt (%)'

    this.dom.rngVolume = this._createRngVolume()

    this.dom.lblPostRngVolume = document.createElement('label')
    this.dom.lblPostRngVolume.classList.add('amount-label')
    this.dom.lblPostRngVolume.id = 'lblPostRngVolume' + this.soundId
    this.dom.lblPostRngVolume.innerText = this.initVol

    this.dom.soundVolumeRow.appendChild(this.dom.lblPreRngVolume)
    this.dom.soundVolumeRow.appendChild(this.dom.rngVolume)
    this.dom.soundVolumeRow.appendChild(this.dom.lblPostRngVolume)

    this.dom.soundSnippetRow = document.createElement('div')
    this.dom.soundSnippetRow.id = 'soundSnippetRow' + this.soundId
    this.dom.soundSnippetRow.classList.add('sound-snippet-row')

    this.dom.lblPreRngSnippet = document.createElement('span')
    this.dom.lblPreRngSnippet.classList.add('control-label')
    this.dom.lblPreRngSnippet.innerText = 'Snippet Amt (s)'

    this.dom.rngSnippet = this._createRngSnippet()

    this.dom.lblPostRngSnippet = document.createElement('label')
    this.dom.lblPostRngSnippet.classList.add('amount-label')
    this.dom.lblPostRngSnippet.id = 'lblPostRngSnippet' + this.soundId
    this.dom.lblPostRngSnippet.innerText = this.initSnip

    this.dom.soundSnippetRow.appendChild(this.dom.lblPreRngSnippet)
    this.dom.soundSnippetRow.appendChild(this.dom.rngSnippet)
    this.dom.soundSnippetRow.appendChild(this.dom.lblPostRngSnippet)

    this.dom.soundDiv.appendChild(this.dom.soundHeader)
    this.dom.soundDiv.appendChild(this.dom.soundStatus)
    this.dom.soundDiv.appendChild(this.dom.soundInfo)

    this.dom.soundDiv.appendChild(this.dom.fileUploadRow)
    this.dom.soundDiv.appendChild(this.dom.soundVolumeRow)
    this.dom.soundDiv.appendChild(this.dom.soundSnippetRow)

    AudioHash.dom.players.appendChild(this.dom.soundDiv)
  }

  initVolumeToRangeVal(el) {
    var volume = el.value
    var volumeMax = el.max
    var fraction = parseInt(volume) / parseInt(volumeMax)
    var gainVal = fraction * fraction

    this.gainNode.gain.value = gainVal
  }

  // updates info about the loaded sound (duration, channels, sample rate)
  updateSoundInfo(msg = null) {
    // console.log('updateSoundInfo', msg)

    this.dom.soundInfo.style.display = 'block'

    if (msg) {
      this.dom.soundInfo.innerHTML = msg
    } else {
      let sndDuration = this._convertToHMS(this.audioBuffer.duration)
      let sndChannels = this.audioBuffer.numberOfChannels + 'ch'
      let sndSampleRate =
        Math.round(this.audioBuffer.sampleRate / 1000).toString() + 'KHz'

      this.dom.soundInfo.innerHTML = `${sndDuration},  ${sndChannels}, ${sndSampleRate}`
    }
  }

  // updates the current sound status label (playing, paused, etc)
  updateSoundStatus(sId, status) {
    // console.log('updateSoundStatus', sId, status)

    const curSoundStatusId = 'soundStatus'.concat(sId)
    const curSoundStatusN = document.getElementById(curSoundStatusId)
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
    const sound = this

    sound.arrayBuffer = arrBytesWav

    this.audioContext.decodeAudioData(
      arrayBuffer,
      function (buffer) {
        sound.audioBuffer = buffer

        // enabled the play/pause and stop buttons
        document.getElementById('btnPlay' + sId).disabled = false
        document.getElementById('btnStop' + sId).disabled = false

        // update snippet range so it's 1/sound.length -> sound.length
        const newSnippetMax = Math.floor(buffer.duration)
        const newSnippetVal = Math.round(Math.floor(buffer.duration) * 0.2)

        const rngSnippetN = document.getElementById('rngSnippet' + sId)
        rngSnippetN.disabled = false
        rngSnippetN.max = newSnippetMax
        rngSnippetN.value = newSnippetVal

        let newLblVal =
          newSnippetVal < 100 ? '0' + newSnippetVal : newSnippetVal
        newLblVal = newLblVal < 10 ? '0' + newLblVal : newLblVal

        document.getElementById('lblPostRngSnippet' + sId).innerText = newLblVal

        sound.updateSoundStatus(sId, AH_STATUS_LOADED)
        sound.updateSoundInfo()

        sound.snippetSeconds = newSnippetVal

        sound.isLoaded = true

        // if we now have at least 2 SoundPlayers with audioBuffers
        // then enable the "MAKE HASH" button
        if (AudioHash._getSPCount() >= 2 && !AudioHash._areSPBuffersEmpty()) {
          AudioHash.dom.interactive.btnCreateAH.removeAttribute('disabled')
        }
      },
      function (e) {
        console.warn(AH_ERROR_DECODING, e)
      }
    )
  }

  // set audioBuffer to null and turn off play/pause/stop controls
  disableSound(sId) {
    document.getElementById('sound' + sId).classList.remove('loaded')

    // turn off interactive buttons
    document.getElementById('btnPlay' + sId).disabled = true
    document.getElementById('btnStop' + sId).disabled = true

    // reset sound info
    document.getElementById('soundInfo' + sId).innerHTML = 'N/A'

    // clear SoundPlayer buffer
    this.audioBuffer = null

    // clear file upload
    document.getElementById('fileUpload' + sId).value = ''
  }

  // play the sound from a specific startOffset
  playSound() {
    this.startTime = this.audioContext.currentTime

    if (!this.audioContext.createGain) {
      this.audioContext.createGain = this.audioContext.createGainNode
    }

    this.gainNode = this.audioContext.createGain()
    this.initVolumeToRangeVal(this.dom.rngVolume)

    this.source = this.audioContext.createBufferSource()
    this.source.buffer = this.audioBuffer

    var sp = this

    this.source.onended = function () {
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

    elem.addEventListener('click', function () {
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

    elem.addEventListener('click', function () {
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

    elem.addEventListener('click', function () {
      AudioHash.removeSP(sp)
    })

    return elem
  }

  _createFileUpload() {
    const form = document.createElement('form')
    const sp = this

    form.id = 'formUpload' + sp.soundId

    const fileUpload = document.createElement('input')
    const that = sp

    fileUpload.accept = AH_ALLOWED_FORMATS.join(', ')
    fileUpload.id = 'fileUpload' + sp.soundId
    fileUpload.name = 'fileUpload' + sp.soundId
    fileUpload.type = 'file'

    fileUpload.addEventListener(
      'change',
      function (e) {
        // console.log('fileUpload changed', e)

        const sp = that
        const sId = sp.soundId
        const file = this.files[0]

        // if a file has been selected, create FileReader object; load file
        if (e.target.value != '') {
          const fileReader = new FileReader()
          fileReader.readAsArrayBuffer(file)

          // file read starts
          fileReader.onloadstart = (e) => {
            // console.log('FileReader onloadstart', e)

            sp.updateSoundInfo(AH_STATUS_LOADING)

            // check for valid filesize before uploading
            if (e.total > AH_FILE_MAX_LENGTH) {
              sp.disableSound(sId)

              e.target.abort()

              alert(AH_ERROR_LENGTH)
            } else {
              // TODO: fix server-side conversion of * -> wav
              // if (file.name.split('.')[1].toLowerCase() != 'wav') {
              //   console.log('uploaded a non-wav')
              //   // const path = (window.URL || window.webkitURL).createObjectURL(file);
              //   const form = new FormData()
              //   form.append('fileUpload', this.files[0])
              //   console.log('form', form)
              //   const url = AH_CONVERT_TO_WAV_SCRIPT
              //   const request = new Request(url, {
              //     method: 'POST',
              //     body: form
              //   })
              //   fetch(request)
              //     .then(response => {
              //       if (response) {
              //         console.log('script sent response', response)
              //         return response.json()
              //       } else {
              //         console.error('script did not send response')
              //         return null
              //       }
              //     })
              //     .then(data => {
              //       if (data) {
              //         console.log('response sent data', data)
              //       } else {
              //         console.error('response did not send data')
              //       }
              //     })
              // }
            }
          }

          // file read progressing, with potential updated status
          fileReader.onprogress = (e) => {
            if (e.lengthComputable) {
              // console.log(`FileReader progress: ${e.loaded} / ${e.total}`)
            }
          }

          // file read completed successfully
          fileReader.onload = function (e) {
            // console.log('FileReader onload', e)

            const uploadedFile = this.result

            // check for invalid file size after uploading
            if (uploadedFile.byteLength > AH_FILE_MAX_LENGTH) {
              alert(AH_ERROR_LENGTH)

              sp.disableSound(sId)
            }
            // if file size is good, proceed
            else {
              const buffer = uploadedFile
              const blob = new Blob([buffer], {
                type: 'audio/wav; codecs=MS_PCM',
              })

              const promise = new Promise((resolve, reject) => {
                const fileReader = new FileReader()

                fileReader.onerror = (error) => {
                  reject(error)
                }

                fileReader.onload = async () => {
                  try {
                    const arrBytesWav = fileReader.result

                    sp.initSound(buffer, arrBytesWav, sId)

                    resolve(arrBytesWav)
                  } catch (err) {
                    reject(err)
                  }
                }

                fileReader.readAsArrayBuffer(blob)
              })
            }
          }

          // file read completed, success or failure
          fileReader.onloadend = (e) => {
            // console.log('FileReader onloadend', e)
          }
          // file read aborted (manually)
          fileReader.onabort = (e) => {
            console.error('FileReader onabort', e)
          }
          // file read error (automatically)
          fileReader.onerror = (e) => {
            console.error('FileReader onerror', e)
          }
        }
      },
      false
    )

    form.appendChild(fileUpload)

    return form
  }

  _createRngVolume() {
    const sp = this
    const elem = document.createElement('input')

    elem.classList.add('volume')
    elem.id = 'rngVolume' + this.soundId
    elem.type = 'range'
    elem.min = 0
    elem.max = 100
    elem.value = 75

    // user moves the input slider indicator
    elem.addEventListener('input', function (event) {
      // console.log('volume range input', event.target.value)

      // set user-facing label

      let newVolValue = event.target.value

      if (newVolValue < 100) newVolValue = '0' + newVolValue
      if (newVolValue < 10) newVolValue = '0' + newVolValue

      document.getElementById('lblPostRngVolume'.concat(sp.soundId)).innerText =
        newVolValue

      // set soundplayer internal gain amount

      const volumeMax = event.target.max
      const fraction = parseInt(newVolValue) / parseInt(volumeMax)
      const newGainValue = fraction * fraction

      sp.gainNode.gain.value = newGainValue
    })
    // slider value changes
    elem.addEventListener('change', function (event) {
      // console.log('volume range change', event.target.value)

      let newVolValue = event.target.value

      if (newVolValue < 100) newVolValue = '0' + newVolValue
      if (newVolValue < 10) newVolValue = '0' + newVolValue

      document.getElementById('lblPostRngVolume'.concat(sp.soundId)).innerText =
        newVolValue
    })

    // create this.initVol
    let initVol = elem.value

    initVol = initVol < 100 ? '0' + initVol : initVol
    initVol = initVol < 10 ? '0' + initVol : initVol

    sp.initVol = initVol

    return elem
  }

  _createRngSnippet() {
    const sp = this
    const elem = document.createElement('input')

    elem.classList.add('snippet')
    elem.id = 'rngSnippet' + this.soundId
    elem.type = 'range'
    elem.min = 1
    elem.max = 60
    elem.step = 1
    elem.value = 5
    elem.disabled = true

    // user moves the input slider indicator
    elem.addEventListener('input', function (event) {
      // console.log('snippet range input', event.target.value)

      // set user-facing label

      let newSnipValue = event.target.value

      if (newSnipValue < 100) newSnipValue = '0' + newSnipValue
      if (newSnipValue < 10) newSnipValue = '0' + newSnipValue

      document.getElementById(
        'lblPostRngSnippet'.concat(sp.soundId)
      ).innerText = newSnipValue

      // set soundplayer internal snipper amount

      sp.snippetSeconds = parseInt(newSnipValue)
    })
    // slider value changes
    elem.addEventListener('change', function (event) {
      // console.log('snippet range change', event.target.value)

      let newSnipValue = event.target.value

      if (newSnipValue < 100) newSnipValue = '0' + newSnipValue
      if (newSnipValue < 10) newSnipValue = '0' + newSnipValue

      document.getElementById(
        'lblPostRngSnippet'.concat(sp.soundId)
      ).innerText = newSnipValue
    })

    // create this.initSnip
    let initSnip = elem.value

    initSnip = initSnip < 100 ? '0' + initSnip : initSnip
    initSnip = initSnip < 10 ? '0' + initSnip : initSnip

    sp.initSnip = initSnip

    return elem
  }

  _convertToHMS(durationInSeconds) {
    let seconds = Math.round(durationInSeconds)

    let minutes = (seconds - (seconds % 60)) / 60
    seconds = seconds - minutes * 60
    seconds = seconds.toString().padStart(2, '0')

    let hours = (minutes - (minutes % 60)) / 60
    minutes = minutes - hours * 60
    minutes = minutes.toString().padStart(2, '0')

    if (hours > 0) {
      hours = hours.toString().padStart(2, '0')

      return `${hours}:${minutes}:${seconds}`
    } else {
      return `${minutes}:${seconds}`
    }
  }

  /************************************************************************
   * _private __helper methods *
   ************************************************************************/

  __handleDroppedFiles(files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (!file.type.startsWith('audio/')) {
        console.error('Only audio files can be dropped here!')
      } else {
        AudioHash._logStatus('audio files dropped')
      }
    }
  }

  __onDrop(e) {
    e.stopPropagation()
    e.preventDefault()

    const dt = e.dataTransfer
    const files = dt.files

    this.__handleDroppedFiles(files)
  }

  __onDragEnter(e) {
    e.stopPropagation()
    e.preventDefault()

    // ignore child elements
    if (e.target !== e.currentTarget) {
      return
    }

    // add hovered-over style
    const elem = document.querySelector(`#${e.target.id}`)
    elem.classList.add('hovered-over')

    AudioHash._logStatus('dragenter', e.target.id)
  }

  __onDragLeave(e) {
    e.stopPropagation()
    e.preventDefault()

    // ignore child elements
    if (e.target !== e.currentTarget) {
      return
    }

    // remove hovered-over style
    const elem = document.querySelector(`#${e.target.id}`)
    elem.classList.remove('hovered-over')

    AudioHash._logStatus('dragleave', e.target.id)
  }

  __onDragOver(e) {
    e.stopPropagation()
    e.preventDefault()

    // console.log('dragover', e)
  }
}
