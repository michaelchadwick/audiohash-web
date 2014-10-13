/*******************************
** Javascript Module Strategy **
********************************/

//// Global Constants
var SND_STATUS_PLAYING = "playing";
var SND_STATUS_STOPPED = "stopped/finished";
var SND_STATUS_PAUSED = "paused";
var SND_STATUS_UNLOADED = "unloaded";
var SND_STATUS_LOADED = "loaded and ready";

//// Useful Date function for generating filenames
Date.prototype.curDateTime = function() {
  var year = this.getFullYear().toString();
  var month = (this.getMonth()+1).toString();
  var day = this.getDate().toString();
  var hh = this.getHours().toString();
  var mm = this.getMinutes().toString();
  var ss = this.getSeconds().toString();
  return year + (month[1] ? month : "0" + month[0]) + (day[1] ? day : "0" + day[0]) + "-" + (hh[1] ? hh : "0" + hh[0]) + (mm[1] ? mm : "0" + mm[0]) + (ss[1] ? ss : "0" + ss[0]);
}

//// Sound Sampler Platter web application "class" module implementation
var SSPApp = (function () { 
  //// Variables
  var _soundNumber = 0;
  var _soundPlayerMax = 10; // arbitrary, may change or go away
  var _soundPlayerArray = [];

  /******************************
  ** General-Purpose Functions **
  *******************************/
  
  // private
  var _createContext = function() {
    var ac = null;
    if ( !window.AudioContext && !window.webkitAudioContext ) {
      console.warn('Web Audio API not supported in this browser');
    } else {
      ac = new ( window.AudioContext || window.webkitAudioContext )();
    }
    return function() {
      return ac;
    };
  }();
  var _audioContext = _createContext();
  var _isAPArrayEmpty = function() {
    var isEmpty = false;
    _soundPlayerArray.forEach(function(sound) {
      if (!sound.audioBuffer) {
        isEmpty = true;
      }
    });
    return isEmpty;
  }
  var _incSoundNumber = function() {
    _soundNumber++;
  }
  var _updateSoundPlayerCount = function() {
    document.getElementById("lblSoundPlayersCount").innerText = getSoundNumber();
  }
  
  // public
  var getSoundNumber = function() {
    return _soundNumber;
  }
  var getAudioContext = function() {
    return _audioContext;
  }
  var getSoundPlayer = function(index) {
    return _soundPlayerArray[index];
  }
  var getSoundPlayerArray = function() {
    return _soundPlayerArray;
  }
  var getSoundPlayerMax = function() {
    return _soundPlayerMax;
  }
  var makeSoundPlayer = function(numOfPlayers) {
    var playerCount = (numOfPlayers || 1);
    if (playerCount <= 0) playerCount = 1;
    for (var i = 0; i < playerCount; i++) {
      _soundPlayerArray.push(new SoundPlayer());
      _incSoundNumber();
      _updateSoundPlayerCount();
    }

    return _soundPlayerArray[_soundPlayerArray.length-1];
  }
  
  /************************************
  ** Sound Sampler Platter Functions **
  *************************************/
  
  // private
  function _enableDownload(blob, givenFilename) {
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.getElementById("linkDownloadSSP");
    var d = new Date();
    var defaultFilename = "soundSamplerPlatter" + d.curDateTime() + ".wav";
    link.style.display = "inline";
    link.href = url;
    link.download = givenFilename || defaultFilename;
  }
  function _makeWavFile(sspBuffer) {
    var buffer = new ArrayBuffer(44 + sspBuffer.length * 2);
    var view = new DataView(buffer);
    
    // RIFF chunk descriptor
    _writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, 44 + sspBuffer.length * 2, true);
    _writeUTFBytes(view, 8, 'WAVE');
    // FMT sub-chunk
    _writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    // stereo (2 channels)
    view.setUint16(22, 2, true);
    view.setUint32(24, 44100, true);
    view.setUint32(28, 44100 * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    // data sub-chunk
    _writeUTFBytes(view, 36, 'data');
    view.setUint32(40, sspBuffer.length * 2, true);
 
    // write the PCM samples
    var lng = sspBuffer.length;
    var index = 44;
    var volume = 1;
    for (var i = 0; i < lng; i++)
    {
      view.setInt16(index, sspBuffer[i] * (0x7FFF * volume), true);
      index += 2;
    }
    return (new Blob ( [ view ], { type : 'audio/wav' } ));
  }
  function _writeUTFBytes(view, offset, string) {
    var lng = string.length;
    for (var i = 0; i < lng; i++)
    {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  } 
  function _getSoundChannelsMin(sndArr) {
    var sndChannelsArr = [];
    sndArr.forEach(function(snd) {
      sndChannelsArr.push(snd.audioBuffer.numberOfChannels);
    });
    return Math.min.apply(Math,sndChannelsArr);
  }
  
  // public
  function makeSSP(sndArr) {
    var numberOfChannels = _getSoundChannelsMin(sndArr);
    var sspBuffer = _getContext().createBuffer(
      numberOfChannels, 
      (sndArr[0].audioBuffer.length + sndArr[1].audioBuffer.length), 
      sndArr[0].audioBuffer.sampleRate
    );
    for (var i=0; i<numberOfChannels; i++)
    {
      var channel = sspBuffer.getChannelData(i);
      console.log("channel");
      channel.set(sndArr[0].audioBuffer.getChannelData(i), 0);
      channel.set(sndArr[1].audioBuffer.getChannelData(i), sndArr[0].audioBuffer.length);
    }

    var blob = _makeWavFile(sspBuffer);
    
    _enableDownload(blob);
  }
  
  // public functions
  return {
    getSoundNumber:       getSoundNumber,
    getAudioContext:      getAudioContext,
    getSoundPlayer:       getSoundPlayer,
    getSoundPlayerArray:  getSoundPlayerArray,
    getSoundPlayerMax:    getSoundPlayerMax,
    makeSoundPlayer:      makeSoundPlayer,
    makeSSP:              makeSSP
  }
})();

//// SoundPlayer "class" module implementation
var SoundPlayer = function() {
  //// Variables
  var curSoundPlayer = this;
  this.soundId = SSPApp.getSoundNumber();
  this.audioContext = SSPApp.getAudioContext();
  this.audioBuffer = null;
  this.gainNode = this.audioContext.createGain();
  this.source = null;
  this.startTime = 0;
  this.startOffset = 0;
  this.isPaused = false;
  this.isStopped = true;
  this.playing = false;
  
  //// Methods
  // property getters
  var getSoundId = function() { 
    return this.soundId; 
  };
  var getRngVolume = function() { 
    return this.rngVolume.value; 
  };
  
  // change the internal gain node value
  var changeVolume = function(element) {
    var volume = element.srcElement.value;
    var volumeMax = element.srcElement.max;
    var fraction = parseInt(volume) / parseInt(volumeMax);
    var sId = element.srcElement.id.split("rngVolume")[1];
    var snd = SSPApp.getSoundPlayer(sId);
    snd.gainNode.gain.value = fraction * fraction;
  };

  // initialize the volume to the range element's value
  var initVolume = function(element) {
    var volume = element.value;
    var volumeMax = element.max;
    var fraction = parseInt(volume) / parseInt(volumeMax);
    var sId = element.id.split("rngVolume")[1];
    var snd = SSPApp.getSoundPlayer(sId);
    snd.gainNode.gain.value = fraction * fraction;
  }

  // update the volume label
  var updateVolumeLabel = function(e) {
    var rangeVolN = e.srcElement;
    var sId = this.id.split("rngVolume")[1];
    var lblVolumeId = "lblVolume".concat(sId);
    var lblVolumeN = document.getElementById(lblVolumeId);
    lblVolumeN.innerText = rangeVolN.value;
  };

  // update the current sound status label
  var updateSoundStatus = function(sId, status) {
    var curSoundStatusId = "soundStatus".concat(sId);
    var curSoundStatusN = document.getElementById(curSoundStatusId);
    curSoundStatusN.innerText = status;
  };

  // load the sound into a buffer
  var initSound = function(arrayBuffer, soundPlayer, sId) {
    soundPlayer.audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      soundPlayer.audioBuffer = buffer;
      var btnP = document.getElementById("btnPlay" + sId);
      var btnS = document.getElementById("btnStop" + sId);
      btnP.disabled = false;
      btnS.disabled = false;
      updateSoundStatus(sId, SND_STATUS_LOADED);
      document.getElementById("sound" + sId).classList.add("activated");
    }, function(e) {
      console.warn('Error decoding file', e);
    });
  };
  
  var disableSound = function(sId) {
    document.getElementById("sound" + sId).classList.remove("activated");
    SSPApp.getSoundPlayer(sId).audioBuffer = null;
    document.getElementById("btnPlay" + sId).disabled = true;
    document.getElementById("btnStop" + sId).disabled = true;
  }

  // play the sound from a specific startOffset
  var playSound = function(snd) {
    snd.startTime = snd.audioContext.currentTime;

    if(!snd.audioContext.createGain) {
      snd.audioContext.createGain = snd.audioContext.createGainNode;
    }
    snd.gainNode = snd.audioContext.createGain();
    initVolume(snd.rngVolume);

    snd.source = snd.audioContext.createBufferSource();
    snd.source.buffer = snd.audioBuffer;

    var soundPlayerN = snd;
    snd.source.onended = function() {
      var pauseOrStopStatus = soundPlayerN.isPaused ? SND_STATUS_PAUSED : SND_STATUS_STOPPED;
      if (pauseOrStopStatus == SND_STATUS_STOPPED) soundPlayerN.isStopped = true;
      if (soundPlayerN.isStopped) soundPlayerN.playing = false;
      updateSoundStatus(soundPlayerN.soundId, pauseOrStopStatus);
    };

    snd.source.connect(snd.gainNode);
    snd.gainNode.connect(snd.audioContext.destination);
    snd.source.loop = false;

    snd.source.start(0, snd.startOffset % snd.audioBuffer.duration);

    snd.isStopped = false;
    snd.isPaused = false;

    updateSoundStatus(snd.soundId, SND_STATUS_PLAYING);
  };

  // pause the sound and record its currentTime
  var pauseSound = function(snd) {
    snd.source.stop();
    snd.isPaused = true;
    snd.startOffset += snd.audioContext.currentTime - snd.startTime;
    updateSoundStatus(snd.soundId, SND_STATUS_PAUSED);
  };

  // stop playing the sound
  var stopSound = function() {
    var sId = this.id.split("btnStop")[1];
    var snd = SSPApp.getSoundPlayer(sId);
    snd.startOffset = 0;
    snd.source.stop();
    snd.playing = false;
    snd.isPaused = false;
    snd.isStopped = true;
    updateSoundStatus(snd.soundId, SND_STATUS_STOPPED);
  };

  // when the play/pause button is pressed, toggle the current sound's status
  var togglePlayState = function() {
    var sId = this.id.split("btnPlay")[1];
    var snd = SSPApp.getSoundPlayer(sId);
    // if playing, pause and capture currentTime; if not, then play from startOffset
    snd.playing ? pauseSound(snd) : playSound(snd);
    // flip playing mode status
    snd.playing = !snd.playing;
  };
  
  /*******************
  ** User Interface **
  *******************/
  this.soundDiv = document.createElement('div');
  this.soundHeader = document.createElement('div');
  this.soundStatus = document.createElement('div');
  this.fileUpload = document.createElement('input');
  this.rngVolume = document.createElement('input');
  this.lblVolume = document.createElement('label');
  this.btnPlay = document.createElement('button');
  this.btnStop = document.createElement('button');

  this.soundDiv.classList.add('sound');
  this.soundDiv.id = "sound" + this.soundId;
  this.soundHeader.classList.add("sound-header");
  this.soundHeader.innerText = "Sound " + this.soundId;
  this.soundStatus.id = "soundStatus" + this.soundId;
  this.soundStatus.classList.add('sound-status');
  this.soundStatus.innerText = SND_STATUS_UNLOADED;

  this.fileUpload.id = "fileUpload" + this.soundId;
  this.fileUpload.type = "file";
  this.fileUpload.accept = "audio/*";
  this.fileUpload.addEventListener('change', function(e) {
    var reader = new FileReader();
    var sId = curSoundPlayer.soundId;
    reader.onload = function(e) {
      initSound(this.result, curSoundPlayer, sId);
    };
    if (e.srcElement.value != "")
    {
      reader.readAsArrayBuffer(this.files[0]);
    }
    else
    {
      disableSound(sId);
    }
  }, false);

  this.rngVolume.id = "rngVolume" + this.soundId;
  this.rngVolume.type = "range";
  this.rngVolume.min = 0;
  this.rngVolume.max = 100;
  this.rngVolume.value = Math.floor((Math.random() * 80) + 20); // set volume to random value from 0 to 100
  this.rngVolume.addEventListener('input', changeVolume);
  this.rngVolume.addEventListener('change', updateVolumeLabel);

  this.lblVolume.id = "lblVolume" + this.soundId;
  this.lblVolume.innerText = this.rngVolume.value;

  this.btnPlay.id = "btnPlay" + this.soundId;
  this.btnPlay.innerText = "Play/Pause";
  this.btnPlay.addEventListener('click', togglePlayState);
  this.btnPlay.disabled = true;

  this.btnStop.id = "btnStop" + this.soundId;
  this.btnStop.innerText = "Stop";
  this.btnStop.addEventListener('click', stopSound);
  this.btnStop.disabled = true;

  var divSoundPlayers = document.getElementById("soundPlayers");
  divSoundPlayers.appendChild(this.soundDiv);
  this.soundDiv.appendChild(this.soundHeader);
  this.soundDiv.appendChild(this.soundStatus);
  this.soundDiv.appendChild(this.fileUpload);
  this.soundDiv.appendChild(this.rngVolume);
  this.soundDiv.appendChild(this.lblVolume);
  this.soundDiv.appendChild(this.btnPlay);
  this.soundDiv.appendChild(this.btnStop);
};

