/* ==========================================================================
   album.js — página de um álbum (detalhes, faixas e ações)
   Usada por pages/album.html?id=..., pages/um.html e pages/son-of-spergy.html
   ========================================================================== */

let albumAberto = null;

/* ---------- Estado do player refletido na página ---------- */

// O álbum desta página é o que está tocando agora?
function albumEstaNoPlayer() {
    const atual = faixaAtual();
    return atual !== null && atual.albumId === albumAberto.id;
}

function atualizarBotaoPlay() {
    const tocando = albumEstaNoPlayer() && estadoPlayer.tocando;
    document.getElementById("icone-play-album").textContent = tocando ? "pause_circle" : "play_circle";
}

function htmlLinhaFaixa(faixa, numero) {
    const atual = faixaAtual();
    const ehAtual = atual !== null && atual.albumId === albumAberto.id && atual.faixaId === faixa.id;
    const icone = ehAtual && estadoPlayer.tocando ? "pause" : "play_arrow";

    return `
        <tr data-faixa="${escapar(faixa.id)}" class="${ehAtual ? "faixa-atual" : ""}">
            <td class="col-numero">
                <span class="numero">${numero}</span>
                <button type="button" class="btn-faixa" data-acao="tocar" title="Tocar" aria-label="Tocar ${escapar(faixa.titulo)}"><span class="material-symbols-outlined">${icone}</span></button>
            </td>
            <td>
                <p class="nome-musica">${escapar(faixa.titulo)}</p>
                <p class="artistas-musica">${escapar(faixa.artistas)}</p>
            </td>
            <td>${formatarNumero(faixa.reproducoes)}</td>
            <td>${formatarDuracao(faixa.duracao)}</td>
            <td class="col-acao">
                <button type="button" class="btn-icone" data-acao="fila" title="Adicionar à fila" aria-label="Adicionar ${escapar(faixa.titulo)} à fila"><span class="material-symbols-outlined">playlist_add</span></button>
            </td>
        </tr>`;
}

function renderizarFaixas() {
    // relê o álbum salvo, porque as reproduções mudam a cada faixa tocada
    const album = buscarAlbum(albumAberto.id) || albumAberto;
    albumAberto = album;

    const corpo = document.getElementById("corpo-faixas");
    corpo.innerHTML =
        album.faixas.length > 0
            ? album.faixas.map((faixa, posicao) => htmlLinhaFaixa(faixa, posicao + 1)).join("")
            : '<tr><td colspan="5" class="vazio">Este álbum ainda não tem faixas. Use "Editar álbum" para adicionar.</td></tr>';

    atualizarBotaoPlay();
}

/* ---------- Montagem da página ---------- */

function htmlAcoesBiblioteca(album) {
    return `
            <button type="button" class="btn-icone btn-favorito ${album.favorito ? "ativo" : ""}" id="btn-favorito" title="Favoritar" aria-label="Favoritar álbum" aria-pressed="${album.favorito}">
                <span class="material-symbols-outlined">favorite</span>
            </button>
            <div class="menu-album">
                <button type="button" class="btn-icone" id="btn-mais" title="Mais opções" aria-label="Mais opções" aria-haspopup="true">
                    <span class="material-symbols-outlined">more_horiz</span>
                </button>
                <ul class="menu-opcoes" id="menu-opcoes" hidden>
                    <li><button type="button" data-acao="fila-album">Adicionar álbum à fila</button></li>
                    <li><button type="button" data-acao="editar-album">Editar álbum</button></li>
                    <li><button type="button" data-acao="excluir-album" class="perigo">Excluir álbum</button></li>
                </ul>
            </div>`;
}

function htmlAcoesPrevia() {
    return '<button type="button" class="btn-primario" id="btn-adicionar-biblioteca">Adicionar à biblioteca</button>';
}

