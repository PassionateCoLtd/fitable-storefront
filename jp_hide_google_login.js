/* JP: hide the unavailable Google sign-in entry until its OAuth callback is repaired.
 * UI-only mitigation. Remove this script tag to restore the entry.
 */
(function () {
  'use strict';
  if (!/^(?:(?:www\.|m\.)?fitablejp\.com|(?:m\.)?jp\.fitablekorea\.com)$/.test(location.hostname)) return;
  if (document.getElementById('fitable-jp-hide-google-login')) return;
  var selector = 'a[onclick*="snsLogin"][onclick*="googleplus"]';
  var style = document.createElement('style');
  style.id = 'fitable-jp-hide-google-login';
  style.textContent = selector + '{display:none!important}' +
    'li:has(> ' + selector + '){display:none!important}';
  (document.head || document.documentElement).appendChild(style);
  function hideEntries() {
    var anchors = document.querySelectorAll(selector);
    for (var i = 0; i < anchors.length; i++) {
      var target = anchors[i].closest('li') || anchors[i];
      if (target.style.getPropertyValue('display') !== 'none') {
        target.style.setProperty('display', 'none', 'important');
      }
    }
  }
  hideEntries();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hideEntries, { once: true });
  // Cafe24 can render the social-login section after this script has loaded.
  var observer = new MutationObserver(hideEntries);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.__fitableJpHideGoogleLogin = 1;
})();
