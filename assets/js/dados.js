/* ==========================================================================
   dados.js — dados do sistema e persistência no localStorage
   Entidade principal: ÁLBUM. Cada álbum guarda suas faixas.

   {
     id, titulo, artista, ano, genero, capa,
     origem: "inicial" | "usuario" | "itunes",
     favorito: true/false, criadoEm: número,
     faixas: [{ id, titulo, artistas, duracao (segundos), reproducoes }]
   }
   ========================================================================== */

const CHAVE_ALBUNS = "louvre:albuns";
const CHAVE_PERFIL = "louvre:perfil";
const CHAVE_HISTORICO = "louvre:historico";
const DURACAO_PADRAO = 180; // 3:00, usada quando a faixa não informa a duração

// Álbuns que já vêm no sistema na primeira visita
const ALBUNS_INICIAIS = [
    {
        id: "son-of-spergy",
        titulo: "Son Of Spergy",
        artista: "Daniel Caesar",
        ano: 2025,
        genero: "R&B",
        capa: "assets/img/capa-son-of-spergy.jpg",
        origem: "inicial",
        favorito: false,
        criadoEm: 1,
        faixas: [
            { titulo: "Rain Down", artistas: "Daniel Caesar, Sampha", duracao: 187 },
            { titulo: "Have a Baby (With Me)", artistas: "Daniel Caesar", duracao: 225 },
            { titulo: "Call on Me", artistas: "Daniel Caesar", duracao: 169 },
            { titulo: "Baby Blue", artistas: "Daniel Caesar, Norwill Simmonds", duracao: 357 },
            { titulo: "Root of All Evil", artistas: "Daniel Caesar", duracao: 265 },
            { titulo: "Who Knows", artistas: "Daniel Caesar", duracao: 230 },
            { titulo: "Moon", artistas: "Daniel Caesar, Bon Iver", duracao: 317 },
            { titulo: "Touching God", artistas: "Daniel Caesar, Yebba, Blood Orange", duracao: 281 },
            { titulo: "Sign of the Times", artistas: "Daniel Caesar", duracao: 231 },
            { titulo: "Emily's Song", artistas: "Daniel Caesar", duracao: 174 },
            { titulo: "No More Loving (On Women I Don't Love)", artistas: "Daniel Caesar", duracao: 198 },
            { titulo: "Sins of the Father", artistas: "Daniel Caesar, Bon Iver", duracao: 470 },
        ],
    },
    {
        id: "um",
        titulo: "Um",
        artista: "Luccas Carlos",
        ano: 2017,
        genero: "Rap/Hip-hop",
        capa: "assets/img/capa-um.jpg",
        origem: "inicial",
        favorito: false,
        criadoEm: 2,
        faixas: [
            { titulo: "Noite Inteira - Pt. 1", artistas: "Luccas Carlos", duracao: 102, reproducoes: 1861772 },
            { titulo: "Neblina", artistas: "Luccas Carlos", duracao: 229, reproducoes: 20871802 },
            { titulo: "Fala", artistas: "Luccas Carlos", duracao: 165, reproducoes: 4181122 },
            { titulo: "Onde Você Tava?", artistas: "Luccas Carlos", duracao: 193, reproducoes: 5640029 },
            { titulo: "O Que Quiser Fazer", artistas: "Luccas Carlos, BK", duracao: 225, reproducoes: 32587970 },
            { titulo: "Ford", artistas: "Luccas Carlos, Sain", duracao: 188, reproducoes: 2000861 },
            { titulo: "Noite Inteira - Pt. 2", artistas: "Luccas Carlos", duracao: 147, reproducoes: 2155459 },
        ],
    },
];

/* ---------- localStorage (com proteção contra erros) ---------- */

function lerStorage(chave, padrao) {
    try {
        const texto = localStorage.getItem(chave);
        return texto === null ? padrao : JSON.parse(texto);
    } catch (erro) {
        console.error(`Não foi possível ler "${chave}":`, erro);
        return padrao;
    }
}

function salvarStorage(chave, valor) {
    try {
        localStorage.setItem(chave, JSON.stringify(valor));
        return true;
    } catch (erro) {
        console.error(`Não foi possível salvar "${chave}":`, erro);
        return false;
    }
}

/* ---------- IDs e faixas ---------- */

