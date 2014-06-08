// Add classification classes (don't need modernizer for such few classifications)
var touchClass = ('ontouchstart' in document.documentElement)? "touch" : "no-touch";
var ieClass = (navigator.userAgent.indexOf("MSIE ") !== -1 || navigator.userAgent.indexOf("Trident") !== -1)? "ie" : "no-ie";
var windowsClass = (navigator.appVersion.indexOf("Win") !== -1)? "win" : "no-win";
$("html").addClass(windowsClass);
$("html").addClass(touchClass);
$("html").addClass(ieClass);