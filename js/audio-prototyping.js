/*******************************
Javascript Prototyping Strategy
Immediately-Invoked-Function-Expression (IIFE)
********************************/

(function() {
  //// Global variables
  var soundNumber = 0;
  var audioPlayersCountMax = 6;
  var audioPlayers = [];
  
  //// Constant statuses
  var SND_STATUS_PLAYING = "playing";
  var SND_STATUS_STOPPED = "stopped";
  var SND_STATUS_PAUSED = "paused";
  var SND_STATUS_UNLOADED = "unloaded";
  var SND_STATUS_LOADED = "loaded and ready";

  // audioContext maker
  var getContext = function() {
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

  var ctx = getContext();

  //// AudioPlayer "class" implementation
  function AudioPlayer() {
    // Variables
    var that = this;
    this.soundId = soundNumber;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.audioBuffer = null;
    this.gainNode = this.audioContext.createGain();
    this.source = null;
    this.startTime = 0;
    this.startOffset = 0;
    this.isPaused = false;
    this.isStopped = true;

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
      var initSound = that.initSound;
      reader.onload = function(e) {
        initSound(this.result, that, sId);
      };
      reader.readAsArrayBuffer(this.files[0]);
    }, false);

    this.rngVolume.id = "rngVolume" + this.soundId;
    this.rngVolume.type = "range";
    this.rngVolume.min = 0;
    this.rngVolume.max = 100;
    // set the volume to something random from 0 to 100
    this.rngVolume.value = Math.floor((Math.random() * 80) + 20);
    this.rngVolume.addEventListener('input', this.changeVolume);
    this.rngVolume.addEventListener('change', this.updateVolumeLabel);

    this.lblVolume.id = "lblVolume" + this.soundId;
    this.lblVolume.innerText = this.rngVolume.value;

    this.btnPlay.id = "btnPlay" + this.soundId;
    this.btnPlay.innerText = "Play/Pause";
    this.btnPlay.addEventListener('click', this.toggle);
    this.btnPlay.disabled = true;

    this.btnStop.id = "btnStop" + this.soundId;
    this.btnStop.innerText = "Stop";
    this.btnStop.addEventListener('click', this.stopAudio);
    this.btnStop.disabled = true;

    document.getElementById("audioPlayers").appendChild(this.soundDiv);
    this.soundDiv.appendChild(this.soundHeader);
    this.soundDiv.appendChild(this.soundStatus);
    this.soundDiv.appendChild(this.fileUpload);
    this.soundDiv.appendChild(this.rngVolume);
    this.soundDiv.appendChild(this.lblVolume);
    this.soundDiv.appendChild(this.btnPlay);
    this.soundDiv.appendChild(this.btnStop);

    soundNumber++;

    document.getElementById("lblAudioPlayersCount").innerText = soundNumber;
  };

  //// Methods
  // property getters
  AudioPlayer.prototype.getSoundId = function() {
    return this.soundId;
  };
  AudioPlayer.prototype.getRngVolume = function() {
    return this.rngVolume.value;
  };

  // change the internal gain node value
  AudioPlayer.prototype.changeVolume = function(element) {
    var volume = element.srcElement.value;
    var volumeMax = element.srcElement.max;
    var fraction = parseInt(volume) / parseInt(volumeMax);
    var sId = element.srcElement.id.split("rngVolume")[1];
    var snd = audioPlayers[sId];
    snd.gainNode.gain.value = fraction * fraction;
  };

  // init the volume to the range element's value
  AudioPlayer.prototype.initVolume = function(element) {
    var volume = element.value;
    var volumeMax = element.max;
    var fraction = parseInt(volume) / parseInt(volumeMax);
    var sId = element.id.split("rngVolume")[1];
    var snd = audioPlayers[sId];
    snd.gainNode.gain.value = fraction * fraction;
  }

  // update the volume label
  AudioPlayer.prototype.updateVolumeLabel = function(e) {
    var rangeVolN = e.srcElement;
    var sId = this.id.split("rngVolume")[1];
    var lblVolumeId = "lblVolume".concat(sId);
    var lblVolumeN = document.getElementById(lblVolumeId);
    lblVolumeN.innerText = rangeVolN.value;
  };

  // update the current sound status
  AudioPlayer.prototype.updateSoundStatus = function(sId, status) {
    var curSoundStatusId = "soundStatus".concat(sId);
    var curSoundStatusN = document.getElementById(curSoundStatusId);
    curSoundStatusN.innerText = status;
  };

  // load the sound into a buffer
  AudioPlayer.prototype.initSound = function(arrayBuffer, audioPlayer, sId) {
    audioPlayer.audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      audioPlayer.audioBuffer = buffer;
      var btnP = document.getElementById("btnPlay" + sId);
      btnP.disabled = false;
      var btnS = document.getElementById("btnStop" + sId);
      btnS.disabled = false;
      audioPlayer.updateSoundStatus(sId, SND_STATUS_LOADED);
    }, function(e) {
      console.log('Error decoding file', e);
    });
  };

  // play the audio file from a specific startOffset
  AudioPlayer.prototype.play = function(startOffset) {
    this.startTime = this.audioContext.currentTime;

    if(!this.audioContext.createGain) {
      this.audioContext.createGain = this.audioContext.createGainNode;
    }
    this.gainNode = this.audioContext.createGain();
    this.initVolume(this.rngVolume);

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;

    var audioPlayerN = this;
    this.source.onended = function() {
      var pauseOrStopStatus = audioPlayerN.isPaused ? SND_STATUS_PAUSED : SND_STATUS_STOPPED;
      if (audioPlayerN.isStopped) audioPlayerN.playing = false;
      audioPlayerN.updateSoundStatus(audioPlayerN.soundId, pauseOrStopStatus);
    };

    this.source.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    this.source.loop = false;

    this.source.start(0, startOffset % this.audioBuffer.duration);

    this.isStopped = false;
    this.isPaused = false;

    this.updateSoundStatus(this.soundId, SND_STATUS_PLAYING);
  };

  // pause the audio file and record its currentTime
  AudioPlayer.prototype.pause = function(curTime) {
    this.source.stop();
    this.isPaused = true;
    this.startOffset += curTime - this.startTime;
    this.updateSoundStatus(this.soundId, SND_STATUS_PAUSED);
  };

  // stop playing the audio file
  AudioPlayer.prototype.stopAudio = function() {
    var sId = this.id.split("btnStop")[1];
    var snd = audioPlayers[sId];
    snd.startOffset = 0;
    snd.source.stop();
    snd.playing = false;
    snd.isPaused = false;
    snd.isStopped = true;
    snd.updateSoundStatus(snd.soundId, SND_STATUS_STOPPED);
  };

  // when the play/pause button is pressed, toggle its status
  AudioPlayer.prototype.toggle = function() {
    var sId = this.id.split("btnPlay")[1];
    var snd = audioPlayers[sId];
    // if playing, pause and capture currentTime; if not, then play from startOffset
    snd.playing ? snd.pause(snd.audioContext.currentTime) : snd.play(snd.startOffset);
    // flip playing mode status
    snd.playing = !snd.playing;
  };

})();

window.onload = function() {
  document.getElementById("lblAudioPlayersCountMax").innerText = audioPlayersCountMax;
  audioPlayers.push(snd0 = new AudioPlayer());
  audioPlayers.push(snd1 = new AudioPlayer());
  audioPlayers.push(snd2 = new AudioPlayer());
};
