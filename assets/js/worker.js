/**********************************
** AudioHash JS Dedicated Worker **
***********************************/

// worker event handler
this.onmessage = function(e) {
  console.log("Message received from main script");

  var workerFunctionParam = e.data[1];
  var workerResult;

  switch (e.data.command) {
    case "hexDump":
      workerResult = hexDump(e.data.buffer);
      break;
  }
};

/**********
  Methods
***********/

// hexDump
// input: DataView
// output: String[]
function hexDump(view) {
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

  postMessage({
    command: "hexDump",
    ascii: lines.join('\n')
  });
}