from __future__ import annotations

from app.corpus import Corpus, tokenize


def test_tokenize_quita_acentos_y_stopwords():
    tokens = tokenize("¿Cómo garantizar la educación inclusiva con IA?")
    assert "educacion" in tokens
    assert "inclusiva" in tokens
    assert "como" not in tokens
    assert "la" not in tokens


def test_corpus_carga_paises_y_topicos():
    corpus = Corpus()
    stats = corpus.stats()
    assert stats["documents"] > 100
    assert stats["countries"] >= 33
    assert stats["sources"] > 0


def test_busqueda_filtra_por_pais_y_comision():
    corpus = Corpus()
    results = corpus.search("IA y educación", country="CH", committee="UNESCO", limit=5)
    assert results
    assert all(item.doc.country in ("", "CH") for item in results)
    assert all(item.doc.committee in ("", "UNESCO") for item in results)
    assert all(item.score > 0 for item in results)


def test_busqueda_devuelve_snippets_con_texto():
    corpus = Corpus()
    results = corpus.search("empleo juvenil informalidad", committee="ECOSOC", limit=4)
    assert results
    for item in results:
        assert item.snippet
        assert len(item.snippet) > 40


def test_busqueda_sin_coincidencias_no_falla():
    corpus = Corpus()
    results = corpus.search("xyzzy plugh quux", limit=4)
    assert results == []
