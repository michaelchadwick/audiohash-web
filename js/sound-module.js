/**********************************************************
** Admixt - combine sounds for one sound sampler platter **
***********************************************************/

//// Global Constants
var SND_STATUS_PLAYING = "playing";
var SND_STATUS_STOPPED = "stopped/finished";
var SND_STATUS_PAUSED = "paused";
var SND_STATUS_UNLOADED = "unloaded";
var SND_STATUS_LOADING = "loading...";
var SND_STATUS_LOADED = "loaded and ready";
var SND_STATUS_ERROR = "error decoding file";

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
//// Number extension that will allow rounding to a specific decimal place
//// cribbed from http://www.jacklmoore.com/notes/rounding-in-javascript/
Number.prototype.round = function(decimals) {
  return Number(Math.round(this+'e'+decimals)+'e-'+decimals);
}

//// Admixt web application "class" module implementation
var Admixt = (function () { 
  //// Variables
  // private
  var _soundNumber = 0; // used to give each SP a unique ID
  var _soundPlayerMax = 10; // arbitrary, may change or go away
  var _soundPlayerArray = []; // holds all the existing SPs
  var _audioContext = function() {
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
  
  // public
  var isSPArrayEmpty = function() {
    var isEmpty = false;
    _soundPlayerArray.forEach(function(sound) {
      if (!sound.audioBuffer) {
        isEmpty = true;
      }
    });
    return isEmpty;
  }
  var getSoundNumber = function() {
    return _soundNumber;
  }
  var getAudioContext = function() {
    return _audioContext();
  }
  var getSoundPlayer = function(sId) {
    var position = _listSoundPlayerIds().indexOf(parseInt(sId));
    return _soundPlayerArray[position];
  }
  var getSoundPlayerArray = function() {
    return _soundPlayerArray;
  }
  var getSoundPlayerArrayLength = function() {
    return _soundPlayerArray.length;
  }
  var getSoundPlayerMax = function() {
    return _soundPlayerMax;
  }

  //// Functions
  // private
  function _listSoundPlayerIds() {
    var arrIds = [];
    for (var i = 0; i < _soundPlayerArray.length; i++) {
      arrIds.push(_soundPlayerArray[i].soundId)
    }
    return arrIds;
  }
  function _incSoundNumber() {
    _soundNumber++;
  }
  function _updateSoundPlayerCount() {
    document.getElementById("lblSoundPlayersCount").innerText = getSoundPlayerArrayLength();
  }
  function _displayHexDump(bufferString) {
    document.getElementById("hex-dump").style.display = "block";
    document.getElementById("hex-dump-contents").innerHTML = _hexDump(bufferString);
  }
  function _getSoundChannelsMin(sndArr) {
    var sndChannelsArr = [];
    sndArr.forEach(function(snd) {
      sndChannelsArr.push(snd.audioBuffer.numberOfChannels);
    });
    return Math.min.apply(Math, sndChannelsArr);
  }
  function _getSoundSlice(audioBuffer) {
    var sliceNumber = document.getElementById("txtSampleSize");
    var randBegin = Math.Random() * (audioBuffer.length - sliceNumber);
    var randEnd = randBegin + sliceNumber;
    return audioBuffer.slice(randBegin, randEnd);
  }
  function _enableDownload(blob, givenFilename) {
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.getElementById("linkDownloadSampler");
    var d = new Date();
    var defaultFilename = "sampler" + d.curDateTime() + ".wav";
    link.style.display = "inline";
    link.href = url;
    link.download = givenFilename || defaultFilename;
  }
  function _writePCMSamples(output, offset, input) {
    for (var i = 0; i < input.length; i++, offset+=2){
      var s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }
  function _writeString(view, offset, string) {
    for (var i = 0; i < string.length; i++){
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  } 
  function _encodeWavFile(samples, sampleRate) {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);
    
    // RIFF identifier
    _writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    _writeString(view, 8, 'WAVE');
    // format chunk identifier
    _writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // stereo (2 channels)
    view.setUint16(22, 2, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 4, true);
    // block align (channels * bytes/sample)
    view.setUint16(32, 4, true);
    // bits/sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    _writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);
    // write the PCM samples
    _writePCMSamples(view, 44, samples);
    
    return view;
  }
  function _hexDump(view) {
    var lines = [];
    
    for (var i = 0; i < view.length; i += 16) {
      var hex = [];
      var ascii = [];
        
      for (var x = 0; x < 16; x++) {
        var b = view.charCodeAt(i + x).toString(16).toUpperCase();
        b = b.length == 1 ? '0' + b : b;
        hex.push(b + " ");
        
        if (view.charCodeAt(i + x) > 126 || view.charCodeAt(i + x) < 32) {
            ascii.push('.');
        } else {
            ascii.push(view.charAt(i + x));
        }
        
        if ((x + 1) % 8 == 0) {
            hex.push(" ");
        }
      }
        
      lines.push([hex.join(''), ascii.join('')].join(''));
    }
    
    return lines.join('\n');
  }
  
  // public
  function createSoundPlayer(numOfPlayers) {
    var playerCount = (numOfPlayers || 1);
    if (playerCount <= 0) playerCount = 1;
    for (var i = 0; i < playerCount; i++) {
      _soundPlayerArray.push(new SoundPlayer());
      _incSoundNumber();
      _updateSoundPlayerCount();
    }

    return _soundPlayerArray[_soundPlayerArray.length-1];
  }
  function destroySoundPlayer(sId) {
    if (_soundPlayerArray.length > 1) {
      var position = _listSoundPlayerIds().indexOf(sId);
      _soundPlayerArray.splice(position, 1);
    } else {
      _soundPlayerArray = [];
    }
    
    var divSoundPlayers = document.getElementById("soundPlayers");
    divSoundPlayers.removeChild(document.getElementById("sound" + sId));
    _updateSoundPlayerCount();
  }
  function createSampler(sndArr) {
    var numberOfChannels = _getSoundChannelsMin(sndArr);
    var sndLengthSum = (function() {
      var lng = 0;
      for (var i = 0; i < sndArr.length; i++) {
        lng += sndArr[i].audioBuffer.length;
      }
      return lng;
    })();

    var samplerBuffer = getAudioContext().createBuffer(
      numberOfChannels,
      sndLengthSum,
      sndArr[0].audioBuffer.sampleRate
    );

    for (var i = 0; i < numberOfChannels; i++) {
      var channel = samplerBuffer.getChannelData(i);
      channel.set(sndArr[0].audioBuffer.getChannelData(i), 0);
      for (var j = 1; j < sndArr.length; j++) {
         channel.set(sndArr[j].audioBuffer.getChannelData(i), sndArr[j-1].audioBuffer.length);
      }
    }
        
    // encode our newly made audio blob into a wav file
    var dataView = _encodeWavFile(samplerBuffer, samplerBuffer.sampleRate);
    var audioBlob = new Blob([dataView], { type : 'audio/wav' });
        
    // post new wav file to download link
    _enableDownload(audioBlob);
    
    // makes a temp audio buffer source and plays the new sampler mix
    var mixDemo = document.getElementById("chkMixDemo");
    if (mixDemo.checked)
    {
      var audioSource = getAudioContext().createBufferSource();
      audioSource.buffer = samplerBuffer;
      audioSource.connect(getAudioContext().destination);
      audioSource.playbackRate.value = 1;
      audioSource.start();  
    }

    // post hex dump
    var dumpHex = document.getElementById("chkDumpHex");
    if (dumpHex.checked)
    {
      var decoder = new TextDecoder("utf-8");
      var decodedString = decoder.decode(dataView);
      _displayHexDump(decodedString);  
    }
  }
  
  // public functions
  return {
    isSPArrayEmpty:             isSPArrayEmpty,
    getSoundNumber:             getSoundNumber,
    getAudioContext:            getAudioContext,
    getSoundPlayer:             getSoundPlayer,
    getSoundPlayerArray:        getSoundPlayerArray,
    getSoundPlayerArrayLength:  getSoundPlayerArrayLength,
    getSoundPlayerMax:          getSoundPlayerMax,
    createSoundPlayer:          createSoundPlayer,
    destroySoundPlayer:         destroySoundPlayer,
    createSampler:              createSampler
  }
})();

//// SoundPlayer "class" module implementation
var SoundPlayer = function() {
  //// Variables
  var curSoundPlayer = this;
  this.soundId = Admixt.getSoundNumber();
  this.audioContext = Admixt.getAudioContext();
  this.audioBuffer = null;
  this.gainNode = this.audioContext.createGain();
  this.source = null;
  this.startTime = 0;
  this.startOffset = 0;
  this.isPaused = false;
  this.isStopped = true;
  this.isPlaying = false;
  
  //// Methods
  
  // change the internal gain node value
  var changeVolume = function(element) {
    var volume = element.srcElement.value;
    var volumeMax = element.srcElement.max;
    var fraction = parseInt(volume) / parseInt(volumeMax);
    var sId = element.srcElement.id.split("rngVolume")[1];
    var snd = Admixt.getSoundPlayer(sId);
    snd.gainNode.gain.value = fraction * fraction;
  };

  // initialize the volume to the range element's value
  var initVolume = function(element) {
    var volume = element.value;
    var volumeMax = element.max;
    var fraction = parseInt(volume) / parseInt(volumeMax);
    var sId = element.id.split("rngVolume")[1];
    var snd = Admixt.getSoundPlayer(sId);
    snd.gainNode.gain.value = fraction * fraction;
  }

  // update the volume label
  var updateVolumeLabel = function(e) {
    var rangeVolN = e.srcElement;
    var sId = this.id.split("rngVolume")[1];
    var lblVolumeId = "lblVolume".concat(sId);
    var lblVolumeN = document.getElementById(lblVolumeId);
    var newVol = rangeVolN.value;
    if (newVol < 100) newVol = "0" + newVol;
    if (newVol < 10) newVol = "0" + newVol;
    lblVolumeN.innerText = newVol;
  };

  // update the current sound status label
  var updateSoundStatus = function(sId, status) {
    var curSoundStatusId = "soundStatus".concat(sId);
    var curSoundStatusN = document.getElementById(curSoundStatusId);
    curSoundStatusN.innerText = status;
    if (status == SND_STATUS_PAUSED || status == SND_STATUS_STOPPED) {
      document.getElementById("sound" + sId).classList.remove("playing");
      document.getElementById("sound" + sId).classList.add("loaded");
    } else if (status == SND_STATUS_PLAYING) {
      document.getElementById("sound" + sId).classList.remove("loaded");
      document.getElementById("sound" + sId).classList.add("playing");
    } else if (status == SND_STATUS_LOADED) {
      document.getElementById("sound" + sId).classList.add("loaded");
    }
  };
  
  // clear sound info (whilst loading, etc.)
  var clearSoundInfo = function(sId) {
    var sndInfo = document.getElementById("soundInfo" + sId);
    sndInfo.innerHTML = "";
  }
  
  // displays info about the sound
  var updateSoundInfo = function(sId, msg) {
    console.log("updating sound info for sound#", sId);
    var sndInfo = document.getElementById("soundInfo" + sId);
    var snd = Admixt.getSoundPlayer(sId);
    console.log("updateSoundInfo snd", snd);
    if (msg) {
      sndInfo.style.display = "block";
      sndInfo.innerHTML = msg;
    } else {
      var sndDuration = snd.audioBuffer.duration;
      sndDuration = sndDuration > 60 ? (sndDuration / 60).round(2) + "m, " : sndDuration.round(2) + "s, ";
      var sndSampleRate = snd.audioBuffer.sampleRate / 1000;
      var sndChannels = snd.audioBuffer.numberOfChannels;
      sndInfo.style.display = "block";
      sndInfo.innerHTML = sndDuration + sndChannels + "ch, " + sndSampleRate.round(1) + "KHz";
    }
  }

  // load the sound into a buffer
  var initSound = function(arrayBuffer, soundPlayer, sId) {
    soundPlayer.audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      soundPlayer.audioBuffer = buffer;
      var btnP = document.getElementById("btnPlay" + sId);
      var btnS = document.getElementById("btnStop" + sId);
      btnP.disabled = false;
      btnS.disabled = false;
      updateSoundStatus(sId, SND_STATUS_LOADED);
      updateSoundInfo(sId);
    }, function(e) {
      console.warn(SND_STATUS_ERROR, e);
    });
  };
  
  // set audioBuffer to null and turn off play/pause/stop controls
  var disableSound = function(sId) {
    document.getElementById("sound" + sId).classList.remove("loaded");
    
    Admixt.getSoundPlayer(sId).audioBuffer = null;
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
      if (pauseOrStopStatus == SND_STATUS_STOPPED) {
        soundPlayerN.isStopped = true;
        soundPlayerN.isPaused = false;
        soundPlayerN.isPlaying = false;
        soundPlayerN.startOffset = 0;
      }
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
    var snd = Admixt.getSoundPlayer(sId);
    snd.startOffset = 0;
    snd.source.stop();
    snd.isPlaying = false;
    snd.isPaused = false;
    snd.isStopped = true;
    
    updateSoundStatus(snd.soundId, SND_STATUS_STOPPED);
  };

  // when the play/pause button is pressed, toggle the current sound's status
  var togglePlayState = function() {
    var sId = this.id.split("btnPlay")[1];
    var snd = Admixt.getSoundPlayer(sId);
    // if playing, pause and capture currentTime; if not, then play from startOffset
    snd.isPlaying ? pauseSound(snd) : playSound(snd);
    // flip playing mode status
    snd.isPlaying = !snd.isPlaying;
  };
  
  /*******************
  ** User Interface **
  *******************/
  this.soundDiv = document.createElement('div');
  this.soundHeader = document.createElement('div');
  this.soundDestroyer = document.createElement('div');
  this.soundStatus = document.createElement('div');
  this.soundInfo = document.createElement('div');
  this.fileUpload = document.createElement('input');
  this.rngVolume = document.createElement('input');
  this.lblVolume = document.createElement('label');
  this.btnPlay = document.createElement('button');
  this.btnStop = document.createElement('button');

  this.soundDiv.classList.add('sound');
  this.soundDiv.id = "sound" + this.soundId;
  this.soundHeader.classList.add("sound-header");
  this.soundHeader.innerText = "Sound " + this.soundId;
  this.soundDestroyer.id = "sound-destroyer" + this.soundId;
  this.soundDestroyer.classList.add("sound-destroyer");
  this.soundDestroyer.innerHTML = "<a href='#'>X</a>";
  this.soundDestroyer.addEventListener('click', function(e) {
    Admixt.destroySoundPlayer(curSoundPlayer.soundId);
  });
  this.soundStatus.id = "soundStatus" + this.soundId;
  this.soundStatus.classList.add('sound-status');
  this.soundStatus.innerText = SND_STATUS_UNLOADED;
  this.soundInfo.id = "soundInfo" + this.soundId;
  this.soundInfo.classList.add('sound-info');
  this.soundInfo.style.display = "none";

  this.fileUpload.id = "fileUpload" + this.soundId;
  this.fileUpload.type = "file";
  this.fileUpload.accept = "audio/*";
  this.fileUpload.addEventListener('change', function(e) {
    var reader = new FileReader();
    var sId = curSoundPlayer.soundId;
    clearSoundInfo(sId);
    reader.onloadstart = function(e) {
      console.log("onloadstart", this);
      updateSoundInfo(sId, SND_STATUS_LOADING);
    };
    reader.onload = function(e) {
      console.log("onload", this);
      console.log("this.result.byteLength", this.result.byteLength);
      // while testing and not actually doing any sampling, we need to keep this small
      // or else the sampler function will crash the website
      if (this.result.byteLength > 10000000) {
        alert("Sound is too long and can't be used.");
        disableSound(sId);
        this.abort();
      } else {
        initSound(this.result, curSoundPlayer, sId);
      }
    };
    reader.onabort = function(e) {
      console.log("onabort");
    };
    if (e.srcElement.value != ""){
      reader.readAsArrayBuffer(this.files[0]);
    } else {
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
  var initVol = this.rngVolume.value;
  if (initVol < 100) initVol = "0" + initVol;
  if (initVol < 10) initVol = "0" + initVol;
  this.lblVolume.innerText = initVol;

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
  this.soundHeader.appendChild(this.soundDestroyer);
  this.soundDiv.appendChild(this.soundStatus);
  this.soundDiv.appendChild(this.soundInfo);
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
  var createSP = document.getElementById("btnCreateSoundPlayer");
  var createSampler = document.getElementById("btnCreateSampler");
  var sampleSizeVal = document.getElementById("rngSampleSize");
  var sampleSizeTxt = document.getElementById("txtSampleSize");
  
  spCountMax.innerText = Admixt.getSoundPlayerMax();
  spCount.innerText = Admixt.getSoundNumber();
  createSP.addEventListener("click", function() {
    if (Admixt.getSoundPlayerArrayLength() < Admixt.getSoundPlayerMax()) {
      Admixt.createSoundPlayer();
    } else {
      alert("Can't create new SoundPlayer as the maximum number has been reached.");
    }
  });
  createSampler.addEventListener("click", function() {
    if (Admixt.getSoundPlayerArrayLength < 2) {
      alert("You need at least two sounds to make a sampler.");
    }
    else if (Admixt.isSPArrayEmpty()) {
      alert("You haven't loaded sounds into all of the existing SoundPlayers yet!");
    }
    else {
      Admixt.createSampler(Admixt.getSoundPlayerArray());
    }
  });
  sampleSizeVal.addEventListener("change", function(e) {
    sampleSizeTxt.value=e.srcElement.value;
  });
  sampleSizeTxt.value=sampleSizeVal.value;
}

window.onload = function() {
  initPageUI();
  
  Admixt.createSoundPlayer(2);
};
