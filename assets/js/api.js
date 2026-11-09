/* ==========================================================================
   api.js — integração com a API pública do iTunes (Apple)
   Documentação: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
   Não precisa de chave. Fluxo do sistema:

     API do iTunes  ->  usuário escolhe um álbum  ->  vira álbum do sistema  ->  localStorage
   ========================================================================== */

const URL_ITUNES = "https://itunes.apple.com";

// fetch com limite de tempo, para a tela não ficar "carregando" para sempre
async function buscarJson(url) {
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 8000);

    try {
        const resposta = await fetch(url, { signal: controle.signal });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        return await resposta.json();
    } finally {
        clearTimeout(limite);
    }
}

// Transforma um "collection" do iTunes no formato de álbum do nosso sistema
function converterAlbumItunes(item) {
    return {
        id: `itunes-${item.collectionId}`,
        titulo: item.collectionName,
        artista: item.artistName,
        ano: new Date(item.releaseDate).getFullYear(),
        genero: item.primaryGenreName || "Outro",
        capa: (item.artworkUrl100 || "").replace("100x100bb", "600x600bb"), // pede a capa em alta resolução
        origem: "itunes",
        favorito: false,
        faixas: [],
    };
}

// Pesquisa álbuns pelo nome (ou artista). Devolve uma lista de álbuns ainda sem faixas.
async function buscarAlbunsNoItunes(termo, limite = 6) {
    const url = `${URL_ITUNES}/search?term=${encodeURIComponent(termo)}&entity=album&media=music&limit=${limite}&country=BR`;
    const dados = await buscarJson(url);

    return dados.results.filter((item) => item.collectionId && item.collectionName).map(converterAlbumItunes);
}

// Busca UM álbum com todas as faixas (lookup). "idItunes" é o collectionId.
async function buscarAlbumCompletoNoItunes(idItunes) {
    const url = `${URL_ITUNES}/lookup?id=${encodeURIComponent(idItunes)}&entity=song&country=BR`;
    const dados = await buscarJson(url);

    const colecao = dados.results.find((item) => item.wrapperType === "collection");
    if (!colecao) throw new Error("Álbum não encontrado no iTunes");

    const album = converterAlbumItunes(colecao);
    album.faixas = dados.results
        .filter((item) => item.wrapperType === "track" && item.trackName)
        .sort((a, b) => (a.discNumber || 1) - (b.discNumber || 1) || a.trackNumber - b.trackNumber)
        .map((item) => ({
            titulo: item.trackName,
            artistas: item.artistName,
            duracao: Math.round((item.trackTimeMillis || 0) / 1000) || undefined,
        }));

    return album;
}

// Álbum do iTunes já está na biblioteca?
function albumItunesJaImportado(album) {
    return buscarAlbum(album.id) !== null;
}

// Busca as faixas no iTunes e grava o álbum no localStorage. Devolve o álbum salvo.
async function importarAlbumDoItunes(idItunes) {
    const album = await buscarAlbumCompletoNoItunes(idItunes);
    if (albumItunesJaImportado(album)) return buscarAlbum(album.id);
    return adicionarAlbum(album);
}
