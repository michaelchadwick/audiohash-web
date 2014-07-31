var soundNumber = 0;

// module for playing a sound
var AudioPlayer = (function() {
  // Variables
  var soundId;
  var audioContext;
  var audioBuffer;
  var gainNode;
  var source;
  var startOffset;

  var soundDiv;
  var soundHeader;
  var fileUpload;
  var rngVolume;
  var btnPlay;
  var btnStop;
  var lblVol;

  // Constructor
  var AudioPlayer = function() {
    soundId = soundNumber;
    console.log("soundId at construction", soundId);
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioBuffer = null;
    gainNode = audioContext.createGain();
    source = null;
    startOffset = 0;

    soundDiv = document.createElement('div');
    soundHeader = document.createElement('h3');
    fileUpload = document.createElement('input');
    rngVolume = document.createElement('input');
    btnPlay = document.createElement('button');
    btnStop = document.createElement('button');
    lblVol = document.createElement('label');

    soundDiv.classList.add('sound');
    soundHeader.innerText = "Sound " + soundId;

    fileUpload.id = "fileUpload" + soundId;
    fileUpload.type = "file";
    fileUpload.accept = "audio/*";
    fileUpload.addEventListener('change', function(e) {
      var reader = new FileReader();
      reader.onload = function(e) {
        AudioPlayer.initSound(this.result, AudioPlayer.getSoundId());
        console.log("soundId at initSound", AudioPlayer.getSoundId());
      };
      reader.readAsArrayBuffer(this.files[0]);
    }, false);

    rngVolume.id = "rngVolume" + soundId;
    rngVolume.type = "range";
    rngVolume.min = 0;
    rngVolume.max = 100;
    rngVolume.value = 100;
    rngVolume.addEventListener('input', AudioPlayer.changeVolume(this));
    rngVolume.addEventListener('change', function(e) {
      var rangeVolN = e.srcElement;
      var lblVolN = document.getElementById("lblVol" + soundId);
      
      lblVolN.innerText = rangeVolN.value;
      console.log("rngVolume" + soundId + ".value", rangeVolN.value);
      console.log("e", e);
    }, false);

    btnPlay.id = "btnPlay" + soundId;
    btnPlay.innerText = "Play/Pause";
    btnPlay.addEventListener('click', AudioPlayer.toggle);
    btnPlay.disabled = true;

    btnStop.id = "btnStop" + soundId;
    btnStop.innerText = "Stop";
    btnStop.addEventListener('click', AudioPlayer.stop);
    btnStop.disabled = true;

    lblVol.id = "lblVol" + soundId;
    lblVol.innerText = "100";

    document.body.appendChild(soundDiv);
    soundDiv.appendChild(soundHeader);
    soundDiv.appendChild(fileUpload);
    soundDiv.appendChild(rngVolume);
    soundDiv.appendChild(btnPlay);
    soundDiv.appendChild(btnStop);
    soundDiv.appendChild(lblVol);

    soundNumber++;
  }

  // Methods
  AudioPlayer.getSoundId = function() {
    return soundId;
  };
  AudioPlayer.getrngVolume = function() {
    return rngVolume.value;
  }

  AudioPlayer.play = function(startOffset) {
    if(!audioContext.createGain)
      audioContext.createGain = audioContext.createGainNode;
    gainNode = audioContext.createGain();

    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.loop = false;

    source.start(0, startOffset);
  }

  AudioPlayer.pause = function(curTime) {
    startOffset = curTime;
    source.stop();
  }

  AudioPlayer.changeVolume = function(element) {
    var volume = element.value;
    var fraction = parseInt(element.value) / parseInt(element.max);
    gainNode.gain.value = fraction * fraction;
  }

  AudioPlayer.stop = function() {
    if (!source.stop) {
      source.stop = source.noteOff;
    }
    startOffset = 0;
    source.stop(0);
  }

  AudioPlayer.toggle = function() {
    this.playing ? AudioPlayer.pause(audioContext.currentTime) : AudioPlayer.play(startOffset);
    this.playing = !this.playing;
  }

  AudioPlayer.initSound = function(arrayBuffer, sId) {
    audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      audioBuffer = buffer;
      console.log("btnPlay" + sId);
      var btnP = document.getElementById("btnPlay" + sId);
      btnP.disabled = false;
      var btnS = document.getElementById("btnStop" + sId);
      btnS.disabled = false;
    }, function(e) {
      console.log('Error decoding file', e);
    });
  }

  return AudioPlayer;
})();

window.onload = function() {
  var snd0 = new AudioPlayer();
  console.log("snd0.constructor.getSoundID", snd0.constructor.getSoundId());
  var snd1 = new AudioPlayer();
  console.log("snd1.constructor.getSoundID", snd1.constructor.getSoundId());
  var snd2 = new AudioPlayer();
  console.log("snd2.constructor.getSoundID", snd2.constructor.getSoundId());
}
