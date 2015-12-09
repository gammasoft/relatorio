var relatorio = require('../index'),
    fs = require('fs'),
    path = require('path'),
    crypto = require('crypto'),

    caminho = path.join(__dirname, 'teste.pdf');

var empresa = {
        nome: 'Empresa Grande Ltda'
    },
    usuario = {
        nome: 'Ciclano da Silva'
    },
    clientes = [{
        id: 1,
        tipo: 'cpf',
        nome: 'Fulano de Tal',
        registroNacional: '000.000.000-00',
        registroEstadual: '00000-0',
        estado: 'DF'
    }, {
        id: 2,
        tipo: 'cpf',
        nome: 'Asnésio',
        registroNacional: '111.111.111-11',
        registroEstadual: '11111-1',
        estado: 'DF'
    }, {
        id: 3,
        tipo: 'cpf',
        nome: 'Beltrano',
        registroNacional: '222.222.222-22',
        registroEstadual: '22222-2',
        estado: 'GO'
    }, {
        id: 4,
        tipo: 'cnpj',
        nome: 'Empresa Pequena Ltda',
        registroNacional: '333.333.333/0001-91',
        registroEstadual: '10234235',
        estado: 'DF'
    }, {
        id: 5,
        tipo: 'cnpj',
        nome: 'Outra Empresa S/A',
        registroNacional: '000.123.456/0003-22',
        registroEstadual: '434324-23',
        estado: 'SP'
    }];

module.exports = {
    'Gera arquivo pdf trivial': function(test) {
        var creationDate = new Date(2015, 11, 31);

        relatorio({
            empresa: empresa,
            usuario: usuario,
            creditos: empresa.nome + ' - todos os direitos reservados',
            nome: 'Listagem de Clientes',
            dataEHora: '09/12/2015 às 14:30',
            orientacao: 'paisagem',
            contador: true,
            colunasVisiveis: [
                'id', 'tipo', 'nome', 'nomeFantasia', 'registroNacional',
                'registroEstadual', 'estado'
            ],
            colunas: [{
                titulo: 'Id',
                propriedade: 'id',
                largura: 'auto'
            }, {
                titulo: 'Tipo',
                propriedade: 'tipo',
                largura: 'auto',
                render: function(tipo) {
                    return {
                        cpf: 'CPF',
                        cnpj: 'CNPJ',
                    }[tipo] || '';
                }
            }, {
                titulo: 'Nome',
                propriedade: 'nome'
            }, {
                titulo: 'CNPJ/CPF',
                largura: 'auto',
                propriedade: 'registroNacional'
            }, {
                titulo: 'IE/RG',
                largura: 'auto',
                propriedade: 'registroEstadual'
            }, {
                titulo: 'UF',
                largura: 'auto',
                propriedade: 'estado'
            }]
        }, clientes, function(err, pdf) {
            if(err) {
                throw err;
            }

            // pdf._info.data.CreationDate = creationDate;

            var writeStream = fs.createWriteStream(caminho);

            pdf.pipe(writeStream);
            pdf.on('end', function() {
                test.ok(fs.existsSync(caminho));

                var fd = fs.createReadStream(caminho);
                    hash = crypto.createHash('sha1');

                hash.setEncoding('hex');

                fd.on('end', function() {
                    hash.end();
                    test.equal(hash.read(), 'c10efd7fdcc709d27d35ec93e3142156b8109f77');
                    test.done();
                });

                fd.pipe(hash);
            });

            pdf.end();
        });
    }
}