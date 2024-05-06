// TODO: add IDB methods to SoundPlayer class

/*

_uploadToIDB(request, id, buf) {
  console.log('indexedDB opened successfully')
  console.log(request, id, buf)

  const db = request.result

  const transaction = db.transaction([AH_DB_STORE], 'readwrite')

  transaction.oncomplete = (e) => {
    console.log('transaction complete', e)
  }

  transaction.onerror = (e) => {
    console.error('transaction failed', e)
  }

  const objectStore = transaction.objectStore(AH_DB_STORE)

  console.log('_saveToIDB request.onsuccess buf:', buf)

  const objectStoreRequest = objectStore.put({ "id": id, "sound": buf })

  objectStoreRequest.onsuccess = (e) => {
    console.log('objectStoreRequest.onsuccess:', e)
  }

  objectStoreRequest.onerror = (e) => {
    console.log('objectStoreRequest.onerror:', e)
  }

  const query = objectStore.get(1)

  query.onsuccess = () => {
    console.log('query.onsuccess:', query.result)
  }

  query.onerror = (e) => {
    console.log('query.onerror:', e)
  }
}

// save file to Indexed DB for later retrieval on refresh
_saveToIDB(buf, id) {
  const request = indexedDB.open(AH_DB_NAME, 1)

  console.log('_saveToIDB buf:', buf)

  var that = this

  request.addEventListener('success', that._uploadToIDB.bind(null, request, id, buf))

  request.onerror = e => {
    console.error(`IndexedDB request.onerror: ${ e.target.errorCode }`)
  }

  request.onupgradeneeded = (e) => {
    console.log('IndexedDB request.onupgradeneeded:', e)

    const db = request.result

    let objectStore = db.createObjectStore(AH_DB_STORE, { keyPath: "id" })

    objectStore.createIndex("id", "id", { unique: true })
  }
}

// load file previously saved to Indexed DB
async _loadFromIDB(id) {}

*/
