chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create(
      "../../src/web/index.html",
      {
        innerBounds: { width: 300, height: 440, minWidth: 300, maxWidth: 300, minHeight: 440, maxHeight: 440 }
      });
});
chrome.runtime.onMessage.addListener(function(msg,sender){
  console.log(msg);
});