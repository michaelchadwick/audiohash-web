var context;
window.addEventListener('load', init, false);

function init() {
  try {
    // fix up prefixing
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    context = new AudioContext();
    console.log('Web Audio API supported!');
  }
  catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
}