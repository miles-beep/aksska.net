/* Local no-op replacement for missing archived viewimageresize.js */
(function () {
  if (typeof window !== 'undefined' && typeof window.viewImageResize !== 'function') {
    window.viewImageResize = function () {};
  }
})();
