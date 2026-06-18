const texto = `Descrição da Demanda:
Necessário criar uma nova tela no ambiente da Movingpay.

Detalhes da Tela

Essa nova tela deve permitir a visualização de vários carros de corrida com a cerc.

Adicionalmente, deve conter uma tela de transação.`;

fetch('http://localhost:3000/api/criar-demanda', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    texto: texto,
    nome_cliente: 'MOVINGPAY',
    referencia: 'Teste IA'
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
