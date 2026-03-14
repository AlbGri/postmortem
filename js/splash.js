setTimeout(function() {
    var s = document.getElementById('splash-screen');
    if (s) {
        s.classList.add('splash-fade');
        setTimeout(function() { s.remove(); }, 500);
    }
}, 1500);
