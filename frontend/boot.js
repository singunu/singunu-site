// 첫 그리기 전에 언어·모드·스킨·모션을 정한다(깜빡임 방지). 언어는 주소(/ko)가 정한다
(function () {
  var d = document.documentElement, g = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var m = g("omph-mode"); if (m !== "light" && m !== "dark") m = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  d.lang = /^\/ko(\/|$)/.test(location.pathname) ? "ko" : "en";
  d.dataset.mode = m; d.dataset.motion = g("omph-motion") === "off" ? "off" : "on";
  // 글꼴 짝 후보 V-08(제목·본문): 고른 짝의 CSS만 붙인다. Shell이 토글을 바꾸면 omphFont를 다시 부른다
  var F = { "1": ["maru-buri/maru-buri.css", "wanted-sans/WantedSansVariable.css"], "2": ["hahmlet/hahmlet.css", "suit/suit.css"], "3": ["gowun-batang/gowun-batang.css", "ibm-plex-sans-kr/ibm-plex-sans-kr.css"] };
  window.omphFont = function (v) {
    if (!F[v]) v = "1";
    d.dataset.font = v;
    F[v].forEach(function (p) { if (!document.querySelector('link[href="/fonts/' + p + '"]')) { var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/fonts/" + p; document.head.appendChild(l); } });
  };
  var s = {}; try { s = JSON.parse(g("omph-variants") || "{}"); } catch (e) {}
  var q = /(?:^|,)font:([123])(?:,|$)/.exec(new URLSearchParams(location.search).get("variant") || "");
  window.omphFont(q ? q[1] : s.font);
})();