function gerarId() {
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Garante que toda faixa tenha id, artistas, duração e reproduções.
function completarFaixas(album) {
    album.faixas = (album.faixas || []).map((faixa, posicao) => ({
        id: faixa.id || `${album.id}-${posicao + 1}`,
        titulo: faixa.titulo,
        artistas: faixa.artistas || album.artista,
        duracao: faixa.duracao || DURACAO_PADRAO,
        reproducoes: faixa.reproducoes ?? null,
    }));
    return album;
}

/* ---------- CRUD de álbuns ---------- */

function carregarAlbuns() {
    const albuns = lerStorage(CHAVE_ALBUNS, null);

    // Primeira visita (nada salvo): grava os álbuns iniciais.
    // Se o usuário apagar todos, a lista salva é [] e NÃO volta ao inicial.
    if (!Array.isArray(albuns)) {
        const iniciais = ALBUNS_INICIAIS.map((album) => completarFaixas(structuredClone(album)));
        salvarStorage(CHAVE_ALBUNS, iniciais);
        return iniciais;
    }
    return albuns;
}

function salvarAlbuns(albuns) {
    return salvarStorage(CHAVE_ALBUNS, albuns);
}

function buscarAlbum(id) {
    return carregarAlbuns().find((album) => album.id === id) || null;
}

function adicionarAlbum(dados) {
    const albuns = carregarAlbuns();
    const album = completarFaixas({
        origem: "usuario",
        favorito: false,
        ...dados,
        id: dados.id || gerarId(),
        criadoEm: Date.now(),
    });
    albuns.push(album);
    salvarAlbuns(albuns);
    return album;
}

function atualizarAlbum(id, dados) {
    const albuns = carregarAlbuns();
    const posicao = albuns.findIndex((album) => album.id === id);
    if (posicao === -1) return null;

    albuns[posicao] = completarFaixas({ ...albuns[posicao], ...dados, id });
    salvarAlbuns(albuns);
    return albuns[posicao];
}

function excluirAlbum(id) {
    const albuns = carregarAlbuns();
    const restantes = albuns.filter((album) => album.id !== id);
    salvarAlbuns(restantes);
    return restantes.length < albuns.length;
}

function alternarFavorito(id) {
    const album = buscarAlbum(id);
    if (!album) return null;
    return atualizarAlbum(id, { favorito: !album.favorito });
}

function registrarReproducao(albumId, faixaId) {
    const album = buscarAlbum(albumId);
    if (!album) return;

    const faixas = album.faixas.map((faixa) =>
        faixa.id === faixaId ? { ...faixa, reproducoes: (faixa.reproducoes || 0) + 1 } : faixa
    );
    atualizarAlbum(albumId, { faixas });
}

// Apaga tudo e volta aos álbuns iniciais
function restaurarDadosIniciais() {
    [CHAVE_ALBUNS, CHAVE_HISTORICO, "louvre:player"].forEach((chave) => localStorage.removeItem(chave));
    carregarAlbuns();
}

/* ---------- Totais de um álbum ---------- */

function duracaoTotal(album) {
    return album.faixas.reduce((total, faixa) => total + faixa.duracao, 0);
}

/* ---------- Validação do formulário de álbum ---------- */

// Converte o texto do campo "faixas" (uma por linha) em uma lista de faixas.
// Formato de cada linha:  Título | 3:45 | Artistas (duração e artistas são opcionais)
function interpretarFaixas(texto) {
    const faixas = [];
    const erros = [];

    texto.split("\n").forEach((linha, numero) => {
        if (linha.trim() === "") return;

        const [titulo, duracaoTexto, artistas] = linha.split("|").map((parte) => parte.trim());
        const faixa = { titulo, artistas: artistas || "" };

        if (!titulo) {
            erros.push(`Linha ${numero + 1}: falta o título da faixa.`);
        }
        if (duracaoTexto) {
            const segundos = textoParaSegundos(duracaoTexto);
            if (segundos === null) {
                erros.push(`Linha ${numero + 1}: duração "${duracaoTexto}" inválida (use m:ss, ex.: 3:45).`);
            }
            faixa.duracao = segundos;
        }
        faixas.push(faixa);
    });

    return { faixas, erros };
}

// "3:45" -> 225 | valor inválido -> null
function textoParaSegundos(texto) {
    const partes = /^(\d{1,3}):([0-5]\d)$/.exec(texto);
    if (!partes) return null;
    return Number(partes[1]) * 60 + Number(partes[2]);
}

// Confere os dados do formulário. Devolve { erros: {campo: mensagem}, album }.
// idEmEdicao serve para não acusar "duplicado" quando o álbum é comparado com ele mesmo.
function validarAlbum(entrada, idEmEdicao = null) {
    const erros = {};
    const titulo = entrada.titulo.trim();
    const artista = entrada.artista.trim();
    const genero = entrada.genero.trim();
    const capa = entrada.capa.trim();
    const anoMaximo = new Date().getFullYear() + 1;

    if (titulo === "") erros.titulo = "Informe o título do álbum.";
    else if (titulo.length > 80) erros.titulo = "O título pode ter no máximo 80 caracteres.";

    if (artista === "") erros.artista = "Informe o nome do artista.";
    else if (artista.length > 60) erros.artista = "O artista pode ter no máximo 60 caracteres.";

    let ano = null;
    if (entrada.ano.toString().trim() === "") {
        erros.ano = "Informe o ano de lançamento.";
    } else {
        ano = Number(entrada.ano);
        if (!Number.isInteger(ano) || ano < 1900 || ano > anoMaximo) {
            erros.ano = `O ano deve ficar entre 1900 e ${anoMaximo}.`;
        }
    }

    if (genero === "") erros.genero = "Informe o gênero musical.";
    else if (genero.length > 30) erros.genero = "O gênero pode ter no máximo 30 caracteres.";

    if (capa !== "" && !/^(https?:\/\/|assets\/)/i.test(capa)) {
        erros.capa = "A capa deve ser um link começando com http:// ou https://.";
    }

    const { faixas, erros: errosFaixas } = interpretarFaixas(entrada.faixas);
    if (errosFaixas.length > 0) erros.faixas = errosFaixas.join(" ");

    // Não permite dois álbuns iguais (mesmo título e artista)
    if (!erros.titulo && !erros.artista) {
        const repetido = carregarAlbuns().some(
            (album) =>
                album.id !== idEmEdicao &&
                normalizar(album.titulo) === normalizar(titulo) &&
                normalizar(album.artista) === normalizar(artista)
        );
        if (repetido) erros.titulo = "Esse álbum já está cadastrado.";
    }

    return { erros, album: { titulo, artista, ano, genero, capa, faixas } };
}

/* ---------- Pesquisa, filtro e ordenação (usados na biblioteca e no cadastro) ---------- */

// Tira acentos e maiúsculas: "Álbum" -> "album"
function normalizar(texto) {
    return String(texto)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}

function pesquisarAlbuns(albuns, termo) {
    const busca = normalizar(termo);
    if (busca === "") return albuns;
    return albuns.filter((album) => normalizar(`${album.titulo} ${album.artista}`).includes(busca));
}

function filtrarPorGenero(albuns, genero) {
    if (genero === "") return albuns;
    return albuns.filter((album) => album.genero === genero);
}

function ordenarAlbuns(albuns, criterio) {
    const lista = [...albuns]; // não altera a lista original
    const porTexto = (a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

    switch (criterio) {
        case "titulo-az": return lista.sort((a, b) => porTexto(a.titulo, b.titulo));
        case "titulo-za": return lista.sort((a, b) => porTexto(b.titulo, a.titulo));
        case "artista-az": return lista.sort((a, b) => porTexto(a.artista, b.artista));
        case "ano-novo": return lista.sort((a, b) => b.ano - a.ano);
        case "ano-antigo": return lista.sort((a, b) => a.ano - b.ano);
        default: return lista.sort((a, b) => b.criadoEm - a.criadoEm); // mais recentes primeiro
    }
}

function listarGeneros(albuns) {
    return [...new Set(albuns.map((album) => album.genero))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/* ---------- Perfil e histórico ---------- */

function carregarPerfil() {
    return lerStorage(CHAVE_PERFIL, { nome: "Usuário Louvre", email: "", bio: "" });
}

function salvarPerfil(perfil) {
    return salvarStorage(CHAVE_PERFIL, perfil);
}

function carregarHistorico() {
    return lerStorage(CHAVE_HISTORICO, []);
}

// Guarda as últimas 20 faixas tocadas (a mais recente primeiro)
function registrarHistorico(faixa) {
    const historico = carregarHistorico().filter((item) => item.faixaId !== faixa.faixaId);
    historico.unshift({ ...faixa, tocadaEm: Date.now() });
    salvarStorage(CHAVE_HISTORICO, historico.slice(0, 20));
}
