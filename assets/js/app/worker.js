/* worker */
/* js background worker for hex dumping */

/**
 * hexDump
 * input: DataView
 * output: String[]
 */
function hexDump(view) {
  let lines = []

  for (let i = 0; i < view.length; i += 16) {
    let hex = []
    let ascii = []

    for (let x = 0; x < 16; x++) {
      let b = view
        .charCodeAt(i + x)
        .toString(16)
        .toUpperCase()

      b = b.length == 1 ? '0' + b : b
      hex.push(b + ' ')

      if (view.charCodeAt(i + x) > 126 || view.charCodeAt(i + x) < 32) {
        ascii.push('.')
      } else {
        ascii.push(view.charAt(i + x))
      }

      if ((x + 1) % 8 == 0) {
        hex.push(' ')
      }
    }

    lines.push([hex.join(''), ascii.join('')].join(''))
  }

  // send hex dump as ascii back to main thread
  postMessage({
    command: 'asciiDump',
    ascii: lines.join('\n'),
  })
}

// receive message from main thread
onmessage = function (msg) {
  // console.log('received msg from main js', msg.data)

  if (msg.isTrusted) {
    const command = msg.data.command
    const buffer = msg.data.buffer
    // let workerFunctionParam = msg.data[1]
    let workerResult = null

    console.log('Message received from main script:', command)

    switch (command) {
      case 'hexDump':
        workerResult = hexDump(buffer)
        break
    }
  } else {
    console.error('untrusted message posted to Web Worker!', msg)
  }
}
