var context = new (window.AudioContext || window.webkitAudioContext)();
var audioBuffer = null;

var AudioPlayer = {};

AudioPlayer.gainNode = null;
AudioPlayer.startOffset = 0;
AudioPlayer.startTime = 0;

AudioPlayer.play = function(startOffset) {
  if(!context.createGain)
    context.createGain = context.createGainNode;
  this.gainNode = context.createGain();

  var source = context.createBufferSource();
  source.buffer = audioBuffer;

  source.connect(this.gainNode);
  this.gainNode.connect(context.destination);
  source.loop = false;

  source.start(0, this.startOffset);
  this.source = source;
}

AudioPlayer.pause = function(curTime) {
  this.startOffset = curTime;
  this.source.stop();
}

AudioPlayer.changeVolume = function(element) {
  var volume = element.value;
  var fraction = parseInt(element.value) / parseInt(element.max);
  this.gainNode.gain.value = fraction * fraction;
}

AudioPlayer.stop = function() {
  if (!this.source.stop) {
    this.source.stop = source.noteOff;
  }
  this.source.stop(0);
}

AudioPlayer.toggle = function() {
  this.playing ? this.pause(context.currentTime) : this.play(this.startOffset);
  this.playing = !this.playing;
}

AudioPlayer.initSound = function(arrayBuffer) {
  context.decodeAudioData(arrayBuffer, function(buffer) {
    // audioBuffer is global to reuse the decoded audio later
    audioBuffer = buffer;
    var buttons = document.querySelectorAll('button');
    buttons[0].disabled = false;
    buttons[1].disabled = false;
  }, function(e) {
    console.log('Error decoding file', e);
  });
}

// User selects file, read it as an ArrayBuffer and pass to the API
var fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', function(e) {
  var reader = new FileReader();
  reader.onload = function(e) {
    AudioPlayer.initSound(this.result);
  };
  reader.readAsArrayBuffer(this.files[0]);
}, false);

// Load file from a URL as an ArrayBuffer
// Example: loading via xhr2: loadSoundFile('sounds/test.mp3');
function loadSoundFile(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function(e) {
    AudioPlayer.initSound(this.response); // this.response is an ArrayBuffer
  };
  xhr.send();
}
