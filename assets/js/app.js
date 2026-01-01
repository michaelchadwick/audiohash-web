// AudioHash object init
if (typeof AudioHash === 'undefined') var AudioHash = {}

const AH_ENV_PROD_URL = ['audiohash.neb.host', 'ah.neb.host', 'neb.host/apps/audiohash']

AudioHash.env = AH_ENV_PROD_URL.includes(document.location.hostname)
  ? 'prod'
  : 'local'

AudioHash._logStatus = (msg, arg = null) => {
  if (AudioHash.env == 'local') {
    if (arg) {
      console.log(msg, arg)
    } else {
      console.log(msg)
    }
  }
}

AudioHash._logStatus('[LOADED] /AudioHash')
