(function () {
    'use strict';

    const overlay = document.getElementById('schermata-privacy');
    const backdrop = document.getElementById('privacy-backdrop');
    const btnChiudi = document.getElementById('btn-chiudi-privacy');
    const btnApri = document.getElementById('privacy-toggle');

    function apri() {
        ModalUtils.apri(overlay, {
            focusEl: btnChiudi,
            onClose: chiudi
        });
    }

    function chiudi() {
        if (overlay.classList.contains('hidden')) return;
        ModalUtils.chiudi(overlay);
    }

    btnApri.addEventListener('click', apri);
    btnChiudi.addEventListener('click', chiudi);
    backdrop.addEventListener('click', chiudi);
})();
