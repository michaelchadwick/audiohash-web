var soundNumber = 0;
var audioPlayersCountMax = 6;
var audioPlayers = [];

var AudioPlayer = AudioPlayer || {};

function AudioPlayer() {
  // Variables
  var that = this;
  this.soundId = soundNumber;
  this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  this.audioBuffer = null;
  this.gainNode = this.audioContext.createGain();
  this.source = null;
  this.startOffset = 0;

  this.soundDiv = document.createElement('div');
  this.soundHeader = document.createElement('h3');
  this.fileUpload = document.createElement('input');
  this.rngVolume = document.createElement('input');
  this.btnPlay = document.createElement('button');
  this.btnStop = document.createElement('button');
  this.lblVol = document.createElement('label');

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
  this.rngVolume.value = Math.floor((Math.random() * 80) + 20);
  this.rngVolume.addEventListener('input', this.changeVolume);
  this.rngVolume.addEventListener('change', this.updateVolumeLabel);

  this.btnPlay.id = "btnPlay" + this.soundId;
  this.btnPlay.innerText = "Play/Pause";
  this.btnPlay.addEventListener('click', this.toggle);
  this.btnPlay.disabled = true;

  this.btnStop.id = "btnStop" + this.soundId;
  this.btnStop.innerText = "Stop";
  this.btnStop.addEventListener('click', this.stop);
  this.btnStop.disabled = true;

  this.lblVol.id = "lblVol" + this.soundId;
  this.lblVol.innerText = this.rngVolume.value;

  document.getElementById("audioPlayers").appendChild(this.soundDiv);
  this.soundDiv.appendChild(this.soundHeader);
  this.soundDiv.appendChild(this.fileUpload);
  this.soundDiv.appendChild(this.rngVolume);
  this.soundDiv.appendChild(this.btnPlay);
  this.soundDiv.appendChild(this.btnStop);
  this.soundDiv.appendChild(this.lblVol);

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

AudioPlayer.prototype.changeVolume = function(element) {
  var volume = element.srcElement.value;
  var volumeMax = element.srcElement.max;
  var fraction = parseInt(volume) / parseInt(volumeMax);
  var sId = element.srcElement.id.split("rngVolume")[1];
  var snd = audioPlayers[sId];
  snd.gainNode.gain.value = fraction * fraction;
};

AudioPlayer.prototype.updateVolumeLabel = function(e) {
  var rangeVolN = e.srcElement;
  var sId = this.id.split("rngVolume")[1];
  var lblVolId = "lblVol".concat(sId);
  var lblVolN = document.getElementById(lblVolId);
  lblVolN.innerText = rangeVolN.value;
};

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

AudioPlayer.prototype.play = function(startOffset) {
  if(!this.audioContext.createGain) {
    this.audioContext.createGain = this.audioContext.createGainNode;
  }
  this.gainNode = this.audioContext.createGain();

  this.source = this.audioContext.createBufferSource();
  this.source.buffer = this.audioBuffer;

  this.source.connect(this.gainNode);
  this.gainNode.connect(this.audioContext.destination);
  this.source.loop = false;

  this.source.start(0, this.startOffset);
};

AudioPlayer.prototype.pause = function(curTime) {
  console.log("this pause", this);
  console.log("this.curTime", curTime);
  this.startOffset = curTime;
  console.log("this.startOffset", this.startOffset);
  this.source.stop();
};

AudioPlayer.prototype.stop = function() {
  var sId = this.id.split("btnStop")[1];
  var snd = audioPlayers[sId];
  if (!snd.source.stop) {
    console.log("snd.source is not stopped");
    snd.source.stop = snd.source.noteOff;
  }
  console.log("snd.source.noteOff", snd.source.noteOff);
  snd.startOffset = 0;
  console.log("snd.startOffset", snd.startOffset);
  snd.source.noteOff(snd.audioContext.currentTime);
  console.log("snd.playing?", snd.playing);
};

AudioPlayer.prototype.toggle = function() {
  var sId = this.id.split("btnPlay")[1];
  var snd = audioPlayers[sId];
  console.log("toggled beginning: snd.playing?", snd.playing);
  console.log("snd.startOffset", snd.startOffset);
  snd.playing ? snd.pause(snd.audioContext.currentTime) : snd.play(snd.startOffset);
  snd.playing = !snd.playing;
  console.log("toggled ending: snd.playing?", snd.playing);
};

window.onload = function() {
  var apCountMax = document.getElementById("lblAudioPlayersCountMax");
  apCountMax.innerText = audioPlayersCountMax;
  audioPlayers.push(snd0 = new AudioPlayer());
  snd1 = new AudioPlayer();
  audioPlayers.push(snd1);
  snd2 = new AudioPlayer();
  audioPlayers.push(snd2);
  
  console.log("list of AudioPlayers: ", audioPlayers);
  
  snd0.lblVol.innerText = snd0.getRngVolume();
  snd1.lblVol.innerText = snd1.getRngVolume();
  snd2.lblVol.innerText = snd2.getRngVolume();
};

var btnCreateAP = document.getElementById("btnCreateAudioPlayer");
btnCreateAP.addEventListener("click", function() {
  if (soundNumber < 6) {
    audioPlayers.push(new AudioPlayer());
    console.log(audioPlayers);
  } else {
    alert("The maximum number of AudioPlayers (6) has been reached. No more can be created.");
  }
});