// previa = true: álbum vindo do iTunes que ainda não foi adicionado à biblioteca
function desenharAlbum(album, previa = false) {
    albumAberto = album;
    document.title = `${album.titulo} | Louvre Music`;

    document.getElementById("conteudo-album").innerHTML = `
        ${previa ? '<p class="aviso-previa">Prévia do iTunes: adicione o álbum à sua biblioteca para guardá-lo.</p>' : ""}
        <header class="cabecalho-album-info">
            <img src="${escapar(capaUrl(album))}" alt="Capa ${escapar(album.titulo)}" width="200">
            <div class="textos-album">
                <p class="tipo">Álbum</p>
                <h2>${escapar(album.titulo)}</h2>
                <p class="info-album">
                    <strong>${escapar(album.artista)}</strong> • ${album.ano} •
                    ${pluralizar(album.faixas.length, "música", "músicas")}, ${formatarTempoTotal(duracaoTotal(album))}
                </p>
                <p class="info-album">${escapar(album.genero)}</p>
            </div>
        </header>

        <div class="acoes-album">
            <button type="button" class="btn-play-grande" id="btn-tocar-album" title="Tocar álbum" aria-label="Tocar álbum">
                <span class="material-symbols-outlined play-grande" id="icone-play-album">play_circle</span>
            </button>
            ${previa ? htmlAcoesPrevia() : htmlAcoesBiblioteca(album)}
        </div>

        <table class="tabela-faixas">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Título</th>
                    <th>Reproduções</th>
                    <th><span class="material-symbols-outlined">schedule</span></th>
                    <th></th>
                </tr>
            </thead>
            <tbody id="corpo-faixas"></tbody>
        </table>
        <p class="nota-audio">Som: trechos de 30 s fornecidos pelo iTunes. Faixas sem trecho disponível tocam em modo simulado (sem áudio).</p>`;

    renderizarFaixas();
    ligarEventos();
}

function mostrarNaoEncontrado() {
    document.title = "Álbum não encontrado | Louvre Music";
    document.getElementById("conteudo-album").innerHTML = `
        <h2>Álbum não encontrado</h2>
        <p class="vazio">Esse álbum não existe (ou foi excluído). <a href="${caminho("index.html")}">Voltar para a Home</a>.</p>`;
}

/* ---------- Eventos ---------- */

function tocarOuPausarAlbum() {
    if (albumEstaNoPlayer()) alternarPlay();
    else tocarLista(itensDoAlbum(albumAberto), 0);
}

function tratarCliqueNaTabela(evento) {
    const botao = evento.target.closest("[data-acao]");
    if (!botao) return;

    const faixa = albumAberto.faixas.find((item) => item.id === botao.closest("tr").dataset.faixa);
    const posicao = albumAberto.faixas.indexOf(faixa);

    if (botao.dataset.acao === "fila") {
        adicionarAFila([criarItemFila(albumAberto, faixa)]);
        return;
    }

    // botão tocar: se for a faixa atual, só alterna play/pausa
    const atual = faixaAtual();
    if (atual && atual.albumId === albumAberto.id && atual.faixaId === faixa.id) alternarPlay();
    else tocarLista(itensDoAlbum(albumAberto), posicao);
}

async function excluirEsteAlbum() {
    const confirmou = await confirmarAcao("Excluir álbum", `Deseja excluir "${albumAberto.titulo}" da biblioteca? Essa ação não pode ser desfeita.`);
    if (!confirmou) return;

    excluirAlbum(albumAberto.id);
    removerAlbumDaFila(albumAberto.id);
    sessionStorage.setItem("louvre:aviso", `Álbum "${albumAberto.titulo}" excluído.`);
    location.href = caminho("index.html");
}

function tratarMenuDoAlbum(evento) {
    const acao = evento.target.dataset.acao;
    document.getElementById("menu-opcoes").hidden = true;

    if (acao === "fila-album") adicionarAFila(itensDoAlbum(albumAberto));
    if (acao === "editar-album") location.href = caminho(`pages/cadastro.html?editar=${encodeURIComponent(albumAberto.id)}`);
    if (acao === "excluir-album") excluirEsteAlbum();
}

