/***************************
Javascript Module Strategy
***************************/

//// Global Constants
var SND_STATUS_PLAYING = "playing";
var SND_STATUS_STOPPED = "stopped/finished";
var SND_STATUS_PAUSED = "paused";
var SND_STATUS_UNLOADED = "unloaded";
var SND_STATUS_LOADED = "loaded and ready";

// SSPApp "class" module implementation
var SSPApp = (function () { 
  //// Variables
  var _soundNumber = 0;
  var _audioContextsMax = 6;
  var _soundPlayerArray = [];

  // audioContext maker
  var _getContext = function() {
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

  var _ctx = _getContext();
  
  //// Public Methods
  var testFunc = function() {
    console.log("SSPApp made successfully!");
  }
  var getSoundNumber = function() {
    return _soundNumber;
  }
  var incSoundNumber = function() {
    _soundNumber++;
  }
  var updateSoundPlayerCount = function() {
    document.getElementById("lblSoundPlayersCount").innerText = getSoundNumber();
  }
  var getAudioContextsMax = function() {
    return _audioContextsMax;
  }
  var getSoundPlayer = function(index) {
    return _soundPlayerArray[index];
  }
  var getSoundPlayerArray = function() {
    return _soundPlayerArray;
  }
  var isAPArrayEmpty = function() {
    var isEmpty = false;
    _soundPlayerArray.forEach(function(sound) {
      if (!sound.audioBuffer) {
        isEmpty = true;
      }
    });
    return isEmpty;
  }
  var makeSoundPlayer = function() {
    _soundPlayerArray.push(new SoundPlayer());
    incSoundNumber();
    updateSoundPlayerCount();
    return _soundPlayerArray[_soundPlayerArray.length-1];
  }
  
  /////////////////////////////////////////
  //// Sound Sampler Platter Functions ////
  /////////////////////////////////////////
  
  function makeWavFile(ssp) {
    var buffer = new ArrayBuffer(44 + ssp.length * 2);
    var view = new DataView(buffer);
    
    // RIFF chunk descriptor
    writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, 44 + ssp.length * 2, true);
    writeUTFBytes(view, 8, 'WAVE');
    // FMT sub-chunk
    writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    // stereo (2 channels)
    view.setUint16(22, 2, true);
    view.setUint32(24, 44100, true);
    view.setUint32(28, 44100 * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    // data sub-chunk
    writeUTFBytes(view, 36, 'data');
    view.setUint32(40, ssp.length * 2, true);
 
    // write the PCM samples
    var lng = ssp.length;
    var index = 44;
    var volume = 1;
    for (var i = 0; i < lng; i++)
    {
      view.setInt16(index, ssp[i] * (0x7FFF * volume), true);
      index += 2;
    }
    console.log("about to return WAV blog");
    return (new Blob ( [ view ], { type : 'audio/wav' } ));
  }
  
  function writeUTFBytes(view, offset, string) {
    var lng = string.length;
    for (var i = 0; i < lng; i++)
    {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  function makeSSP(soundArray) {
    var numberOfChannels = 0;
    var soundChannelsArray = [];
    soundArray.forEach(function(sound) {
      soundChannelsArray.push(sound.audioBuffer.numberOfChannels);
    });
    numberOfChannels = Math.min.apply(Math,soundChannelsArray);
    var ssp = _ctx.createBuffer(numberOfChannels, (soundArray[0].audioBuffer.length + soundArray[1].audioBuffer.length), soundArray[0].audioBuffer.sampleRate);
    for (var i=0; i<numberOfChannels; i++)
    {
      var channel = ssp.getChannelData(i);
      channel.set(soundArray[0].audioBuffer.getChannelData(i), 0);
      channel.set(soundArray[1].audioBuffer.getChannelData(i), soundArray[0].audioBuffer.length);
    }
    
    console.log("about to make wav file");
    
    var blob = makeWavFile(ssp);
    
    console.log("made blob");
    
    enableDownload(blob);
  }
  
  function enableDownload(blob, filename) {
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.getElementById("linkDownloadSSP");
    link.href = url;
    link.download = filename || "soundSamplerPlatter.wav";
  }

  return {
    testFunc:             testFunc,
    getSoundNumber:       getSoundNumber,
    getAudioContextsMax:  getAudioContextsMax,
    getSoundPlayer:       getSoundPlayer,
    getSoundPlayerArray:  getSoundPlayerArray,
    isAPArrayEmpty:       isAPArrayEmpty,
    makeSoundPlayer:      makeSoundPlayer,
    makeSSP:              makeSSP
  }
})();

// SoundPlayer "class" module implementation
var SoundPlayer = function() {
  //// Variables
  var that = this;
  this.soundId = SSPApp.getSoundNumber();
  this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  this.audioBuffer = null;
  this.gainNode = this.audioContext.createGain();
  this.source = null;
  this.startTime = 0;
  this.startOffset = 0;
  this.isPaused = false;
  this.isStopped = true;
  this.playing = false;
  
  //// SoundPlayer Methods
  // property getters
  var getSoundId = function() { 
    return this.soundId; 
  };
  var getRngVolume = function() { 
    return this.rngVolume.value; 
  };
  
  // test function
  var testFunc = function() {
    console.log("SoundPlayer made successfully!");
  }
  
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
      btnP.disabled = false;
      var btnS = document.getElementById("btnStop" + sId);
      btnS.disabled = false;
      updateSoundStatus(sId, SND_STATUS_LOADED);
    }, function(e) {
      console.warn('Error decoding file', e);
    });
  };

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
  
  this.soundDiv = document.createElement('div');
  this.soundHeader = document.createElement('h3');
  this.soundStatus = document.createElement('div');
  this.fileUpload = document.createElement('input');
  this.rngVolume = document.createElement('input');
  this.lblVolume = document.createElement('label');
  this.btnPlay = document.createElement('button');
  this.btnStop = document.createElement('button');

  this.soundDiv.classList.add('sound');
  this.soundHeader.innerText = "Sound " + this.soundId;
  this.soundStatus.id = "soundStatus" + this.soundId;
  this.soundStatus.classList.add('sound-status');
  this.soundStatus.innerText = SND_STATUS_UNLOADED;

  this.fileUpload.id = "fileUpload" + this.soundId;
  this.fileUpload.type = "file";
  this.fileUpload.accept = "audio/*";
  this.fileUpload.addEventListener('change', function(e) {
    var reader = new FileReader();
    var sId = that.soundId;
    //var initSound = that.initSound;
    reader.onload = function(e) {
      initSound(this.result, that, sId);
    };
    reader.readAsArrayBuffer(this.files[0]);
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

  document.getElementById("soundPlayers").appendChild(this.soundDiv);
  this.soundDiv.appendChild(this.soundHeader);
  this.soundDiv.appendChild(this.soundStatus);
  this.soundDiv.appendChild(this.fileUpload);
  this.soundDiv.appendChild(this.rngVolume);
  this.soundDiv.appendChild(this.lblVolume);
  this.soundDiv.appendChild(this.btnPlay);
  this.soundDiv.appendChild(this.btnStop);
};

function initPageUI() {
  var apCountMax = document.getElementById("lblSoundPlayersCountMax");
  var apCount = document.getElementById("lblSoundPlayersCount");
  var createAP = document.getElementById("btnCreateSoundPlayer");
  var makeSSP = document.getElementById("btnMakeSSP");
  var sampleSizeVal = document.getElementById("rngSampleSize");
  var sampleSizeTxt = document.getElementById("txtSampleSize");
  
  apCountMax.innerText = SSPApp.getAudioContextsMax();
  apCount.innerText = SSPApp.getSoundNumber();
  createAP.addEventListener("click", function() {
    if (SSPApp.getSoundNumber() < 5) {
      SSPApp.makeSoundPlayer();
    } else {
      alert("The maximum number of AudioContexts (6) has been reached. No more can be created.");
    }
  });
  makeSSP.addEventListener("click", function() {
    if (SSPApp.getSoundNumber() < 2) {
      alert("You need at least two sounds to make a sound sampler platter");
    }
    else if (SSPApp.isAPArrayEmpty()) {
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

// Set up the app with default settings and an example SoundPlayer
window.onload = function() {
  // set up basic page UI stuff
  initPageUI();
  
  // make an example SoundPlayer
  SSPApp.makeSoundPlayer();
  SSPApp.makeSoundPlayer();
  
  var snd0 = SSPApp.getSoundPlayer(0);
};
