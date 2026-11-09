/* ==========================================================================
   perfil.js — página de perfil do usuário
   Dados do perfil, estatísticas, histórico de reprodução e favoritos
   ========================================================================== */

/* ---------- Cabeçalho e estatísticas ---------- */

function renderizarCabecalhoPerfil() {
    const perfil = carregarPerfil();

    document.getElementById("nome-perfil").textContent = perfil.nome;
    document.getElementById("bio-perfil").textContent = perfil.bio || perfil.email || "Adicione uma bio abaixo.";
    document.getElementById("avatar-perfil").textContent = perfil.nome.trim().charAt(0).toUpperCase() || "U";
}

function renderizarEstatisticas() {
    const albuns = carregarAlbuns();

    let totalFaixas = 0;
    let totalSegundos = 0;
    albuns.forEach((album) => {
        totalFaixas += album.faixas.length;
        totalSegundos += duracaoTotal(album);
    });

    document.getElementById("est-albuns").textContent = albuns.length;
    document.getElementById("est-faixas").textContent = totalFaixas;
    document.getElementById("est-favoritos").textContent = albuns.filter((album) => album.favorito).length;
    document.getElementById("est-tempo").textContent = formatarTempoTotal(totalSegundos).replace(/ \d+ s$/, "");
}

/* ---------- Histórico e favoritos ---------- */

function renderizarHistorico() {
    const lista = document.getElementById("lista-historico");
    const historico = carregarHistorico();

    if (historico.length === 0) {
        lista.innerHTML = '<li class="vazio">Você ainda não tocou nenhuma música.</li>';
        return;
    }

    lista.innerHTML = historico
        .map(
            (item, posicao) => `
            <li>
                <button type="button" class="item-historico" data-posicao="${posicao}" title="Tocar novamente">
                    <img src="${escapar(capaUrl({ capa: item.capa, titulo: item.albumTitulo }))}" alt="" width="40" height="40" loading="lazy">
                    <span class="info-item">
                        <span class="titulo">${escapar(item.titulo)}</span>
                        <span class="detalhes">${escapar(item.artistas)} • ${escapar(item.albumTitulo)}</span>
                    </span>
                </button>
            </li>`
        )
        .join("");
}

function renderizarFavoritos() {
    const grade = document.getElementById("grid-favoritos");
    const favoritos = carregarAlbuns().filter((album) => album.favorito);

    grade.innerHTML =
        favoritos.length > 0
            ? favoritos.map(htmlCardAlbum).join("")
            : '<p class="vazio">Nenhum favorito ainda. Toque no coração na página de um álbum.</p>';
}

/* ---------- Formulário do perfil ---------- */

function validarPerfil(dados) {
    const erros = {};
    const nome = dados.nome.trim();
    const email = dados.email.trim();
    const bio = dados.bio.trim();

    if (nome.length < 2) erros.nome = "O nome precisa ter pelo menos 2 letras.";
    else if (nome.length > 40) erros.nome = "O nome pode ter no máximo 40 caracteres.";

    // formato simples: algo@algo.algo
    if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "Digite um e-mail válido (ex.: nome@site.com).";

    if (bio.length > 160) erros.bio = "A bio pode ter no máximo 160 caracteres.";

    return { erros, perfil: { nome, email, bio } };
}

function salvarFormularioPerfil(evento) {
    evento.preventDefault();

    const form = document.getElementById("form-perfil");
    const { erros, perfil } = validarPerfil({
        nome: form.elements.nome.value,
        email: form.elements.email.value,
        bio: form.elements.bio.value,
    });

    ["nome", "email", "bio"].forEach((campo) => {
        document.getElementById(`erro-${campo}`).textContent = erros[campo] || "";
        form.elements[campo].classList.toggle("invalido", Boolean(erros[campo]));
    });

    if (Object.keys(erros).length > 0) {
        mostrarToast("Corrija os campos destacados.", "erro");
        return;
    }

    salvarPerfil(perfil);
    renderizarCabecalhoPerfil();
    mostrarToast("Perfil salvo!");
}

async function restaurarDados() {
    const confirmou = await confirmarAcao(
        "Restaurar dados iniciais",
        "Seus álbuns cadastrados, o histórico e a fila serão apagados. Deseja continuar?",
        "Restaurar"
    );
    if (!confirmou) return;

    restaurarDadosIniciais();
    sessionStorage.setItem("louvre:aviso", "Dados restaurados.");
    location.reload();
}

/* ---------- Inicialização ---------- */

function iniciarPerfil() {
    const perfil = carregarPerfil();
    const form = document.getElementById("form-perfil");
    form.elements.nome.value = perfil.nome;
    form.elements.email.value = perfil.email;
    form.elements.bio.value = perfil.bio;

    renderizarCabecalhoPerfil();
    renderizarEstatisticas();
    renderizarHistorico();
    renderizarFavoritos();

    form.addEventListener("submit", salvarFormularioPerfil);
    document.getElementById("btn-restaurar").addEventListener("click", restaurarDados);

    // clicar numa música do histórico toca de novo
    document.getElementById("lista-historico").addEventListener("click", (evento) => {
        const botao = evento.target.closest(".item-historico");
        if (!botao) return;
        const item = carregarHistorico()[Number(botao.dataset.posicao)];
        if (item) tocarLista([item], 0);
    });
}

document.addEventListener("DOMContentLoaded", iniciarPerfil);

// O histórico muda quando uma faixa começa a tocar
document.addEventListener("player:mudou", () => {
    if (document.getElementById("lista-historico")) renderizarHistorico();
});
