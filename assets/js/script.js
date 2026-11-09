async function loadComponent(elementId, componentPath, basePath) {
    try {
        const response = await fetch(componentPath);
        if (response.ok) {
            let html = await response.text();
            
            if (basePath === "../") {
                html = html.replace(/src="assets\//g, 'src="../assets/');
                html = html.replace(/href="index\.html"/g, 'href="../index.html"');
                html = html.replace(/href="pages\//g, 'href="');
            }
            
            document.getElementById(elementId).innerHTML = html;
        }
    } catch (error) {
        console.error(`Erro ao carregar ${componentPath}:`, error);
    }
}

async function initLayout() {
    const currentPath = window.location.pathname;
    const isCadastro = currentPath.includes("cadastro.html");
    const basePath = currentPath.includes("/pages/") ? "../" : "";

    // 1. SEMPRE carrega o Header (em todas as páginas)
    await loadComponent("header-placeholder", `${basePath}components/header.html`, basePath);

    if (isCadastro) {
        // Se FOR a página de cadastro: esconde a barra de pesquisa
        const barraBusca = document.querySelector(".barra-busca");
        if (barraBusca) {
            barraBusca.style.display = "none";
        }
    } else {
        // Se NÃO FOR cadastro: carrega sidebar e footer
        await loadComponent("sidebar-placeholder", `${basePath}components/sidebar.html`, basePath);
        await loadComponent("footer-placeholder", `${basePath}components/footer.html`, basePath);
        
        // Ativa a lógica do botão de menu após a sidebar carregar
        initSidebar();
    }
}

function initSidebar() {
    const btnMenu = document.getElementById("btn-menu"); // Busca o botão que adicionamos na header
    const sidebar = document.querySelector(".biblioteca");

    if (btnMenu && sidebar) {
        btnMenu.addEventListener("click", () => {
            sidebar.classList.toggle("recolhida");
        });
    }
}

document.addEventListener("DOMContentLoaded", initLayout);