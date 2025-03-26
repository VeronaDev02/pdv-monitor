import asyncio
import socket
import websockets
import json
from message_processor import process_message

# Dicionário para armazenar os clientes WebSocket por IP do PDV
pdv_clients = {
    "192.168.104.201": set(),
    "192.168.104.205": set(),
    "192.168.104.216": set(),
    "192.168.104.218": set(),
}

async def register_client(websocket, pdv_ip):
    """Registra um cliente WebSocket para receber mensagens de um PDV específico"""
    if pdv_ip in pdv_clients:
        pdv_clients[pdv_ip].add(websocket)
        print(f"Cliente registrado para o PDV {pdv_ip}")
        return True
    else:
        print(f"IP de PDV inválido: {pdv_ip}")
        return False

async def unregister_client(websocket):
    """Remove um cliente WebSocket quando a conexão é fechada"""
    for ip, clients in pdv_clients.items():
        if websocket in clients:
            clients.remove(websocket)
            print(f"Cliente removido do PDV {ip}")

async def websocket_handler(websocket):
    """Manipula as conexões WebSocket"""
    try:
        async for message in websocket:
            data = json.loads(message)
            command = data.get("command")
            
            if command == "register":
                pdv_ip = data.get("pdv_ip")
                success = await register_client(websocket, pdv_ip)
                
                response = {
                    "type": "register_response",
                    "success": success,
                    "pdv_ip": pdv_ip
                }
                await websocket.send(json.dumps(response))
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        await unregister_client(websocket)

class UDPServer:
    def __init__(self, host='0.0.0.0', port=38800):
        self.host = host
        self.port = port
        self.transport = None
    
    def connection_made(self, transport):
        self.transport = transport
        print(f"Servidor UDP iniciado em {self.host}:{self.port}")
    
    async def start(self):
        loop = asyncio.get_running_loop()
        
        # Cria o socket UDP
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.bind((self.host, self.port))
        sock.setblocking(False)
        
        print(f"Servidor UDP ouvindo na porta {self.port}...")
        
        # Loop para receber dados do socket UDP
        while True:
            try:
                # Recebe os dados de forma não-bloqueante
                data, addr = await loop.sock_recvfrom(sock, 1024)
                client_ip = addr[0]
                
                if data:
                    print(f"Dados recebidos de {client_ip}:{addr[1]}")
                    
                    # Processa a mensagem recebida
                    raw_message = data.decode('utf-8', 'ignore')
                    processed_message = process_message(raw_message, client_ip)
                    
                    # Envia para os clientes WebSocket registrados para este IP
                    if client_ip in pdv_clients:
                        message_to_send = json.dumps({
                            "type": "pdv_data",
                            "pdv_ip": client_ip,
                            "data": processed_message
                        })
                        
                        # Envia a mensagem para todos os clientes interessados nesse PDV
                        for client in pdv_clients[client_ip]:
                            try:
                                await client.send(message_to_send)
                            except websockets.exceptions.ConnectionClosed:
                                pass
            except BlockingIOError:
                # Se não houver dados disponíveis, continue para a próxima iteração
                await asyncio.sleep(0.01)

async def main():
    # Inicia o servidor WebSocket
    websocket_server = await websockets.serve(
        websocket_handler, 
        "0.0.0.0", 
        8765,
        ping_interval=None
    )
    
    # Inicia o servidor UDP
    udp_server = UDPServer()
    udp_task = asyncio.create_task(udp_server.start())
    
    print("Servidores iniciados. Pressione Ctrl+C para sair.")
    
    # Mantém os servidores rodando
    await asyncio.gather(
        websocket_server.wait_closed(),
        udp_task
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Servidores encerrados.")