//// Set up the initial web application user interface
function initPageUI() {
  var spCountMax = document.getElementById("lblSoundPlayersCountMax");
  var spCount = document.getElementById("lblSoundPlayersCount");
  var createAP = document.getElementById("btnCreateSoundPlayer");
  var makeSSP = document.getElementById("btnMakeSSP");
  var sampleSizeVal = document.getElementById("rngSampleSize");
  var sampleSizeTxt = document.getElementById("txtSampleSize");
  
  spCountMax.innerText = SSPApp.getSoundPlayerMax();
  spCount.innerText = SSPApp.getSoundNumber();
  createAP.addEventListener("click", function() {
    if (SSPApp.getSoundNumber() < SSPApp.getSoundPlayerMax()) {
      SSPApp.makeSoundPlayer();
    } else {
      alert("Can't create new SoundPlayer as the maximum number has been reached.");
    }
  });
  makeSSP.addEventListener("click", function() {
    if (SSPApp.getSoundNumber() < 2) {
      alert("You need at least two sounds to make a sound sampler platter");
    }
    else if (SSPApp._isAPArrayEmpty()) {
      alert("You haven't loaded enough sounds yet!");
    }
    else {
      SSPApp.makeSSP(SSPApp.getSoundPlayerArray());
    }
  });
  sampleSizeVal.addEventListener("change", function(e) {
    sampleSizeTxt.value=e.srcElement.value;
  });
  sampleSizeTxt.value=sampleSizeVal.value;
}

window.onload = function() {
  initPageUI();
  
  SSPApp.makeSoundPlayer(2);
};
