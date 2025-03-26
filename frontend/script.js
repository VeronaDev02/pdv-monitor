// Variáveis globais
let websocket = null;
const pdvConnections = {
    1: { connected: false, ip: null },
    2: { connected: false, ip: null },
    3: { connected: false, ip: null },
    4: { connected: false, ip: null }
};

// Função para conectar ao servidor WebSocket
function connectToServer() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        addServerLog("Já está conectado ao servidor.");
        return;
    }
    
    const serverIp = document.getElementById('server-ip').value || 'localhost';
    const serverPort = document.getElementById('server-port').value || '8765';
    const wsUrl = `ws://${serverIp}:${serverPort}`;
    
    try {
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = function() {
            document.getElementById('server-status').textContent = "Conectado";
            document.getElementById('server-status').classList.add('connected');
            addServerLog(`Conectado ao servidor: ${wsUrl}`);
            
            // Reconectar PDVs ativos se houver
            for (let id = 1; id <= 4; id++) {
                if (pdvConnections[id].connected) {
                    registerPDV(id, pdvConnections[id].ip);
                }
            }
        };
        
        websocket.onclose = function() {
            document.getElementById('server-status').textContent = "Desconectado";
            document.getElementById('server-status').classList.remove('connected');
            addServerLog("Desconectado do servidor");
            
            // Marcar todos os PDVs como desconectados
            for (let id = 1; id <= 4; id++) {
                updatePDVStatus(id, false);
            }
        };
        
        websocket.onerror = function(error) {
            addServerLog(`Erro na conexão: ${error.message}`);
            console.error("Erro WebSocket:", error);
        };
        
        websocket.onmessage = function(event) {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case "register_response":
                    handleRegisterResponse(message);
                    break;
                    
                case "pdv_data":
                    handlePDVData(message);
                    break;
                    
                default:
                    console.log("Mensagem desconhecida:", message);
            }
        };
    } catch (error) {
        addServerLog(`Erro ao conectar: ${error.message}`);
        console.error("Erro ao criar WebSocket:", error);
    }
}

// Função para desconectar do servidor
function disconnectFromServer() {
    if (websocket) {
        websocket.close();
        websocket = null;
    }
}

// Função para conectar a um PDV
function connectPDV(id) {
    const ipElement = document.getElementById(`ip-${id}`);
    const pdvIp = ipElement.value.trim();
    
    if (!pdvIp) {
        addLog(id, "Erro: IP do PDV não informado", true);
        return;
    }
    
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        addLog(id, "Erro: Não conectado ao servidor. Conecte-se primeiro.", true);
        return;
    }
    
    // Registrar o PDV no servidor
    registerPDV(id, pdvIp);
}

// Função para registrar o PDV no servidor
function registerPDV(id, pdvIp) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const registerMessage = {
            command: "register",
            pdv_ip: pdvIp
        };
        
        websocket.send(JSON.stringify(registerMessage));
        addLog(id, `Solicitando conexão com PDV ${pdvIp}...`, false);
        
        // Salvar IP para reconexão se necessário
        pdvConnections[id].ip = pdvIp;
    }
}

// Função para tratar resposta de registro
function handleRegisterResponse(message) {
    // Encontrar o ID da janela pelo IP
    let pdvId = null;
    for (let id = 1; id <= 4; id++) {
        if (pdvConnections[id].ip === message.pdv_ip) {
            pdvId = id;
            break;
        }
    }
    
    if (!pdvId) return;
    
    if (message.success) {
        updatePDVStatus(pdvId, true);
        addLog(pdvId, `Conectado com sucesso ao PDV ${message.pdv_ip}`, false);
    } else {
        updatePDVStatus(pdvId, false);
        addLog(pdvId, `Falha ao conectar ao PDV ${message.pdv_ip}. IP inválido ou não registrado no servidor.`, true);
    }
}

// Função para tratar dados recebidos do PDV
function handlePDVData(message) {
    // Encontrar o ID da janela pelo IP
    let pdvId = null;
    for (let id = 1; id <= 4; id++) {
        if (pdvConnections[id].ip === message.pdv_ip && pdvConnections[id].connected) {
            pdvId = id;
            break;
        }
    }
    
    if (!pdvId) return;
    
    // Adicionar a mensagem ao log
    addLog(pdvId, message.data, false);
}

// Função para atualizar o status visual do PDV
function updatePDVStatus(id, connected) {
    const statusElement = document.getElementById(`status-${id}`);
    
    if (connected) {
        statusElement.textContent = "Conectado";
        statusElement.classList.add("connected");
        pdvConnections[id].connected = true;
    } else {
        statusElement.textContent = "Desconectado";
        statusElement.classList.remove("connected");
        pdvConnections[id].connected = false;
    }
}

// Função para adicionar entrada no log de um PDV
function addLog(id, message, isError = false) {
    const logElement = document.getElementById(`log-${id}`);
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement("div");
    logEntry.className = "log-entry" + (isError ? " error" : "");
    
    const timestampSpan = document.createElement("span");
    timestampSpan.className = "timestamp";
    timestampSpan.textContent = `[${timestamp}]`;
    
    logEntry.appendChild(timestampSpan);
    logEntry.appendChild(document.createTextNode(` ${message}`));
    
    logElement.appendChild(logEntry);
    logElement.scrollTop = logElement.scrollHeight; // Rolar para o final
}

// Função para adicionar log do servidor (para debug)
function addServerLog(message) {
    console.log(`[Server] ${message}`);
}

// Função para limpar o log de um PDV
function clearLog(id) {
    const logElement = document.getElementById(`log-${id}`);
    logElement.innerHTML = "";
}

// Carregar os IPs padrão ao iniciar a página
window.addEventListener("load", function() {
    document.getElementById("ip-1").value = "192.168.104.201";
    document.getElementById("ip-2").value = "192.168.104.205";
    document.getElementById("ip-3").value = "192.168.104.216";
    document.getElementById("ip-4").value = "192.168.104.218";
});