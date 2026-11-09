/* ==========================================================================
   utils.js — funções de apoio usadas por várias páginas
   (texto seguro, formatação de tempo, capas, avisos e confirmação)
   ========================================================================== */

// Álbuns que possuem uma página .html própria (os demais usam pages/album.html?id=...)
const PAGINAS_PROPRIAS = ["um", "son-of-spergy"];

// Evita que um texto digitado pelo usuário vire HTML ("<b>" etc.) ao usar innerHTML
function escapar(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// 225 -> "3:45"
function formatarDuracao(segundos) {
    const minutos = Math.floor(segundos / 60);
    const resto = Math.floor(segundos % 60);
    return `${minutos}:${String(resto).padStart(2, "0")}`;
}

// 1249 -> "20 min 49 s"  |  4000 -> "1 h 6 min"
function formatarTempoTotal(segundos) {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const resto = segundos % 60;
    if (horas > 0) return `${horas} h ${minutos} min`;
    return `${minutos} min ${resto} s`;
}

// 1861772 -> "1.861.772"
function formatarNumero(numero) {
    return numero === null || numero === undefined ? "—" : numero.toLocaleString("pt-BR");
}

function pluralizar(quantidade, singular, plural) {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/* ---------- Capas e links ---------- */

// Capa desenhada na hora (SVG) para álbuns cadastrados sem imagem
function capaPadrao(titulo) {
    const inicial = escapar((titulo || "?").trim().charAt(0).toUpperCase());
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="#1db954"/><stop offset="1" stop-color="#191414"/></linearGradient></defs>` +
        `<rect width="300" height="300" fill="url(#g)"/>` +
        `<text x="150" y="195" font-size="140" font-family="monospace" font-weight="bold" fill="#fff" text-anchor="middle">${inicial}</text>` +
        `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// Endereço da capa: link externo, imagem do projeto (assets/...) ou capa padrão
function capaUrl(album) {
    if (!album.capa) return capaPadrao(album.titulo);
    if (/^(https?:|data:)/i.test(album.capa)) return album.capa;
    return caminho(album.capa);
}

// Página do álbum
function urlAlbum(album) {
    if (PAGINAS_PROPRIAS.includes(album.id)) return caminho(`pages/${album.id}.html`);
    return caminho(`pages/album.html?id=${encodeURIComponent(album.id)}`);
}

// Página de prévia de um álbum que vem da API do iTunes (ainda não está na biblioteca)
function urlAlbumItunes(idItunes) {
    return caminho(`pages/album.html?itunes=${encodeURIComponent(idItunes)}`);
}

// HTML de um card de álbum (usado na Home e no Perfil)
function htmlCardAlbum(album) {
    return `
        <article class="card-album">
            <a href="${urlAlbum(album)}">
                <img src="${escapar(capaUrl(album))}" alt="Capa ${escapar(album.titulo)}" loading="lazy">
                <h3>${escapar(album.titulo)}</h3>
                <p>${escapar(album.artista)}</p>
            </a>
        </article>`;
}

/* ---------- Avisos (toast) ---------- */

function mostrarToast(mensagem, tipo = "sucesso") {
    let area = document.getElementById("area-toasts");
    if (!area) {
        area = document.createElement("div");
        area.id = "area-toasts";
        area.setAttribute("aria-live", "polite");
        document.body.appendChild(area);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    area.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
}

/* ---------- Confirmação (janela própria no lugar do confirm() do navegador) ---------- */

// Devolve uma Promise: true se o usuário confirmar, false se cancelar
function confirmarAcao(titulo, texto, textoBotao = "Excluir") {
    return new Promise((resolver) => {
        const janela = document.createElement("dialog");
        janela.className = "modal modal-confirmacao";
        janela.innerHTML = `
            <h3>${escapar(titulo)}</h3>
            <p>${escapar(texto)}</p>
            <div class="grupo-acoes-form">
                <button type="button" class="btn-secundario" data-resposta="nao">Cancelar</button>
                <button type="button" class="btn-primario btn-perigo" data-resposta="sim">${escapar(textoBotao)}</button>
            </div>`;
        document.body.appendChild(janela);

        const fechar = (resposta) => {
            janela.close();
            janela.remove();
            resolver(resposta);
        };

        janela.addEventListener("click", (evento) => {
            const resposta = evento.target.dataset.resposta;
            if (resposta) fechar(resposta === "sim");
        });
        janela.addEventListener("cancel", (evento) => { // tecla Esc
            evento.preventDefault();
            fechar(false);
        });

        janela.showModal();
        janela.querySelector('[data-resposta="nao"]').focus();
    });
}

/* ---------- Página atual ---------- */

// Id do álbum aberto na página (páginas próprias usam data-album-id; as demais usam ?id=...)
function idAlbumDaPagina() {
    return document.body.dataset.albumId || new URLSearchParams(location.search).get("id");
}
