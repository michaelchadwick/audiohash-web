/* global define */

define(() => {
  return {
    AH_APP_TITLE: 'Audio Hash',
    AH_APP_TAGLINE: 'mix multiple sounds into one',

    AH_STATUS_PLAYING: 'playing',
    AH_STATUS_STOPPED: 'stopped/finished',
    AH_STATUS_PAUSED: 'paused',
    AH_STATUS_UNLOADED: 'unloaded',
    AH_STATUS_LOADING: 'loading...',
    AH_STATUS_LOADED: 'loaded and ready',

    AH_ERROR_NO_WEB_AUDIO: 'Web Audio API not supported in this browser',
    AH_ERROR_DECODING: 'Error: cannot decode sound file',
    AH_ERROR_LENGTH: 'Error: sound file too long',
    AH_ERROR_SP_INCOMPLETE: 'Error: existing SoundPlayers need sounds',
    AH_ERROR_SP_COUNT_MAX_REACHED: 'Error: SoundPlayer max reached',
    AH_ERROR_SP_COUNT_MIN_NOT_MET: 'Error: SoundPlayer min (2) not met',

    AH_INIT_SP_COUNT: 2,

    /**
     * While testing and not actually doing any sampling,
     * we need to keep this small or else the sampler
     * function will crash the website
     */
    AH_FILE_MAX_LENGTH: 100000000
  }
})
