var soundNumber = 0;
var audioPlayersCountMax = 6;
var audioPlayers = [];

var AudioPlayer = AudioPlayer || {};

// AudioPlayer "class" implementation
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

  this.soundDiv = document.createElement('div');
  this.soundHeader = document.createElement('h3');
  this.fileUpload = document.createElement('input');
  this.rngVolume = document.createElement('input');
  this.lblVolume = document.createElement('label');
  this.btnPlay = document.createElement('button');
  this.btnStop = document.createElement('button');
  
  this.soundDiv.classList.add('sound');
  this.soundHeader.innerText = "Sound " + this.soundId;

  this.fileUpload.id = "fileUpload" + this.soundId;
  this.fileUpload.type = "file";
  this.fileUpload.accept = "audio/*";
  this.fileUpload.addEventListener('change', function(e) {
    var reader = new FileReader();
    var sId = that.soundId;
    console.log("that", that.soundId);
    var initSound = that.initSound;
    reader.onload = function(e) {
      console.log("soundId at initSound", sId);
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
  this.soundDiv.appendChild(this.fileUpload);
  this.soundDiv.appendChild(this.rngVolume);
  this.soundDiv.appendChild(this.lblVolume);
  this.soundDiv.appendChild(this.btnPlay);
  this.soundDiv.appendChild(this.btnStop);

  soundNumber++;
  
  document.getElementById("lblAudioPlayersCount").innerText = soundNumber;

  console.log("AudioPlayer " + this.soundId + " instantiated");
};

var that = this;

// Methods
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

// load the sound into a buffer
AudioPlayer.prototype.initSound = function(arrayBuffer, audioPlayer, sId) {
  audioPlayer.audioContext.decodeAudioData(arrayBuffer, function(buffer) {
    audioPlayer.audioBuffer = buffer;
    var btnP = document.getElementById("btnPlay" + sId);
    btnP.disabled = false;
    var btnS = document.getElementById("btnStop" + sId);
    btnS.disabled = false;
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

  this.source.connect(this.gainNode);
  this.gainNode.connect(this.audioContext.destination);
  this.source.loop = false;

  this.source.start(0, startOffset % this.audioBuffer.duration);
};

// pause the audio file and record its currentTime
AudioPlayer.prototype.pause = function(curTime) {
  this.source.stop();
  this.startOffset += curTime - this.startTime;
};

// stop playing the audio file
AudioPlayer.prototype.stopAudio = function() {
  var sId = this.id.split("btnStop")[1];
  var snd = audioPlayers[sId];
  snd.startOffset = 0;
  snd.source.stop();
  snd.playing = !snd.playing;
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

window.onload = function() {
  document.getElementById("lblAudioPlayersCountMax").innerText = audioPlayersCountMax;
  audioPlayers.push(snd0 = new AudioPlayer());
  audioPlayers.push(snd1 = new AudioPlayer());
  audioPlayers.push(snd2 = new AudioPlayer());
  
  snd0.lblVolume.innerText = snd0.getRngVolume();
  snd1.lblVolume.innerText = snd1.getRngVolume();
  snd2.lblVolume.innerText = snd2.getRngVolume();
};

document.getElementById("btnCreateAudioPlayer").addEventListener("click", function() {
  if (soundNumber < 6) {
    audioPlayers.push(new AudioPlayer());
  } else {
    alert("The maximum number of AudioPlayers (" + audioPlayersCountMax + ") has been reached. No more can be created.");
  }
});
