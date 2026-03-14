(function () {
    'use strict';

    const overlay = document.getElementById('schermata-changelog');
    const backdrop = document.getElementById('changelog-backdrop');
    const btnChiudi = document.getElementById('btn-chiudi-changelog');
    const btnApri = document.getElementById('changelog-toggle');
    const contenuto = document.getElementById('changelog-contenuto');

    let caricato = false;

    function parseChangelog(md) {
        const righe = md.split('\n');
        let html = '';
        for (const riga of righe) {
            const trimmed = riga.trim();
            if (!trimmed || trimmed === '---' || trimmed.startsWith('# ')) continue;
            if (trimmed.startsWith('## ')) {
                const testo = trimmed.replace(/^## \[(.+?)\] - (.+)$/, '<strong>$1</strong> &mdash; $2');
                html += `<h3 class="changelog-version">${testo}</h3>`;
            } else if (trimmed.startsWith('- ')) {
                html += `<p class="changelog-item">${trimmed.substring(2)}</p>`;
            }
        }
        return html;
    }

    async function carica() {
        if (caricato) return;
        try {
            const resp = await fetch('./CHANGELOG.md');
            if (!resp.ok) throw new Error(resp.status);
            const md = await resp.text();
            contenuto.innerHTML = parseChangelog(md);
            caricato = true;
        } catch {
            contenuto.innerHTML = '<p>Impossibile caricare le novità.</p>';
        }
    }

    function apri() {
        overlay.classList.remove('hidden');
        carica();
    }

    function chiudi() {
        overlay.classList.add('hidden');
    }

    btnApri.addEventListener('click', apri);
    btnChiudi.addEventListener('click', chiudi);
    backdrop.addEventListener('click', chiudi);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !overlay.classList.contains('hidden')) chiudi();
    });
})();
