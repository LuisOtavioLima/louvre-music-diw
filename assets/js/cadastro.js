/* ==========================================================================
   cadastro.js — página "Gerenciar Álbuns"
   Cadastrar, listar, editar, excluir, pesquisar, filtrar e ordenar
   ========================================================================== */

let idEmEdicao = null; // null = cadastrando; com id = editando aquele álbum

const CAMPOS = ["titulo", "artista", "ano", "genero", "capa", "faixas"];

/* ---------- Formulário ---------- */

function lerFormulario() {
    const form = document.getElementById("form-album");
    const dados = {};
    CAMPOS.forEach((campo) => (dados[campo] = form.elements[campo].value));
    return dados;
}

function mostrarErros(erros) {
    CAMPOS.forEach((campo) => {
        const alvo = document.getElementById(`erro-${campo}`);
        const entrada = document.getElementById(`campo-${campo}`);
        alvo.textContent = erros[campo] || "";
        entrada.classList.toggle("invalido", Boolean(erros[campo]));
    });
}

// "Título | 3:45 | Artistas" para cada faixa (usado ao editar)
function faixasParaTexto(album) {
    return album.faixas
        .map((faixa) => {
            let linha = `${faixa.titulo} | ${formatarDuracao(faixa.duracao)}`;
            if (faixa.artistas !== album.artista) linha += ` | ${faixa.artistas}`;
            return linha;
        })
        .join("\n");
}

function limparFormulario() {
    document.getElementById("form-album").reset();
    mostrarErros({});
}

