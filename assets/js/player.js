/* ==========================================================================
   player.js — player do rodapé e fila de reprodução
   Não há arquivos de áudio no projeto: a reprodução é simulada com um
   cronômetro. O estado (fila, faixa atual, tempo e volume) fica no
   localStorage, por isso a música "continua" ao trocar de página.
   ========================================================================== */

const CHAVE_PLAYER = "louvre:player";

// fila: lista de faixas | indice: posição da faixa atual na fila (-1 = nenhuma)
let estadoPlayer = {
    fila: [],
    indice: -1,
    tocando: false,
    progresso: 0, // segundos já tocados da faixa atual
    volume: 50,
    mudo: false,
    ...lerStorage(CHAVE_PLAYER, {}),
};

// Se o que foi salvo estiver inconsistente, começa do zero
if (!Array.isArray(estadoPlayer.fila) || estadoPlayer.indice >= estadoPlayer.fila.length) {
    estadoPlayer.fila = [];
    estadoPlayer.indice = -1;
    estadoPlayer.tocando = false;
}

/* ---------- Estado ---------- */

function faixaAtual() {
    return estadoPlayer.fila[estadoPlayer.indice] || null;
}

// Salva, redesenha o rodapé/fila e avisa as páginas (evento "player:mudou")
function avisarMudanca() {
    salvarStorage(CHAVE_PLAYER, estadoPlayer);
    renderizarPlayer();
    renderizarFila();
    document.dispatchEvent(new CustomEvent("player:mudou"));
}

// Resumo de uma faixa para guardar na fila
function criarItemFila(album, faixa) {
    return {
        albumId: album.id,
        albumTitulo: album.titulo,
        faixaId: faixa.id,
        titulo: faixa.titulo,
        artistas: faixa.artistas,
        capa: album.capa,
        duracao: faixa.duracao,
    };
}

function itensDoAlbum(album) {
    return album.faixas.map((faixa) => criarItemFila(album, faixa));
}

// Conta a reprodução e registra no histórico (chamada quando uma faixa começa)
function iniciarFaixaAtual() {
    const faixa = faixaAtual();
    if (!faixa) return;

    estadoPlayer.progresso = 0;
    registrarReproducao(faixa.albumId, faixa.faixaId);
    registrarHistorico(faixa);
}

/* ---------- Controles ---------- */

// Substitui a fila por uma lista de faixas e começa a tocar em "posicao"
function tocarLista(itens, posicao = 0) {
    if (itens.length === 0) {
        mostrarToast("Este álbum não tem faixas para tocar.", "erro");
        return;
    }
    estadoPlayer.fila = itens;
    estadoPlayer.indice = posicao;
    estadoPlayer.tocando = true;
    iniciarFaixaAtual();
    avisarMudanca();
}

function tocarAlbum(albumId, posicao = 0) {
    const album = buscarAlbum(albumId);
    if (album) tocarLista(itensDoAlbum(album), posicao);
}

// Toca uma faixa que já está na fila
function tocarItemDaFila(posicao) {
    estadoPlayer.indice = posicao;
    estadoPlayer.tocando = true;
    iniciarFaixaAtual();
    avisarMudanca();
}

function alternarPlay() {
    if (!faixaAtual()) return;
    estadoPlayer.tocando = !estadoPlayer.tocando;
    avisarMudanca();
}

function proxima() {
    if (estadoPlayer.indice < estadoPlayer.fila.length - 1) {
        estadoPlayer.indice++;
        estadoPlayer.tocando = true;
        iniciarFaixaAtual();
    } else {
        // acabou a fila: para e volta ao início da última faixa
        estadoPlayer.tocando = false;
        estadoPlayer.progresso = 0;
    }
    avisarMudanca();
}

function anterior() {
    if (!faixaAtual()) return;

    // Depois de 3 segundos, "anterior" reinicia a faixa (como no Spotify)
    if (estadoPlayer.progresso > 3 || estadoPlayer.indice === 0) {
        estadoPlayer.progresso = 0;
    } else {
        estadoPlayer.indice--;
        estadoPlayer.tocando = true;
        iniciarFaixaAtual();
    }
    avisarMudanca();
}

// Cada segundo, avança o tempo da faixa que está tocando
function passarSegundo() {
    const faixa = faixaAtual();
    if (!estadoPlayer.tocando || !faixa) return;

    estadoPlayer.progresso++;

    if (estadoPlayer.progresso >= faixa.duracao) {
        proxima();
    } else {
        salvarStorage(CHAVE_PLAYER, estadoPlayer);
        atualizarProgresso();
    }
}

