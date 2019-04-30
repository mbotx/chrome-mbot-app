webview.addEventListener('newwindow', function(e) {
    window.open(e.targetUrl, '_blank');
})