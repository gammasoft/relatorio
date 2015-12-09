'use strict';

var PdfPrinter = require('pdfmake'),
    gammautils = require('gammautils'),
    printer,

    path = require('path'),
    fs = require('fs');

function resolvePath(relative) {
    return path.join(__dirname, relative);
}

function obterDataEHora() {
    var agora = new Date();

    return [
        gammautils.string.pad(agora.getDate(), 2, '0'),
        '/',
        gammautils.string.pad(agora.getMonth() + 1, 2, '0'),
        '/',
        agora.getFullYear(),
        ' às ',
        agora.getHours(),
        ':',
        agora.getMinutes()
    ].join('');
}

var margemEsquerda = 40,
    margemDeCima = 20,
    margemDireita = 40,
    margemDeBaixo = 40,
    fonts = {
        times: {
            normal: resolvePath('./fonts/times-new-roman.ttf'),
            bold: resolvePath('./fonts/times-new-roman-bold.ttf'),
            italics: resolvePath('./fonts/times-new-roman-italic.ttf'),
            bolditalics: resolvePath('./fonts/times-new-roman-bold-italic.ttf')
        }
    },
    estilos = {
        cabecalho: {
            fontSize: 18,
            bold: true,
            font: 'times'
        },

        subCabecalho: {
            fontSize: 12,
            bold: true,
            margin: [0, 0, 0, 10],
            color: 'gray'
        },

        subCabecalhoSemMargem: {
            fontSize: 12,
            bold: true,
            margin: [0, 0, 0, 0],
            color: 'gray'
        },

        filtro: {
            fontSize: 8,
            bold: true,
            margin: [0, 0, 0, 0],
            color: 'gray'
        },

        pequeno: {
            fontSize: 8,
            bold: true,
            margin: [ margemEsquerda, 0, 0, 0 ]
        },

        aindaMenor: {
            fontSize: 7,
            bold: true,
            margin: [ margemEsquerda, 0, 0, 0 ]
        },

        tabela: {
            margin: [0, 0, 0, 5]
        },

        cabecalhoDaTabela: {
            bold: true,
            fontSize: 10,
            margin: [0, 0, 0, 0],
            font: 'times',
            italics: false,
            color: 'black'
        },

        textoDaTabela: {
            fontSize: 8,
            margin: [0, 0, 0, 0],
            font: 'times',
            italics: false,
            color: 'black'
        },

        textoDaTabelaVerde: {
            fontSize: 8,
            margin: [0, 0, 0, 0],
            font: 'times',
            italics: false,
            color: 'green'
        },

        textoDaTabelaVermelho: {
            fontSize: 8,
            margin: [0, 0, 0, 0],
            font: 'times',
            italics: false,
            color: 'red'
        },

        textoDaTabelaDestacado: {
            fontSize: 8,
            margin: [0, 0, 0, 0],
            font: 'times',
            italics: true,
            color: 'red'
        },

        defaultStyle: {
            font: 'times'
        }
    },
    conteudo = [],
    header = function(paginaAtual, totalDePaginas) {

    };

printer = new PdfPrinter(fonts);

