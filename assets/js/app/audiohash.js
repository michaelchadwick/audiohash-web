/**
 * AudioHash web application 'class' module implementation
 */

/* global define, myWorker */

define(['./constants', './soundplayer'], function (constants, SoundPlayer) {
  return {
    _soundPlayerNextId: 0, // used to give each SP a unique ID
    _soundPlayerCountMax: 10, // arbitrary, may change or go away
    _soundPlayerArray: [], // holds all the existing SPs
    _audioContext: function() {
      if ( !window.AudioContext && !window.webkitAudioContext ) {
        return console.warn(constants.AH_ERROR_NO_WEB_AUDIO)
      } else {
        return new ( window.AudioContext || window.webkitAudioContext )()
      }
    },

    _getAudioContext: function() {
      return this._audioContext()
    },
    _getSP: function(sId) {
      var position = this.listSPIds().indexOf(parseInt(sId))
      return this._soundPlayerArray[position]
    },
    _setSPArray: function(arr) {
      this._soundPlayerArray = arr
    },
    _updateSPCount: function() {
      document.getElementById('lblSoundPlayersCount').innerText = this.getSPArrayLength()
      // console.log('audiohash.js this.getSPNextId()', this.getSPNextId())
    },
    _resetSPCount: function() {
      this._soundPlayerArray = []
      this._soundPlayerNextId = 0
    },
    _displayHexDump: function(bufferString) {
      document.getElementById('hex-dump').style.display = 'block'
      document.getElementById('hex-dump-contents').innerHTML = 'dumping hex...'
      myWorker.postMessage({
        command: 'hexDump',
        buffer: bufferString
      })
    },
    _shuffleArray: function(array) {
      for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1))
        var temp = array[i]
        array[i] = array[j]
        array[j] = temp
      }
      return array
    },
    _getSoundChannelsMin: function(sndArr) {
      var sndChannelsArr = []
      sndArr.forEach(function(snd) {
        sndChannelsArr.push(snd.audioBuffer.numberOfChannels)
      })
      return Math.min.apply(Math, sndChannelsArr)
    },
    _getSoundLengthSum: function(sndArr) {
      var lng = 0
      for (var i = 0; i < sndArr.length; i++) {
        lng += sndArr[i].audioBuffer.length
      }
      return lng
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

    areSPBuffersEmpty: function() {
      var empty = false

      this.getSPArray().forEach(function(sound) {
        if (!sound.audioBuffer) {
          empty = true
        }
      })

      return empty
    },
    getSPNextId: function() {
      return this._soundPlayerNextId
    },
    incSPNextId: function() {
      this._soundPlayerNextId += 1
    },
    getSPArray: function() {
      return this._soundPlayerArray
    },
    getSPArrayLength: function() {
      return this._soundPlayerArray.length
    },
    getSPCountMax: function() {
      return this._soundPlayerCountMax
    },
    listSPIds: function() {
      var arrIds = []

      this._soundPlayerArray.forEach(sp => { arrIds.push(sp.soundId) })

      return arrIds
    },

    // add new Sound Player to the array
    createSP: function(quantity) {
      var playerCount = (quantity || 1)
      if (playerCount <= 0) playerCount = 1

      for (var i = 0; i < playerCount; i++) {
        const newSP = new SoundPlayer(this.getSPNextId(), this._getAudioContext())
        this.getSPArray().push(newSP)
        this._updateSPCount()
        this.incSPNextId()
      }

      console.log('createSP this.listSPIds', this.listSPIds())
    },
    // remove Sound Player from the array
    removeSP: function(sp, spArray) {
      const sId = sp.soundId

      console.log('sp', sp)
      console.log('sId', sId)
      console.log('spArray', spArray)

      if (spArray.length > 1) {
        var position = spArray.indexOf(sId)
        console.log('position', position)
        this.spArray.splice(position, 1)
        this._updateSPCount()
      } else {
        this._resetSPCount()
      }

      var divSoundPlayers = document.querySelector('#soundPlayers')
      var soundToRemove = document.querySelector(`#sound${sId}`)

      divSoundPlayers.removeChild(soundToRemove)
    },
    // make a new sampler of 2 or more sounds
    createAH: function(sndArr) {
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
          console.log('indicesShuffled', indicesShuffled)
          console.log('indicesShuffled.length', indicesShuffled.length)
          console.log('count', count)

          if (count > 0) {
            offset = sndArr[count - 1].audioBuffer.length
          }

          // grab the nth shuffled index for sndArr
          index = indicesShuffled[0]
          console.log('index', index)
          // remove it from the shuffled index
          indicesShuffled.splice(0, 1)
          console.log('indicesShuffled', indicesShuffled)

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
      var mixDemo = document.getElementById('chkMixDemo')
      if (mixDemo.checked)
      {
        var mixSpeed = document.getElementById('numPlaybackPerc').value
        if (mixSpeed !== '') mixSpeed = mixSpeed / 100
        var audioSource = this._getAudioContext().createBufferSource()
        audioSource.buffer = newSamplerBuffer
        audioSource.connect(this._getAudioContext().destination)
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
