/* ==========================================================================
   script.js — monta o layout em todas as páginas (header, sidebar e footer)
   ========================================================================== */

// Raiz do site, descoberta a partir do endereço deste próprio arquivo
// (…/assets/js/script.js). Assim os caminhos funcionam em qualquer pasta
// e também no GitHub Pages, onde o site fica em /nome-do-repositorio/.
const RAIZ = new URL("../../", document.currentScript.src).href;

// Converte um caminho "da raiz" (ex.: "assets/img/capa.jpg") em endereço completo.
function caminho(relativo) {
    return RAIZ + relativo;
}

// Os components são escritos com caminhos a partir da raiz (assets/..., pages/...).
// Depois de inseridos na página, convertemos todos eles para endereços completos.
function ajustarCaminhos(container) {
    const externo = /^(https?:|data:|mailto:|#|\/)/;

    container.querySelectorAll("[src], [href]").forEach((elemento) => {
        ["src", "href"].forEach((atributo) => {
            const valor = elemento.getAttribute(atributo);
            if (valor && !externo.test(valor)) {
                elemento.setAttribute(atributo, caminho(valor));
            }
        });
    });
}

// Busca um arquivo de components/ e coloca dentro do placeholder da página.
async function carregarComponente(idPlaceholder, arquivo) {
    const placeholder = document.getElementById(idPlaceholder);
    if (!placeholder) return; // nem toda página tem todos os placeholders

    try {
        const resposta = await fetch(caminho(`components/${arquivo}`));
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        placeholder.innerHTML = await resposta.text();
        ajustarCaminhos(placeholder);
    } catch (erro) {
        console.error(`Erro ao carregar components/${arquivo}:`, erro);

        if (location.protocol === "file:") {
            // fetch() não funciona abrindo o arquivo direto (file://)
            placeholder.textContent = "Abra o site por um servidor (Live Server ou GitHub Pages).";
        }
    }
}

// Botão de recolher/expandir a biblioteca. O estado fica salvo no navegador
// para a biblioteca continuar recolhida ao trocar de página.
function iniciarSidebar() {
    const botao = document.getElementById("btn-menu");
    const sidebar = document.querySelector(".biblioteca");
    if (!botao || !sidebar) return;

    const CHAVE = "louvre:biblioteca-recolhida";

    if (localStorage.getItem(CHAVE) === "1") {
        sidebar.classList.add("recolhida");
    }

    botao.addEventListener("click", () => {
        const recolhida = sidebar.classList.toggle("recolhida");
        localStorage.setItem(CHAVE, recolhida ? "1" : "0");
    });
}

async function iniciarLayout() {
    // Os três components são carregados ao mesmo tempo.
    await Promise.all([
        carregarComponente("header-placeholder", "header.html"),
        carregarComponente("sidebar-placeholder", "sidebar.html"),
        carregarComponente("footer-placeholder", "footer.html"),
    ]);

    iniciarSidebar();
    iniciarBiblioteca();
}

document.addEventListener("DOMContentLoaded", iniciarLayout);