module.exports = function(parametros, registros, callback) {
    var empresa = parametros.empresa,
        usuario = parametros.usuario,
        creditos = parametros.creditos,
        dataEHora = parametros.dataEHora || obterDataEHora(),
        reportHash = gammautils.crypto.md5(parametros.nome + JSON.stringify(registros));

    if(typeof parametros.circulacaoInterna === 'undefined') {
        parametros.circulacaoInterna = true;
    }

    function gerarRelatorio() {
        if(empresa.nome) {
            empresa.nome = empresa.nome.toUpperCase();
        }

        if(parametros.nome) {
            parametros.nome = parametros.nome.toUpperCase();
        }

        var conteudo = [
            { text: empresa.nome, style: 'cabecalho' },
            { text: parametros.nome, style: 'subCabecalho' }
        ];

        if(parametros.filtro && parametros.filtro.length) {
            if(!Array.isArray(parametros.filtro)) {
                parametros.filtro = [parametros.filtro];
            }

            conteudo.push({
                // TODO: Linhas de filtro que excederem um número X de caractéres devem
                //       ocupar uma linha sozinhos

                text: parametros.filtro.map(function(filtro) {
                    return filtro && filtro.toString().toUpperCase();
                }).join(' — '),
                style: 'filtro'
            });

            conteudo.push({ text: '', style: 'subCabecalho' });
        }

        parametros.colunas = parametros.colunas || [];
        registros = registros || [];

        if(parametros.colunasVisiveis && parametros.colunasVisiveis.length) {
            parametros.colunas = parametros.colunas.filter(function(coluna) {
                return parametros.colunasVisiveis.indexOf(coluna.propriedade) > -1;
            });
        }

        function obterTabela() {
            var tabela = {
                headerRows: 1,
                keepWithHeaderRows: 1,
                style: 'tabela',
                widths: parametros.colunas.map(function(coluna) {
                    var largura;

                    if(coluna.largura) {
                        largura = parseFloat(coluna.largura);
                    }

                    if(isNaN(largura)) {
                        largura = '*';
                    }

                    if(coluna.largura === 'auto') {
                        largura = 'auto';
                    }

                    return largura;
                }),
                body: [
                    parametros.colunas.map(function(coluna) {
                        return {
                            text: coluna.titulo,
                            style: 'cabecalhoDaTabela'
                        };
                    })
                ]
            }

            if(parametros.contador) {
                tabela.widths.unshift('auto');
                tabela.body[0].unshift({
                    text: '#',
                    style: 'cabecalhoDaTabela'
                });
            }

            return tabela;
        }

        function agrupamento(registro) {
            return gammautils.object.resolveProperty(registro, parametros.agregacao.propriedade);
        }

        function paraArray(grupo, registros) {
            var nomeDoGrupo = parametros.agregacao.render ? parametros.agregacao.render(grupo) : grupo;
            return {
                nome: nomeDoGrupo, // Nome do grupo
                registros: registros
            };
        }

        var grupos;
        if(parametros.agregacao) {
            grupos = gammautils.array.groupBySync(registros, agrupamento, paraArray);
        } else {
            grupos = [{
                nome: null, // Nome do grupo
                registros: registros
            }];
        }

        var margemDeCimaDoGrupo = 0;

        ///
        grupos.forEach(function(grupo) {
            if(grupo.nome) {
                conteudo.push({
                    text: grupo.nome,
                    font: 'times',
                    fontSize: 10,
                    bold: true,
                    margin: [0, margemDeCimaDoGrupo, 0, 1],
                });

                margemDeCimaDoGrupo = 5;
            }

            var tabela = obterTabela(),
                registros = grupo.registros;

            conteudo.push({ table: tabela });

            registros.forEach(function(registro, index) {
                var linha = [];

                if(parametros.contador) {
                    linha.push({
                        style: 'textoDaTabela',
                        text: (index + 1).toString()
                    });
                }

                parametros.colunas.forEach(function(coluna) {
                    var texto = gammautils.object.resolveProperty(registro, coluna.propriedade);

                    if(coluna.render) {
                        texto = coluna.render(texto, registro);
                    }

                    if(texto === null) {
                        texto = '';
                    }

                    if(typeof texto !== 'object' || Object.prototype.toString.call(texto) === '[object Date]') {
                        texto = texto || '';
                        texto = texto.toString();
                    }

                    if(typeof texto === 'string') {
                        texto = texto || '';

                        linha.push({
                            style: 'textoDaTabela',
                            text: texto.toString ? texto.toString() : texto
                        });
                    } else if(typeof texto === 'object') {
                        linha.push(texto);
                    }
                });

                tabela.body.push(linha);
            });

            var peloMenosUmRodape = false,
                textoPadraoDoRodape = '',
                rodape = [];

            if(parametros.contador) {
                rodape.push({
                    style: 'textoDaTabela',
                    text: textoPadraoDoRodape
                });
            }

            parametros.colunas.forEach(function(coluna) {
                var texto = textoPadraoDoRodape;

                if(coluna.rodape) {
                    peloMenosUmRodape = true;
                    texto = coluna.rodape(registros);
                }

                texto = texto || textoPadraoDoRodape;

                if(typeof texto === 'string') {
                    rodape.push({
                        style: 'textoDaTabela',
                        text: texto.toString ? texto.toString() : texto
                    });
                } else {
                    rodape.push(texto);
                }
            });

            if(peloMenosUmRodape) {
                tabela.body.push(rodape);
            }
        });
        ///

        var documento = {
            pageSize: parametros.tamanhoDaPagina || 'A4',
            pageOrientation: {
                'retrato': 'portrait',
                'paisagem': 'landscape'
            }[parametros.orientacao || 'retrato'],
            pageMargins: [ margemEsquerda, margemDeCima, margemDireita, margemDeBaixo ],
            styles: estilos,
            header: header,
            content: conteudo,
            // background: function() {
            //     return {
            //         text: 'CIRCULAÇÃO INTERNA'
            //     };
            // },
            footer: function(paginaAtual, totalDePaginas) {
                var avisoDeConfidencialidade;

                if(parametros.circulacaoInterna) {
                    avisoDeConfidencialidade = [
                        'Documento destinado a circulação interna entre os funcionários autorizados.',
                        'A exposição pública deste documento - por qualquer meio - acarretará processo',
                        'jurídico apropriado. Caso não tenha autorização de acesso a este documento',
                        'destrua-o imediatamente.'
                    ].join(' ');
                } else {
                    avisoDeConfidencialidade = 'Documento passível de circulação externa.';
                }

                return [{
                    text: [
                        empresa.nome,
                        parametros.nome
                    ].join(' - ') + '\n',
                    style: 'pequeno'
                }, {
                    text: [
                        'Impresso por',
                        usuario.nome,
                        'em',
                        dataEHora,
                        '- Página ' + paginaAtual + ' de ' + totalDePaginas,
                        '(' + registros.length,
                        registros.length > 1 || registros.length === 0 ? ' registros)' : ' registro)',
                        '- MD5: ' + reportHash + '\n'
                    ].join(' '),
                    style: 'pequeno'
                }, {
                    text: avisoDeConfidencialidade,
                    style: 'aindaMenor',
                    color: 'gray'
                }, {
                    text: creditos || 'Gammasoft Desenvolvimento de Software Ltda',
                    style: 'aindaMenor',
                    color: 'gray'
                }];
            }
        };

        callback && callback(null, printer.createPdfKitDocument(documento));
    }

    gerarRelatorio();
}
