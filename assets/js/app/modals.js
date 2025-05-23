/* various modal configs that get called during gameplay */
/* global AudioHash */

AudioHash.modalOpen = async (type) => {
  switch (type) {
    case 'help':
      this.myModal = new Modal(
        'perm',
        'How to use Audio Hash',
        `
          <p>Mix multiple sounds into one.</p>

          <ol class="help">
            <li>Create some SoundPlayers</li>
            <li>Load files into SoundPlayers</li>
            <li>Choose how much of each you want sampled</li>
            <li>Optionally: turn on "Play hash on make?" in Settings (gear icon) for an audio player to be created upon successful hash</li>
            <li>Click/tap '# MAKE HASH' and a download link to your new sampler will be created for you to download</li>
          </ol>

          <p>Creator: <a href="https://michaelchadwick.info">Mike</a>. Source: <a href="https://github.com/michaelchadwick/audiohash-web">Github</a>.</p>
        `,
        null,
        null
      )
      break

    case 'settings':
      let markup = `
        <div id="settings">
      `
      markup += `
          <!-- mixDemo -->
          <div class="setting-row">
            <div class="text">
              <div class="title">Play hash on make?</div>
              <div class="description">Create sound player for audio hash when created</div>
            </div>
            <div class="control">
              <div class="container">
                <div id="button-setting-mix-demo" data-status="" class="switch" onclick="AudioHash._changeSetting('mixDemo')">
                  <span class="knob"></span>
                </div>
              </div>
            </div>
          </div>
        `

      if (AudioHash.env == 'local') {
        markup += `
            <!-- dumpHex -->
            <div class="setting-row">
              <div class="text">
                <div class="title">Dump hex on make?</div>
                <div class="description">Dump the raw hex of the hash when it is created (experimental TODO)</div>
              </div>
              <div class="control">
                <div class="container">
                  <div id="button-setting-dump-hex" data-status="" class="switch" onclick="AudioHash._changeSetting('dumpHex')">
                    <span class="knob"></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- TODO: mixRate
            <div class="setting-row">
              <div class="text">
                <div class="title">Play mix rate</div>
                <div class="description">???</div>
              </div>
              <div class="control">
                <div class="container">
                  <input id="input-setting-mix-rate" type="number" min="1" max="500" value="100" pattern="[0-9]+" onchange="AudioHash._changeSetting('mixRate')">
                </div>
              </div>
            </div>
            -->
          `
      }

      markup += `
        </div>
      `
      this.myModal = new Modal('perm', 'Settings', markup, null, null)

      AudioHash._loadSettings()

      break

    case 'max-count-reached':
      this.myModal = new Modal(
        'temp',
        null,
        AH_ERROR_SP_COUNT_MAX_REACHED,
        null,
        null
      )
      break

    case 'min-count-unmet':
      this.myModal = new Modal(
        'temp',
        null,
        AH_ERROR_SP_COUNT_MIN_NOT_MET,
        null,
        null
      )
      break

    case 'sound-buffer-unmet':
      this.myModal = new Modal('temp', null, AH_ERROR_SP_INCOMPLETE, null, null)
      break
  }
}