/* ---------- Fila ---------- */

function adicionarAFila(itens) {
    estadoPlayer.fila.push(...itens);
    if (estadoPlayer.indice === -1) estadoPlayer.indice = 0; // fila vazia: a 1ª faixa fica pronta
    avisarMudanca();
    mostrarToast(itens.length === 1 ? "Faixa adicionada à fila." : `${itens.length} faixas adicionadas à fila.`);
}

// Remove sem avisar (usada por removerDaFila e removerAlbumDaFila)
function retirarDaFila(posicao) {
    const eraAtual = posicao === estadoPlayer.indice;
    estadoPlayer.fila.splice(posicao, 1);

    if (posicao < estadoPlayer.indice) {
        estadoPlayer.indice--;
    } else if (eraAtual) {
        estadoPlayer.progresso = 0;
        if (estadoPlayer.fila.length === 0) {
            estadoPlayer.indice = -1;
            estadoPlayer.tocando = false;
        } else if (estadoPlayer.indice >= estadoPlayer.fila.length) {
            estadoPlayer.indice = estadoPlayer.fila.length - 1; // era a última
            estadoPlayer.tocando = false;
        } else if (estadoPlayer.tocando) {
            iniciarFaixaAtual(); // a próxima faixa assume o lugar
        }
    }
}

function removerDaFila(posicao) {
    retirarDaFila(posicao);
    avisarMudanca();
}

// Tira da fila todas as faixas de um álbum (usada quando o álbum é excluído)
function removerAlbumDaFila(albumId) {
    for (let posicao = estadoPlayer.fila.length - 1; posicao >= 0; posicao--) {
        if (estadoPlayer.fila[posicao].albumId === albumId) retirarDaFila(posicao);
    }
    avisarMudanca();
}

// Remove só o que vem depois da faixa atual
function limparFila() {
    estadoPlayer.fila = estadoPlayer.fila.slice(0, estadoPlayer.indice + 1);
    avisarMudanca();
}

/* ---------- Rodapé ---------- */

function linkDaFaixa(faixa) {
    if (buscarAlbum(faixa.albumId)) return urlAlbum({ id: faixa.albumId });
    if (faixa.albumId.startsWith("itunes-")) return urlAlbumItunes(faixa.albumId.replace("itunes-", ""));
    return caminho("index.html");
}

function atualizarProgresso() {
    const faixa = faixaAtual();
    const barra = document.getElementById("player-progresso");
    if (!barra) return;

    barra.max = faixa ? faixa.duracao : 0;
    barra.value = faixa ? estadoPlayer.progresso : 0;
    document.getElementById("player-tempo-atual").textContent = formatarDuracao(faixa ? estadoPlayer.progresso : 0);
    document.getElementById("player-tempo-total").textContent = formatarDuracao(faixa ? faixa.duracao : 0);
}

function renderizarPlayer() {
    const titulo = document.getElementById("player-titulo");
    if (!titulo) return; // a página ainda não carregou o rodapé

    const faixa = faixaAtual();
    const capa = document.getElementById("player-capa");

    titulo.textContent = faixa ? faixa.titulo : "Nada tocando";
    document.getElementById("player-artista").textContent = faixa ? faixa.artistas : "Escolha uma música";

    capa.hidden = !faixa;
    if (faixa) {
        capa.src = capaUrl({ capa: faixa.capa, titulo: faixa.albumTitulo });
        capa.alt = `Capa de ${faixa.albumTitulo}`;
        document.getElementById("player-link").href = linkDaFaixa(faixa);
    }

    const icone = document.getElementById("icone-play");
    icone.textContent = estadoPlayer.tocando ? "pause_circle" : "play_circle";
    document.getElementById("btn-play").title = estadoPlayer.tocando ? "Pausar" : "Tocar";

    // faixas depois da atual
    const aSeguir = Math.max(0, estadoPlayer.fila.length - estadoPlayer.indice - 1);
    const selo = document.getElementById("selo-fila");
    selo.hidden = aSeguir === 0;
    selo.textContent = aSeguir;

    const semVolume = estadoPlayer.mudo || estadoPlayer.volume === 0;
    document.getElementById("icone-volume").textContent = semVolume ? "volume_off" : estadoPlayer.volume < 50 ? "volume_down" : "volume_up";
    document.getElementById("volume").value = estadoPlayer.mudo ? 0 : estadoPlayer.volume;

    atualizarProgresso();
}

