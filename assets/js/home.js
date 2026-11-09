/* ==========================================================================
   home.js — Home: sugestões do Louvre montadas a partir dos álbuns salvos
   ========================================================================== */

function renderizarHome() {
    const grade = document.getElementById("grid-albuns");
    const albuns = carregarAlbuns();

    if (albuns.length === 0) {
        grade.innerHTML = `
            <p class="vazio">
                Nenhum álbum por aqui ainda.
                <a href="${caminho("pages/cadastro.html")}">Cadastre ou importe um álbum</a>.
            </p>`;
        return;
    }

    grade.innerHTML = albuns.map(htmlCardAlbum).join("");
}

document.addEventListener("DOMContentLoaded", renderizarHome);
