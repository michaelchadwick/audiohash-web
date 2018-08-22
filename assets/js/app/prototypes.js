/* global define */

define(function () {
  return {
    prototypes: function() {
      /************************************************
        Useful Date function for generating filenames
      *************************************************/
      Date.prototype.curDateTime = function() {
        const year = this.getFullYear().toString()
        const month = (this.getMonth()+1).toString()
        const day = this.getDate().toString()
        const hh = this.getHours().toString()
        const mm = this.getMinutes().toString()
        const ss = this.getSeconds().toString()
        return year + (month[1] ? month : '0' + month[0]) + (day[1] ? day : '0' + day[0]) + '-' + (hh[1] ? hh : '0' + hh[0]) + (mm[1] ? mm : '0' + mm[0]) + (ss[1] ? ss : '0' + ss[0])
      }
      /*************************************************************************
        Number extension that will allow rounding to a specific decimal place
        (cribbed from http://www.jacklmoore.com/notes/rounding-in-javascript/)
      **************************************************************************/
      Number.prototype.round = function(decimals) {
        return Number(Math.round(this + 'e' + decimals) + 'e-' + decimals)
      }
    }
  }
})