/* ---------- Modal da fila ---------- */

function htmlItemFila(item, posicao, atual) {
    return `
        <li class="item-fila ${atual ? "atual" : ""}" data-posicao="${posicao}">
            <button type="button" class="item-fila-tocar" data-acao="tocar" title="Tocar esta faixa">
                <img src="${escapar(capaUrl({ capa: item.capa, titulo: item.albumTitulo }))}" alt="" width="40">
                <span class="info-item">
                    <span class="titulo">${escapar(item.titulo)}</span>
                    <span class="detalhes">${escapar(item.artistas)}</span>
                </span>
                <span class="duracao-fila">${formatarDuracao(item.duracao)}</span>
            </button>
            ${atual ? "" : `<button type="button" class="btn-icone" data-acao="remover" title="Remover da fila" aria-label="Remover ${escapar(item.titulo)} da fila"><span class="material-symbols-outlined">close</span></button>`}
        </li>`;
}

function renderizarFila() {
    const conteudo = document.getElementById("conteudo-fila");
    const modal = document.getElementById("modal-fila");
    if (!conteudo || !modal.open) return; // só desenha com o modal aberto

    const atual = faixaAtual();
    const seguintes = estadoPlayer.fila.slice(estadoPlayer.indice + 1);

    let html = '<h4>Tocando agora</h4>';
    html += atual
        ? `<ul class="lista-fila">${htmlItemFila(atual, estadoPlayer.indice, true)}</ul>`
        : '<p class="vazio">Nada tocando. Toque um álbum ou adicione faixas à fila.</p>';

    html += `<div class="titulo-secao-fila"><h4>A seguir (${seguintes.length})</h4>`;
    if (seguintes.length > 0) {
        html += '<button type="button" class="btn-secundario" data-acao="limpar">Limpar fila</button>';
    }
    html += "</div>";

    html += seguintes.length > 0
        ? `<ul class="lista-fila">${seguintes.map((item, deslocamento) => htmlItemFila(item, estadoPlayer.indice + 1 + deslocamento, false)).join("")}</ul>`
        : '<p class="vazio">A fila está vazia. Use o botão + nas faixas dos álbuns para adicionar músicas.</p>';

    conteudo.innerHTML = html;
}

function abrirFila() {
    document.getElementById("modal-fila").showModal();
    renderizarFila();
}

function tratarCliqueNaFila(evento) {
    const botao = evento.target.closest("[data-acao]");
    if (!botao) return;

    if (botao.dataset.acao === "limpar") {
        limparFila();
        return;
    }

    const posicao = Number(botao.closest("li").dataset.posicao);
    if (botao.dataset.acao === "tocar") tocarItemDaFila(posicao);
    if (botao.dataset.acao === "remover") removerDaFila(posicao);
}

/* ---------- Inicialização (chamada depois que o rodapé é carregado) ---------- */

function iniciarPlayer() {
    if (!document.getElementById("btn-play")) return;

    document.getElementById("btn-play").addEventListener("click", alternarPlay);
    document.getElementById("btn-proxima").addEventListener("click", proxima);
    document.getElementById("btn-anterior").addEventListener("click", anterior);
    document.getElementById("btn-fila").addEventListener("click", abrirFila);

    const modal = document.getElementById("modal-fila");
    document.getElementById("btn-fechar-fila").addEventListener("click", () => modal.close());
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) modal.close(); // clique fora da janela
    });
    document.getElementById("conteudo-fila").addEventListener("click", tratarCliqueNaFila);

    // Barra de progresso: arrastar muda o ponto da faixa
    document.getElementById("player-progresso").addEventListener("input", (evento) => {
        estadoPlayer.progresso = Number(evento.target.value);
        salvarStorage(CHAVE_PLAYER, estadoPlayer);
        atualizarProgresso();
    });

    // Volume
    document.getElementById("volume").addEventListener("input", (evento) => {
        estadoPlayer.volume = Number(evento.target.value);
        estadoPlayer.mudo = false;
        salvarStorage(CHAVE_PLAYER, estadoPlayer);
        renderizarPlayer();
    });
    document.getElementById("btn-mudo").addEventListener("click", () => {
        estadoPlayer.mudo = !estadoPlayer.mudo;
        salvarStorage(CHAVE_PLAYER, estadoPlayer);
        renderizarPlayer();
    });

    renderizarPlayer();
    setInterval(passarSegundo, 1000);
}
