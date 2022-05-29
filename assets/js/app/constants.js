/* constants */
/* set any global constants */

const ENV_PROD_URL = [
  'https://audiohash.neb.host',
  'https://ah.neb.host'
]

const LS_SETTINGS_KEY = 'audiohash-settings'

const AH_APP_TITLE = 'Audio Hash'
const AH_APP_TAGLINE = 'mix multiple sounds into one'

const AH_STATUS_PLAYING = 'playing'
const AH_STATUS_STOPPED = 'stopped/finished'
const AH_STATUS_PAUSED = 'paused'
const AH_STATUS_UNLOADED = 'unloaded'
const AH_STATUS_LOADING = 'loading...'
const AH_STATUS_LOADED = 'loaded and ready'

const AH_ERROR_NO_WEB_AUDIO = 'Web Audio API not supported in this browser'
const AH_ERROR_DECODING = 'Error: cannot decode sound file'
const AH_ERROR_LENGTH = 'Error: sound file too long'
const AH_ERROR_SP_INCOMPLETE = 'Error: existing SoundPlayers need sounds'
const AH_ERROR_SP_COUNT_MAX_REACHED = 'Error: SoundPlayer max reached'
const AH_ERROR_SP_COUNT_MIN_NOT_MET = 'Error: SoundPlayer min (2) not met'

const AH_INIT_SP_COUNT = 2

/**
  * While testing and not actually doing any sampling,
  * we need to keep this small or else the sampler
  * function will crash the website
  */
const AH_FILE_MAX_LENGTH = 100000000
