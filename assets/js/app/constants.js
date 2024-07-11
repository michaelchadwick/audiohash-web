/* constants */
/* set any global constants */

const AH_ENV_PROD_URL = ['audiohash.neb.host', 'ah.neb.host']

const AH_SETTINGS_KEY = 'audiohash-settings'

const AH_APP_TITLE = 'Audio Hash'
const AH_APP_TAGLINE = 'mix multiple sounds into one'

const AH_CACHE_AUDIO_KEY = 'audiohash-cache-key'
const AH_DB_NAME = 'audiohash-db'
const AH_DB_STORE = 'ah_data'

const AH_STATUS_PLAYING = 'playing'
const AH_STATUS_STOPPED = 'stopped/finished'
const AH_STATUS_PAUSED = 'paused'
const AH_STATUS_UNLOADED = 'unloaded'
const AH_STATUS_LOADING = 'loading...'
const AH_STATUS_LOADED = 'loaded and ready'

const AH_INFO_UNLOADED = 'n/a'

const AH_ERROR_NO_WEB_AUDIO = 'Web Audio API not supported in this browser'
const AH_ERROR_DECODING = 'Error: cannot decode sound file'
const AH_ERROR_LENGTH = 'Error: sound file too long'
const AH_ERROR_SP_INCOMPLETE = 'Error: existing SoundPlayers need sounds'
const AH_ERROR_SP_COUNT_MAX_REACHED = 'Error: SoundPlayer max reached'
const AH_ERROR_SP_COUNT_MIN_NOT_MET = 'Error: SoundPlayer min (2) not met'

// TODO: make audioHash function work with other formats besides WAV
const AH_DEFAULT_FILES = [
  '/assets/audio/waymu1.wav',
  '/assets/audio/waymu2.wav',
  '/assets/audio/waymu3.wav',
]
const AH_SP_COUNT_INIT = 3
const AH_SP_COUNT_MAX = 10

/**
 * While testing and not actually doing any sampling,
 * we need to keep this small or else the sampler
 * function will crash the website
 */
const AH_FILE_MAX_LENGTH = 100000000

// const AH_CONVERT_TO_WAV_SCRIPT = '/assets/php/convert_to_wav.php'

const AH_ALLOWED_FORMATS = [
  // 'audio/aif',
  // 'audio/aiff',
  // 'audio/mpeg',
  'audio/wav',
]

const AH_WAV_BIT_DEPTH = 16

const NEBYOOAPPS_SOURCE_URL = 'https://dave.neb.host/?sites'
