/***************************
Javascript Module Strategy
***************************/

//// Global Constants
var SND_STATUS_PLAYING = "playing";
var SND_STATUS_STOPPED = "stopped/finished";
var SND_STATUS_PAUSED = "paused";
var SND_STATUS_UNLOADED = "unloaded";
var SND_STATUS_LOADED = "loaded and ready";

/*
  ASPApp "class" module implementation
*/
var ASPApp = (function () { 
  //// Variables
  var _soundNumber = 0;
  var _audioContextsMax = 6;
  var _audioPlayerArray = [];

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
    console.log("ASPApp made successfully!");
  }
  var getSoundNumber = function() {
    return _soundNumber;
  }
  var incSoundNumber = function() {
    _soundNumber++;
  }
  var updateAudioPlayerCount = function() {
    document.getElementById("lblAudioPlayersCount").innerText = getSoundNumber();
  }
  var getAudioContextsMax = function() {
    return _audioContextsMax;
  }
  var getAudioPlayerArray = function(index) {
    return _audioPlayerArray[index];
  }
  var makeAudioPlayer = function() {
    _audioPlayerArray.push(new AudioPlayer());
    incSoundNumber();
    updateAudioPlayerCount();
    return _audioPlayerArray[_audioPlayerArray.length-1];
  }

  return {
    testFunc:             testFunc,
    getSoundNumber:       getSoundNumber,
    getAudioContextsMax:  getAudioContextsMax,
    getAudioPlayerArray:  getAudioPlayerArray, 
    makeAudioPlayer:      makeAudioPlayer
  }
})();

/*
  AudioPlayer "class" module implementation
*/
var AudioPlayer = function() {
  //// Variables
  var that = this;
  this.soundId = ASPApp.getSoundNumber();
  this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  this.audioBuffer = null;
  this.gainNode = this.audioContext.createGain();
  this.source = null;
  this.startTime = 0;
  this.startOffset = 0;
  this.isPaused = false;
  this.isStopped = true;
  this.playing = false;
  
  //// AudioPlayer Methods
  // property getters
  var getSoundId = function() { 
    return this.soundId; 
  };
  var getRngVolume = function() { 
    return this.rngVolume.value; 
  };
  
  // test function
  var testFunc = function() {
    console.log("AudioPlayer made successfully!");
  }
  
  // change the internal gain node value
  var changeVolume = function(element) {
    var volume = element.srcElement.value;
    var volumeMax = element.srcElement.max;
    var fraction = parseInt(volume) / parseInt(volumeMax);
    var sId = element.srcElement.id.split("rngVolume")[1];
    var snd = ASPApp.getAudioPlayerArray(sId);
    snd.gainNode.gain.value = fraction * fraction;
  };

  // initialize the volume to the range element's value
  var initVolume = function(element) {
    var volume = element.value;
    var volumeMax = element.max;
    var fraction = parseInt(volume) / parseInt(volumeMax);
    var sId = element.id.split("rngVolume")[1];
    var snd = ASPApp.getAudioPlayerArray(sId);
    snd.gainNode.gain.value = fraction * fraction;
  }

  // update the volume label
  var updateVolumeLabel = function(e) {
    var rangeVolN = e.srcElement;
    var sId = this.id.split("rngVolume")[1];
    var lblVolumeId = "lblVolume".concat(sId);
    var lblVolumeN = document.getElementById(lblVolumeId);
    console.log("sId updatevol", sId);
    lblVolumeN.innerText = rangeVolN.value;
  };

  // update the current sound status label
  var updateSoundStatus = function(sId, status) {
    var curSoundStatusId = "soundStatus".concat(sId);
    var curSoundStatusN = document.getElementById(curSoundStatusId);
    curSoundStatusN.innerText = status;
  };

  // load the sound into a buffer
  var initSound = function(arrayBuffer, audioPlayer, sId) {
    audioPlayer.audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      audioPlayer.audioBuffer = buffer;
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

    var audioPlayerN = snd;
    snd.source.onended = function() {
      var pauseOrStopStatus = audioPlayerN.isPaused ? SND_STATUS_PAUSED : SND_STATUS_STOPPED;
      if (audioPlayerN.isStopped) audioPlayerN.playing = false;
      updateSoundStatus(audioPlayerN.soundId, pauseOrStopStatus);
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
  var stopAudio = function() {
    var sId = this.id.split("btnStop")[1];
    var snd = ASPApp.getAudioPlayerArray(sId);
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
    var snd = ASPApp.getAudioPlayerArray(sId);
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
  this.btnStop.addEventListener('click', stopAudio);
  this.btnStop.disabled = true;

  document.getElementById("audioPlayers").appendChild(this.soundDiv);
  this.soundDiv.appendChild(this.soundHeader);
  this.soundDiv.appendChild(this.soundStatus);
  this.soundDiv.appendChild(this.fileUpload);
  this.soundDiv.appendChild(this.rngVolume);
  this.soundDiv.appendChild(this.lblVolume);
  this.soundDiv.appendChild(this.btnPlay);
  this.soundDiv.appendChild(this.btnStop);
};

function initPageUI() {
  var apCountMax = document.getElementById("lblAudioPlayersCountMax");
  var apCount = document.getElementById("lblAudioPlayersCount");
  var createAP = document.getElementById("btnCreateAudioPlayer");
  var makeASP = document.getElementById("btnMakeASP");
  var sampleSizeVal = document.getElementById("rngSampleSize");
  var sampleSizeTxt = document.getElementById("txtSampleSize");
  
  apCountMax.innerText = ASPApp.getAudioContextsMax();
  apCount.innerText = ASPApp.getSoundNumber();
  createAP.addEventListener("click", function() {
    if (ASPApp.getSoundNumber() < 5) {
      ASPApp.makeAudioPlayer();
    } else {
      alert("The maximum number of AudioContexts (6) has been reached. No more can be created.");
    }
  });
  makeASP.addEventListener("click", function() {
    if (ASPApp.getSoundNumber() < 2)
    {
      alert("You need at least two sounds to make an audio sampler platter");
    }
  });
  sampleSizeVal.addEventListener("change", function(e) {
    sampleSizeTxt.value=e.srcElement.value;
  });
  sampleSizeTxt.value=sampleSizeVal.value;
}

/*
  Set up the app with default settings and an example AudioPlayer
*/
window.onload = function() {
  // set up basic page UI stuff
  initPageUI();
  
  // make an example AudioPlayer
  ASPApp.makeAudioPlayer();
  
  var snd0 = ASPApp.getAudioPlayerArray(0);
};
