/* ==========================================================================
   busca.js — biblioteca (sidebar) e busca
   ========================================================================== */

/* ---------- Biblioteca (sidebar) ---------- */

// Desenha a lista de álbuns da biblioteca, já aplicando o texto da busca.
function renderizarBiblioteca() {
    const lista = document.getElementById("lista-biblioteca");
    if (!lista) return;

    const campo = document.getElementById("busca-biblioteca");
    const termo = campo ? campo.value : "";
    const todos = carregarAlbuns();
    const albuns = pesquisarAlbuns(todos, termo);
    const idAtual = idAlbumDaPagina();

    if (albuns.length === 0) {
        const mensagem = todos.length === 0 ? "Sua biblioteca está vazia." : "Nenhum álbum encontrado.";
        lista.innerHTML = `<li class="vazio">${mensagem}</li>`;
        return;
    }

    lista.innerHTML = albuns
        .map(
            (album) => `
            <li>
                <a href="${urlAlbum(album)}" class="${album.id === idAtual ? "ativo" : ""}">
                    <img src="${escapar(capaUrl(album))}" alt="Capa ${escapar(album.titulo)}" width="48" loading="lazy">
                    <div class="info-item">
                        <p class="titulo">${escapar(album.titulo)}</p>
                        <p class="detalhes">Álbum • ${escapar(album.artista)}</p>
                    </div>
                </a>
            </li>`
        )
        .join("");
}

function iniciarBiblioteca() {
    const campo = document.getElementById("busca-biblioteca");
    if (!campo) return;

    renderizarBiblioteca();
    campo.addEventListener("input", renderizarBiblioteca);
}

/* ---------- Busca global (header) ---------- */

let temporizadorBusca = null;
let numeroDaBusca = 0; // identifica a busca mais recente (respostas atrasadas são descartadas)

function fecharResultadosBusca() {
    const painel = document.getElementById("resultados-busca");
    if (painel) painel.hidden = true;
}

// Faixas (de qualquer álbum da biblioteca) cujo título contém o termo
function pesquisarFaixas(albuns, termo) {
    const busca = normalizar(termo);
    const encontradas = [];

    albuns.forEach((album) => {
        album.faixas.forEach((faixa, posicao) => {
            if (normalizar(faixa.titulo).includes(busca)) encontradas.push({ album, faixa, posicao });
        });
    });
    return encontradas;
}

function htmlResultadoAlbum(album, href, rotulo) {
    return `
        <a class="resultado-item" href="${href}">
            <img src="${escapar(capaUrl(album))}" alt="" width="40" height="40" loading="lazy">
            <span class="info-item">
                <span class="titulo">${escapar(album.titulo)}</span>
                <span class="detalhes">${rotulo}</span>
            </span>
        </a>`;
}

function htmlResultadosItunes(resultados) {
    // não repete o que já está na biblioteca
    const novos = resultados.filter((album) => !albumItunesJaImportado(album));
    if (novos.length === 0) return '<p class="vazio">Nenhum álbum novo no iTunes.</p>';

    return novos
        .map((album) =>
            htmlResultadoAlbum(
                album,
                urlAlbumItunes(album.id.replace("itunes-", "")),
                `Álbum • ${escapar(album.artista)} • ${album.ano}`
            )
        )
        .join("");
}

async function executarBusca(termo) {
    const painel = document.getElementById("resultados-busca");
    const busca = ++numeroDaBusca;

    if (termo === "") {
        fecharResultadosBusca();
        return;
    }

    const albuns = carregarAlbuns();
    const albunsEncontrados = pesquisarAlbuns(albuns, termo).slice(0, 5);
    const faixasEncontradas = pesquisarFaixas(albuns, termo).slice(0, 5);
    const consultarApi = termo.length >= 3;

    let html = "";
    if (albunsEncontrados.length > 0) {
        html += '<h4>Álbuns</h4>';
        html += albunsEncontrados
            .map((album) => htmlResultadoAlbum(album, urlAlbum(album), `Álbum • ${escapar(album.artista)} • ${album.ano}`))
            .join("");
    }
    if (faixasEncontradas.length > 0) {
        html += '<h4>Músicas</h4>';
        html += faixasEncontradas
            .map(
                ({ album, faixa, posicao }) => `
                <button type="button" class="resultado-item" data-album="${escapar(album.id)}" data-posicao="${posicao}">
                    <img src="${escapar(capaUrl(album))}" alt="" width="40" height="40" loading="lazy">
                    <span class="info-item">
                        <span class="titulo">${escapar(faixa.titulo)}</span>
                        <span class="detalhes">Música • ${escapar(faixa.artistas)}</span>
                    </span>
                </button>`
            )
            .join("");
    }
    if (albunsEncontrados.length === 0 && faixasEncontradas.length === 0 && !consultarApi) {
        html += `<p class="vazio">Nada na sua biblioteca para "${escapar(termo)}".</p>`;
    }
    if (consultarApi) {
        html += '<h4>No iTunes</h4><div id="busca-itunes-resultados"><p class="vazio">Buscando no iTunes...</p></div>';
    }

    painel.innerHTML = html;
    painel.hidden = false;
    if (!consultarApi) return;

    // A API demora mais: os resultados da biblioteca já aparecem, os do iTunes entram depois
    let htmlApi;
    try {
        htmlApi = htmlResultadosItunes(await buscarAlbunsNoItunes(termo, 5));
    } catch (erro) {
        console.error("Falha ao consultar o iTunes:", erro);
        htmlApi = '<p class="vazio">Não foi possível consultar o iTunes agora.</p>';
    }

    const destino = document.getElementById("busca-itunes-resultados");
    if (busca === numeroDaBusca && destino) destino.innerHTML = htmlApi;
}

function iniciarBuscaGlobal() {
    const campo = document.getElementById("busca-principal");
    const painel = document.getElementById("resultados-busca");
    if (!campo || !painel) return;

    // espera o usuário parar de digitar (300 ms) antes de buscar
    campo.addEventListener("input", () => {
        clearTimeout(temporizadorBusca);
        temporizadorBusca = setTimeout(() => executarBusca(campo.value.trim()), 300);
    });

    campo.addEventListener("focus", () => {
        if (campo.value.trim() !== "") painel.hidden = false;
    });

    campo.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            fecharResultadosBusca();
        } else if (evento.key === "Enter") {
            // Enter abre o primeiro resultado
            clearTimeout(temporizadorBusca);
            const primeiro = painel.querySelector(".resultado-item");
            if (primeiro && !painel.hidden) primeiro.click();
            else executarBusca(campo.value.trim());
        }
    });

    // clicar numa música dos resultados toca a faixa
    painel.addEventListener("click", (evento) => {
        const botao = evento.target.closest("button.resultado-item");
        if (!botao) return;

        const album = buscarAlbum(botao.dataset.album);
        if (album) tocarLista(itensDoAlbum(album), Number(botao.dataset.posicao));
        fecharResultadosBusca();
    });

    // clicar fora fecha os resultados
    document.addEventListener("click", (evento) => {
        if (!evento.target.closest(".barra-busca")) fecharResultadosBusca();
    });
}
