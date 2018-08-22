/**
 * AudioHash web application 'class' module implementation
 */

/* global define, myWorker */

define(['./constants', './soundplayer'], function (constants, SoundPlayer) {
  return {
    _soundPlayerId: 0, // used to give each SP a unique ID
    _soundPlayerMax: 10, // arbitrary, may change or go away
    _soundPlayerArray: [], // holds all the existing SPs
    _audioContext: function() {
      if ( !window.AudioContext && !window.webkitAudioContext ) {
        return console.warn(constants.AH_ERROR_NO_WEB_AUDIO)
      } else {
        return new ( window.AudioContext || window.webkitAudioContext )()
      }
    },

    areSPBuffersEmpty: function() {
      var empty = false

      this.getSPArray().forEach(function(sound) {
        if (!sound.audioBuffer) {
          empty = true
        }
      })

      return empty
    },
    getSPId: function() {
      return this._soundPlayerId
    },
    getAudioContext: function() {
      return this._audioContext()
    },
    getSP: function(sId) {
      var position = this._listSPIds().indexOf(parseInt(sId))
      return this._soundPlayerArray[position]
    },
    getSPArray: function() {
      return this._soundPlayerArray
    },
    getSPArrayLength: function() {
      return this._soundPlayerArray.length
    },
    getSPMax: function() {
      return this._soundPlayerMax
    },

    _listSPIds: function() {
      var arrIds = []
      for (var i = 0; i < this._soundPlayerArray.length; i++) {
        arrIds.push(this._soundPlayerArray[i].soundId)
      }
      return arrIds
    },
    _updateSPCount: function() {
      this._soundPlayerId += 1
      document.getElementById('lblSoundPlayersCount').innerText = this.getSPArrayLength()
    },
    _displayHexDump: function(bufferString) {
      console.log('dumping hex...')
      document.getElementById('hex-dump').style.display = 'block'
      document.getElementById('hex-dump-contents').innerHTML = 'dumping hex...'
      myWorker.postMessage({
        command: 'hexDump',
        buffer: bufferString
      })
    },
    _getSoundChannelsMin: function(sndArr) {
      var sndChannelsArr = []
      sndArr.forEach(function(snd) {
        sndChannelsArr.push(snd.audioBuffer.numberOfChannels)
      })
      return Math.min.apply(Math, sndChannelsArr)
    },
    _getSoundSlice: function(audioBuffer) {
      var sliceNumber = document.getElementById('txtSampleSize')
      var randBegin = Math.Random() * (audioBuffer.length - sliceNumber)
      var randEnd = randBegin + sliceNumber
      return audioBuffer.slice(randBegin, randEnd)
    },
    _enableDownload: function(blob, givenFilename) {
      var url = (window.URL || window.webkitURL).createObjectURL(blob)
      var link = document.getElementById('linkDownloadAH')
      var d = new Date()
      var defaultFilename = 'sampler' + d.toJSON() + '.wav'
      link.style.display = 'inline'
      link.href = url
      link.download = givenFilename || defaultFilename
    },
    _writePCMSamples: function(output, offset, input) {
      for (var i = 0; i < input.length; i++, offset+=2){
        var s = Math.max(-1, Math.min(1, input[i]))
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      }
    },
    _writeString: function(view, offset, string) {
      for (var i = 0; i < string.length; i++){
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    },
    _encodeWavFile: function(samples, sampleRate) {
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
    },

    // add a new Sound Player to the array
    createSP: function(quantity) {
      var playerCount = (quantity || 1)
      if (playerCount <= 0) playerCount = 1

      for (var i = 0; i < playerCount; i++) {
        this._soundPlayerArray.push(new SoundPlayer(this.getSPId(), this.getAudioContext()))
        this._updateSPCount()
      }

      return this._soundPlayerArray[this._soundPlayerArray.length - 1]
    },
    // remove a Sound Player from the array
    removeSP: function(sId) {
      if (this._soundPlayerArray.length > 1) {
        var position = this._listSPIds().indexOf(sId)
        this._soundPlayerArray.splice(position, 1)
      } else {
        this._soundPlayerArray = []
      }

      var divSoundPlayers = document.querySelector('#soundPlayers')
      var soundToRemove = document.querySelector(`#sound${sId}`)
      console.log('soundToRemove', soundToRemove)
      divSoundPlayers.removeChild(soundToRemove)

      this._updateSPCount()
    },
    // make a new sampler of 2 or more sounds
    createAH: function(sndArr) {
      var newSampler
      var numberOfChannels = this._getSoundChannelsMin(sndArr)
      var sndLengthSum = (function() {
        var lng = 0
        for (var i = 0; i < sndArr.length; i++) {
          lng += sndArr[i].audioBuffer.length
        }
        return lng
      })()

      // create new buffer to hold all the SoundPlayer audio data
      var newSamplerBuffer = this.getAudioContext().createBuffer(
        numberOfChannels,
        sndLengthSum,
        sndArr[0].audioBuffer.sampleRate * 2
      )

      // fill new buffer with SoundPlayer audio data
      for (var channel = 0; channel < numberOfChannels; channel++) {
        newSampler = newSamplerBuffer.getChannelData(channel)
        newSampler.set(sndArr[0].audioBuffer.getChannelData(channel), 0)
        for (var j = 1; j < sndArr.length; j++) {
          newSampler.set(sndArr[j].audioBuffer.getChannelData(channel), sndArr[j-1].audioBuffer.length)
        }
      }

      // encode our newly-made audio buffer into a wav file
      var dataView = this._encodeWavFile(newSampler, newSamplerBuffer.sampleRate)
      var audioBlob = new Blob([dataView], { type : 'audio/wav' })

      // post new wav file to download link
      this._enableDownload(audioBlob)

      // makes a temp audio buffer source and plays the new sampler mix
      var mixDemo = document.getElementById('chkMixDemo')
      if (mixDemo.checked)
      {
        var mixSpeed = document.getElementById('numPlaybackPerc').value
        if (mixSpeed !== '') mixSpeed = mixSpeed / 100
        var audioSource = this.getAudioContext().createBufferSource()
        audioSource.buffer = newSamplerBuffer
        audioSource.connect(this.getAudioContext().destination)
        audioSource.playbackRate.value = mixSpeed
        audioSource.start()
      }

      // post hex dump
      var dumpHex = document.getElementById('chkDumpHex')
      if (dumpHex.checked)
      {
        var decoder = new TextDecoder('utf-8')
        var decodedString = decoder.decode(dataView)
        this._displayHexDump(decodedString)
      }
    },
  }
})
