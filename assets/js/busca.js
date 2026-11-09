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