// Troca o formulário entre os modos "cadastrar" e "editar"
function definirModoEdicao(album) {
    const editando = album !== null;
    idEmEdicao = editando ? album.id : null;

    document.getElementById("titulo-form").textContent = editando ? "Editar Álbum" : "Cadastrar Novo Álbum";
    document.getElementById("btn-salvar").textContent = editando ? "Salvar Alterações" : "Salvar Álbum";
    document.getElementById("btn-cancelar-edicao").hidden = !editando;
    document.getElementById("btn-limpar").hidden = editando;

    limparFormulario();

    if (editando) {
        const form = document.getElementById("form-album");
        form.elements.titulo.value = album.titulo;
        form.elements.artista.value = album.artista;
        form.elements.ano.value = album.ano;
        form.elements.genero.value = album.genero;
        form.elements.capa.value = album.capa;
        form.elements.faixas.value = faixasParaTexto(album);
        form.elements.titulo.focus();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    renderizarLista(); // destaca o item que está sendo editado
}

// Ao editar, mantém id e reproduções das faixas que continuam existindo
function aproveitarFaixasAntigas(faixasNovas, albumAntigo) {
    const jaUsadas = new Set();

    return faixasNovas.map((nova) => {
        const antiga = albumAntigo.faixas.find(
            (faixa) => !jaUsadas.has(faixa.id) && normalizar(faixa.titulo) === normalizar(nova.titulo)
        );
        if (!antiga) return nova;

        jaUsadas.add(antiga.id);
        return {
            ...nova,
            id: antiga.id,
            reproducoes: antiga.reproducoes,
            duracao: nova.duracao || antiga.duracao,
        };
    });
}

function salvarFormulario(evento) {
    evento.preventDefault();

    const { erros, album } = validarAlbum(lerFormulario(), idEmEdicao);
    mostrarErros(erros);

    const camposComErro = CAMPOS.filter((campo) => erros[campo]);
    if (camposComErro.length > 0) {
        document.getElementById(`campo-${camposComErro[0]}`).focus();
        mostrarToast("Corrija os campos destacados.", "erro");
        return;
    }

    if (idEmEdicao === null) {
        adicionarAlbum(album);
        mostrarToast(`Álbum "${album.titulo}" cadastrado!`);
        limparFormulario();
    } else {
        const antigo = buscarAlbum(idEmEdicao);
        album.faixas = aproveitarFaixasAntigas(album.faixas, antigo);
        atualizarAlbum(idEmEdicao, album);
        mostrarToast(`Álbum "${album.titulo}" atualizado!`);
        definirModoEdicao(null);
    }

    renderizarLista();
    renderizarBiblioteca();
}

/* ---------- Lista de álbuns ---------- */

function atualizarOpcoesDeGenero(albuns) {
    const seletor = document.getElementById("filtro-genero");
    const escolhido = seletor.value;

    const opcoes = ['<option value="">Todos os gêneros</option>'].concat(
        listarGeneros(albuns).map((genero) => `<option value="${escapar(genero)}">${escapar(genero)}</option>`)
    );
    seletor.innerHTML = opcoes.join("");

    // mantém o filtro escolhido, a não ser que o gênero não exista mais
    seletor.value = listarGeneros(albuns).includes(escolhido) ? escolhido : "";
}

function renderizarLista() {
    const lista = document.getElementById("lista-gerenciamento");
    const todos = carregarAlbuns();

    atualizarOpcoesDeGenero(todos);

    const termo = document.getElementById("busca-cadastro").value;
    const genero = document.getElementById("filtro-genero").value;
    const criterio = document.getElementById("ordenacao").value;

    // pesquisa -> filtro -> ordenação
    const exibidos = ordenarAlbuns(filtrarPorGenero(pesquisarAlbuns(todos, termo), genero), criterio);

    document.getElementById("contador-albuns").textContent = `(${exibidos.length} de ${todos.length})`;

    if (exibidos.length === 0) {
        const mensagem = todos.length === 0 ? "Nenhum álbum cadastrado ainda." : "Nenhum álbum encontrado com esses critérios.";
        lista.innerHTML = `<li class="vazio">${mensagem}</li>`;
        return;
    }

    lista.innerHTML = exibidos
        .map(
            (album) => `
            <li data-id="${escapar(album.id)}" class="${album.id === idEmEdicao ? "em-edicao" : ""}">
                <a href="${urlAlbum(album)}" title="Abrir álbum">
                    <img src="${escapar(capaUrl(album))}" alt="Capa ${escapar(album.titulo)}" width="48" loading="lazy">
                </a>
                <div class="info-item">
                    <p class="titulo">${escapar(album.titulo)}</p>
                    <p class="detalhes">${escapar(album.artista)} • ${album.ano} • ${escapar(album.genero)} • ${pluralizar(album.faixas.length, "faixa", "faixas")}</p>
                </div>
                <div class="acoes">
                    <button type="button" class="btn-icone" data-acao="editar" title="Editar" aria-label="Editar ${escapar(album.titulo)}"><span class="material-symbols-outlined">edit</span></button>
                    <button type="button" class="btn-icone perigo" data-acao="excluir" title="Excluir" aria-label="Excluir ${escapar(album.titulo)}"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </li>`
        )
        .join("");
}

async function tratarCliqueNaLista(evento) {
    const botao = evento.target.closest("[data-acao]");
    if (!botao) return;

    const id = botao.closest("li").dataset.id;
    const album = buscarAlbum(id);
    if (!album) return;

    if (botao.dataset.acao === "editar") {
        definirModoEdicao(album);
        return;
    }

    // excluir
    const confirmou = await confirmarAcao("Excluir álbum", `Deseja excluir "${album.titulo}" da biblioteca? Essa ação não pode ser desfeita.`);
    if (!confirmou) return;

    excluirAlbum(id);
    if (typeof removerAlbumDaFila === "function") removerAlbumDaFila(id);
    if (idEmEdicao === id) definirModoEdicao(null);

    mostrarToast(`Álbum "${album.titulo}" excluído.`);
    renderizarLista();
}

/* ---------- Importar do iTunes (API) ---------- */

let resultadosItunes = []; // últimos álbuns encontrados na API

function renderizarResultadosItunes() {
    const lista = document.getElementById("resultados-itunes");

    lista.innerHTML = resultadosItunes
        .map((album) => {
            const jaTem = albumItunesJaImportado(album);
            return `
            <li data-id="${escapar(album.id)}">
                <img src="${escapar(capaUrl(album))}" alt="Capa ${escapar(album.titulo)}" width="48" loading="lazy">
                <div class="info-item">
                    <p class="titulo">${escapar(album.titulo)}</p>
                    <p class="detalhes">${escapar(album.artista)} • ${album.ano} • ${escapar(album.genero)}</p>
                </div>
                <button type="button" class="btn-secundario" data-acao="importar" ${jaTem ? "disabled" : ""}>
                    ${jaTem ? "Na biblioteca" : "Importar"}
                </button>
            </li>`;
        })
        .join("");
}

async function pesquisarNoItunes(evento) {
    evento.preventDefault();

    const termo = document.getElementById("busca-itunes").value.trim();
    const lista = document.getElementById("resultados-itunes");
    if (termo.length < 2) {
        mostrarToast("Digite pelo menos 2 letras para pesquisar.", "erro");
        return;
    }

    lista.innerHTML = '<li class="vazio">Buscando no iTunes...</li>';
    try {
        resultadosItunes = await buscarAlbunsNoItunes(termo, 8);
        if (resultadosItunes.length === 0) {
            lista.innerHTML = `<li class="vazio">Nenhum álbum encontrado para "${escapar(termo)}".</li>`;
            return;
        }
        renderizarResultadosItunes();
    } catch (erro) {
        console.error("Falha ao consultar o iTunes:", erro);
        lista.innerHTML = '<li class="vazio">Não foi possível consultar o iTunes agora. Verifique sua conexão e tente de novo.</li>';
    }
}

async function importarAlbum(evento) {
    const botao = evento.target.closest('[data-acao="importar"]');
    if (!botao) return;

    const idItunes = botao.closest("li").dataset.id.replace("itunes-", "");
    botao.disabled = true;
    botao.textContent = "Importando...";

    try {
        const album = await importarAlbumDoItunes(idItunes);
        mostrarToast(`Álbum "${album.titulo}" importado com ${pluralizar(album.faixas.length, "faixa", "faixas")}!`);
        renderizarLista();
    } catch (erro) {
        console.error("Falha ao importar do iTunes:", erro);
        mostrarToast("Não foi possível importar o álbum. Tente novamente.", "erro");
    }
    renderizarResultadosItunes();
}

/* ---------- Inicialização ---------- */

function iniciarCadastro() {
    const anoMaximo = new Date().getFullYear() + 1;
    document.getElementById("campo-ano").max = anoMaximo;

    document.getElementById("form-album").addEventListener("submit", salvarFormulario);
    document.getElementById("btn-limpar").addEventListener("click", limparFormulario);
    document.getElementById("btn-cancelar-edicao").addEventListener("click", () => definirModoEdicao(null));
    document.getElementById("lista-gerenciamento").addEventListener("click", tratarCliqueNaLista);

    ["busca-cadastro", "filtro-genero", "ordenacao"].forEach((id) => {
        const controle = document.getElementById(id);
        controle.addEventListener(id === "busca-cadastro" ? "input" : "change", renderizarLista);
    });

    document.getElementById("form-itunes").addEventListener("submit", pesquisarNoItunes);
    document.getElementById("resultados-itunes").addEventListener("click", importarAlbum);

    renderizarLista();

    // Vindo da página do álbum (botão "Editar"): cadastro.html?editar=ID
    const idParaEditar = new URLSearchParams(location.search).get("editar");
    const album = idParaEditar ? buscarAlbum(idParaEditar) : null;
    if (album) definirModoEdicao(album);
}

document.addEventListener("DOMContentLoaded", iniciarCadastro);
