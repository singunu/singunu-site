// 첫 그리기 전에 언어·모드·스킨·모션을 정한다(깜빡임 방지). 언어는 주소(/ko)가 정한다
(function () {
  var d = document.documentElement, g = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var m = g("omph-mode"); if (m !== "light" && m !== "dark") m = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  d.lang = /^\/ko(\/|$)/.test(location.pathname) ? "ko" : "en";
  d.dataset.mode = m; d.dataset.motion = g("omph-motion") === "off" ? "off" : "on";
})();
