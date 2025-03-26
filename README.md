# Documentação do Sistema PDV Listener

## Visão Geral
Sistema para monitoramento de dados de PDVs (Pontos de Venda) em tempo real, com recepção via UDP e visualização em navegador.

## Componentes
1. **Backend Python**
   - Servidor UDP: Recebe dados dos PDVs (porta 38800)
   - Processador de mensagens: Formata/filtra dados 
   - Servidor WebSocket: Entrega dados ao frontend (porta 8765)

2. **Frontend**
   - Interface web com 4 janelas de visualização
   - Exibe logs em tempo real dos PDVs conectados

## Características
- Monitoramento simultâneo de até 4 PDVs
- Conexão independente para cada PDV
- Filtragem de mensagens (personalizável)
- Visualização em tempo real

## Uso
1. Iniciar servidor: `python server.py`
2. Abrir frontend: `index.html` no navegador
3. Conectar ao servidor
4. Inserir IPs dos PDVs e conectar

## Requisitos
- Python 3.7+
- Biblioteca websockets
- Navegador com suporte a WebSocket