function ligarEventos() {
    document.getElementById("btn-tocar-album").addEventListener("click", tocarOuPausarAlbum);
    document.getElementById("corpo-faixas").addEventListener("click", tratarCliqueNaTabela);
    document.getElementById("corpo-faixas").addEventListener("dblclick", (evento) => {
        const linha = evento.target.closest("tr[data-faixa]");
        if (!linha || evento.target.closest("button")) return;
        const posicao = albumAberto.faixas.findIndex((faixa) => faixa.id === linha.dataset.faixa);
        tocarLista(itensDoAlbum(albumAberto), posicao);
    });

    const botaoFavorito = document.getElementById("btn-favorito");
    if (!botaoFavorito) {
        document.getElementById("btn-adicionar-biblioteca").addEventListener("click", adicionarPreviaABiblioteca);
        return;
    }

    botaoFavorito.addEventListener("click", (evento) => {
        const atualizado = alternarFavorito(albumAberto.id);
        const botao = evento.currentTarget;
        botao.classList.toggle("ativo", atualizado.favorito);
        botao.setAttribute("aria-pressed", atualizado.favorito);
        mostrarToast(atualizado.favorito ? "Álbum adicionado aos favoritos." : "Álbum removido dos favoritos.");
    });

    document.getElementById("btn-mais").addEventListener("click", (evento) => {
        evento.stopPropagation();
        const menu = document.getElementById("menu-opcoes");
        menu.hidden = !menu.hidden;
    });
    document.getElementById("menu-opcoes").addEventListener("click", tratarMenuDoAlbum);
    document.addEventListener("click", () => {
        const menu = document.getElementById("menu-opcoes");
        if (menu) menu.hidden = true;
    });
}

/* ---------- Prévia de álbum do iTunes (pages/album.html?itunes=ID) ---------- */

async function adicionarPreviaABiblioteca(evento) {
    const botao = evento.currentTarget;
    botao.disabled = true;
    botao.textContent = "Adicionando...";

    const salvo = adicionarAlbum(albumAberto);
    sessionStorage.setItem("louvre:aviso", `Álbum "${salvo.titulo}" adicionado à biblioteca.`);
    location.replace(urlAlbum(salvo));
}

async function abrirPreviaItunes(idItunes) {
    const principal = document.getElementById("conteudo-album");

    // se o álbum já foi importado, mostra a versão da biblioteca
    const salvo = buscarAlbum(`itunes-${idItunes}`);
    if (salvo) {
        location.replace(urlAlbum(salvo));
        return;
    }

    principal.innerHTML = '<p class="vazio">Buscando álbum no iTunes...</p>';
    try {
        desenharAlbum(completarFaixas(await buscarAlbumCompletoNoItunes(idItunes)), true);
    } catch (erro) {
        console.error("Falha ao buscar o álbum no iTunes:", erro);
        principal.innerHTML = `
            <h2>Não foi possível carregar o álbum</h2>
            <p class="vazio">Verifique sua conexão e <a href="">tente novamente</a>, ou volte para a <a href="${caminho("index.html")}">Home</a>.</p>`;
    }
}

function iniciarPaginaAlbum() {
    const idItunes = new URLSearchParams(location.search).get("itunes");
    if (idItunes) {
        abrirPreviaItunes(idItunes);
        return;
    }

    const id = idAlbumDaPagina();
    const album = id ? buscarAlbum(id) : null;

    if (album) desenharAlbum(album);
    else mostrarNaoEncontrado();
}

document.addEventListener("DOMContentLoaded", iniciarPaginaAlbum);

// Quando a faixa muda (ou toca/pausa), a tabela acompanha
document.addEventListener("player:mudou", () => {
    if (albumAberto && document.getElementById("corpo-faixas")) renderizarFaixas();
});
