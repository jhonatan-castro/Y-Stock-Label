"""Servidor local para o sistema de etiquetas com SQLite."""
import json
import sqlite3
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "estoque_etiquetas.db"

def conectar():
    conexao = sqlite3.connect(DB_PATH)
    conexao.row_factory = sqlite3.Row
    conexao.execute("""CREATE TABLE IF NOT EXISTS etiquetas_recebimentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT NOT NULL, pn TEXT NOT NULL,
        unidade TEXT NOT NULL, data_chegada TEXT NOT NULL, empresa TEXT NOT NULL,
        logo TEXT, criado_em TEXT NOT NULL)""")
    conexao.commit()
    return conexao

class Aplicacao(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(BASE_DIR), **kwargs)
    def enviar_json(self, dados, status=HTTPStatus.OK):
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_response(status); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Content-Length", str(len(corpo))); self.end_headers(); self.wfile.write(corpo)
    def do_GET(self):
        url = urlparse(self.path)
        if url.path != "/api/recebimentos": return super().do_GET()
        termo = parse_qs(url.query).get("termo", [""])[0].strip(); filtro = f"%{termo}%"
        with conectar() as conexao:
            linhas = conexao.execute("SELECT id,codigo,pn,unidade,data_chegada AS dataChegada,empresa,logo FROM etiquetas_recebimentos WHERE codigo LIKE ? OR pn LIKE ? OR unidade LIKE ? ORDER BY id DESC", (filtro, filtro, filtro)).fetchall()
        self.enviar_json([dict(linha) for linha in linhas])
    def do_POST(self):
        if urlparse(self.path).path != "/api/recebimentos": return self.enviar_json({"erro":"Rota não encontrada."}, HTTPStatus.NOT_FOUND)
        try:
            dados = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))).decode("utf-8")); campos = ["codigo","pn","unidade","dataChegada","empresa"]
            if not all(str(dados.get(campo, "")).strip() for campo in campos): raise ValueError("Preencha todos os campos obrigatórios.")
            with conectar() as conexao:
                cursor = conexao.execute("INSERT INTO etiquetas_recebimentos (codigo,pn,unidade,data_chegada,empresa,logo,criado_em) VALUES (?,?,?,?,?,?,?)", (dados["codigo"].strip(),dados["pn"].strip(),dados["unidade"].strip(),dados["dataChegada"],dados["empresa"].strip(),dados.get("logo", ""),datetime.now().isoformat()))
                registro = conexao.execute("SELECT id,codigo,pn,unidade,data_chegada AS dataChegada,empresa,logo FROM etiquetas_recebimentos WHERE id=?", (cursor.lastrowid,)).fetchone()
        except (ValueError, json.JSONDecodeError) as erro: return self.enviar_json({"erro":str(erro)}, HTTPStatus.BAD_REQUEST)
        self.enviar_json(dict(registro), HTTPStatus.CREATED)

if __name__ == "__main__":
    conectar().close(); servidor = ThreadingHTTPServer(("0.0.0.0", 8000), Aplicacao)
    print("Sistema disponível na rede na porta 8000.\nPressione Ctrl+C para encerrar.")
    try: servidor.serve_forever()
    except KeyboardInterrupt: print("\nServidor encerrado.")
