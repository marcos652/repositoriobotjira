import asyncio
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import base64
import time
import os
from datetime import datetime
import google.generativeai as genai

app = FastAPI(title="API Demandas Jira - Vercel")

# === Credenciais (Usando Variáveis de Ambiente para Segurança no GitHub/Vercel) ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
JIRA_EMAIL = os.getenv("JIRA_EMAIL")
JIRA_TOKEN = os.getenv("JIRA_TOKEN")
SLACK_TOKEN = os.getenv("SLACK_TOKEN")
SLACK_CHANNEL = os.getenv("SLACK_CHANNEL", "C09SDGH8EBT")
JIRA_ASSIGNEE_ID = os.getenv("JIRA_ASSIGNEE_ID", "712020:e1b18321-5808-4927-be15-24f3756422ab")

# Configuração Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# Configuração Jira
jira_auth_str = f"{JIRA_EMAIL}:{JIRA_TOKEN}"
jira_encoded_auth = base64.b64encode(jira_auth_str.encode('ascii')).decode('ascii') if JIRA_EMAIL and JIRA_TOKEN else ""
jira_headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": f"Basic {jira_encoded_auth}"
}

# Configuração Slack
slack_headers = {
    "Authorization": f"Bearer {SLACK_TOKEN}",
    "Content-Type": "application/json"
}

refinamento_transition_id = "13"

class DemandaInput(BaseModel):
    texto: str
    urls_imagens: Optional[List[str]] = []
    nome_cliente: Optional[str] = None
    referencia: Optional[str] = "Painel Externo"

async def async_processa_imagens(urls: List[str]):
    downloaded = []
    async with httpx.AsyncClient() as client:
        for i, url in enumerate(urls):
            try:
                if url.startswith("data:"):
                    header, base64_data = url.split(',', 1)
                    mimetype = header.split(':')[1].split(';')[0]
                    content = base64.b64decode(base64_data)
                    ext = mimetype.split('/')[-1] if '/' in mimetype else 'png'
                    nome_arquivo = f"imagem_{int(time.time())}_{i}.{ext}"
                    downloaded.append({"name": nome_arquivo, "content": content, "mimetype": mimetype})
                elif url.startswith("http"):
                    res = await client.get(url)
                    if res.status_code == 200:
                        nome_arquivo = url.split('/')[-1]
                        if not nome_arquivo or len(nome_arquivo) > 100 or '.' not in nome_arquivo[-6:]:
                            nome_arquivo = f"imagem_{int(time.time())}_{i}.png"
                        downloaded.append({
                            "name": nome_arquivo,
                            "content": res.content,
                            "mimetype": res.headers.get('Content-Type', 'image/png')
                        })
            except Exception as e:
                print(f"Erro ao processar imagem: {e}")
    return downloaded

def generate_issue_data(extracted_text, sup_ref, downloaded_files, client_name_slack=None):
    file_names_str = ", ".join([f["name"] for f in downloaded_files]) if downloaded_files else "NENHUM ARQUIVO"
    
    clients_mapping = '''
    [001] EUROPAG: 10231, [006] CLOUDWALK: 10232, [007] PAYGO: 10233, [008] HYPERLOCAL: 10234, [011] YUPI: 10235, [013] PAGOLIVRE: 10236, [022] CDX: 10237, [027] AKIREDE: 10238, [030] TRADEUP: 10239, [031] FACILPAY: 10240, [040] IFOOD: 10241, [044] VILEVEPAY: 10242, [056] PLUS DELIVERY: 10243, [063] KEYPAY: 10244, [066] ORUSPAY: 10245, [067] PARCELECART: 10246, [076] CODEPAY: 10247, [077] EAGLE: 10248, [082] VALOREM: 10249, [086] PERFECTPAY: 10250, [101] PRONTOPAGUEI: 10251, [103] ALLBANKINVEST: 10252, [108] SIMPAY: 10253, [113] MP: 10254, [127] MUITOBANK: 10255, [128] MAISTODOS: 10256, [135] CEOPAG: 10257, [136] PAYPRIME: 10258, [138] PARCELENAHORA: 10259, [143] KIRVANO: 10260, [147] GREGPAY: 10261, [149] DELTAPAG: 10262, [152] PARCELAMOS: 10263, [154] SKYBANK: 10264, [156] COMPROPAY: 10265, [158] OCTUSPAY: 10266, [160] NEXTIONPAY: 10267, [162] ARKAMAY: 10268, [165] DOK: 10269, [168] ATLANTICPAY: 10270, [170] 2M: 10271, [172] INGRESSE: 10272, [174] TICKETANDGO: 10273, [176] ASSINY: 10274, [178] PAYUP: 10275, [180] RP3BANK: 10276, [182] MACREBANK: 10277, [184] TICTO: 10278, [186] BLOKKO: 10279, [187] CAKTOPAY: 10280, [189] AMERICAPAY: 10281, [191] FUNDOPAY: 10282, [193] ABEXPAY: 10283, [195] CARTOS: 10284, [196] HOLYCASH: 10285, [200] AMI: 10286, [203] CASADOCREDITO: 10287, [205] CREDITT: 10288, [207] TBKBANKS: 10289, [209] FASTPAY: 10290, [211] MUTUALBANK: 10291, [213] 4ONBRASIL: 10292, [217] AQUISIPAY: 10293, [221] CRONOS: 10294, [223] PIXPAY: 10295, [225] MAUPI: 10296, [227] HYPERCASHPAY: 10297, [229] SOLPAG: 10298, [231] LASTLINK: 10299, [233] BARATAO: 10300, [235] LERA: 10301, [237] EQUIS: 10302, [239] 8B: 10303, [241] MUSE: 10304, [243] MAGAZORD: 10305, GERAL MOVINGPAY: N/A, HOLDING: N/A
    '''
    
    prompt_text = f"""
    Você é um assistente técnico especialista em Jira.
    Conteúdo da Demanda: "{extracted_text}"
    Referência: {sup_ref}
    Cliente Fornecido: {client_name_slack if client_name_slack else 'Extrair do texto'}
    Arquivos: [{file_names_str}]
    Lista de clientes: {clients_mapping}
    
    Regras:
    - NÃO INVENTE INFORMAÇÕES. Seja DIRETO e OBJETIVO.
    - Classifique: "Bug", "Story" ou "Task".
    
    ESTRUTURA JSON EXIGIDA PARA CADA SEÇÃO DO ADF v1 (USE PAINÉIS):
    {{ "type": "panel", "attrs": {{ "panelType": "info" }}, "content": [ {{ "type": "heading", "attrs": {{ "level": 3 }}, "content": [ {{ "type": "text", "text": "Título da Seção" }} ] }}, {{ "type": "paragraph", "content": [ {{ "type": "text", "text": "Conteúdo..." }} ] }} ] }}

    Retorne APENAS UM JSON VÁLIDO com chaves: "summary", "description" (ADF), "client_name", "client_id", "issuetype", "story_type" e "resumo_slack".
    O campo "summary" DEVE começar com o nome do cliente entre colchetes (ex: [Nome do Cliente] Título).
    O campo "resumo_slack" deve conter de 1 a 2 linhas explicando de forma muito resumida sobre o que se trata a demanda.
    """
    
    contents = [prompt_text]
    for f in downloaded_files:
        if f['mimetype'].startswith('image/'):
            contents.append({"mime_type": f['mimetype'], "data": f['content']})
            
    try:
        response = model.generate_content(contents)
        text = response.text.strip()
        if text.startswith('```json'): text = text[7:]
        elif text.startswith('```'): text = text[3:]
        if text.endswith('```'): text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Erro IA: {e}")
        return None

@app.post("/api/criar-demanda")
async def criar_demanda_api(demanda: DemandaInput):
    """
    Endpoint Síncrono (aguarda) otimizado para o Serverless da Vercel.
    Processa a imagem, bate no Gemini, cria o Jira, aguarda 4s, faz o PUT da descrição e avisa no Slack,
    tudo na mesma requisição para evitar que a Vercel mate o processo em background.
    """
    # Validação de Variáveis de Ambiente
    if not GEMINI_API_KEY or not JIRA_TOKEN:
        raise HTTPException(status_code=500, detail="Servidor mal configurado. Variáveis de ambiente faltando.")
        
    try:
        print(f"Processando imagens enviadas: {len(demanda.urls_imagens)}...")
        downloaded_files = await async_processa_imagens(demanda.urls_imagens)
        issue_data = generate_issue_data(demanda.texto, demanda.referencia, downloaded_files, demanda.nome_cliente)
        
        if not issue_data:
            raise HTTPException(status_code=500, detail="Falha na geração dos dados via Gemini.")

        summary = issue_data.get("summary")
        issue_type_name = issue_data.get("issuetype", "Task")
        story_type = issue_data.get("story_type")
        client_id = issue_data.get("client_id")
        
        fields = {
            "project": {"key": "DSMM"}, 
            "summary": summary, 
            "issuetype": {"name": issue_type_name}, 
            "assignee": {"id": JIRA_ASSIGNEE_ID},
            "customfield_10015": datetime.now().strftime("%Y-%m-%d"), # Start Date
            "customfield_10004": {"id": "10001"}, # Impacto
            "customfield_10333": {"id": "10119"}  # Saude
        }
        if client_id: fields["customfield_10469"] = [{"id": str(client_id)}]
        if issue_type_name == "Story" and story_type: fields["customfield_10402"] = {"id": "10189" if story_type.upper() == "FEATURE" else "10190"}
        
        async with httpx.AsyncClient() as client:
            # 1. Cria Issue
            c_res = await client.post("https://movingpay.atlassian.net/rest/api/3/issue", json={"fields": fields}, headers=jira_headers)
            if c_res.status_code == 201:
                issue_key = c_res.json()['key']
                issue_url = f"https://movingpay.atlassian.net/browse/{issue_key}"
                
                # 2. Sobe Anexos
                if downloaded_files:
                    attach_headers = {"X-Atlassian-Token": "no-check", "Authorization": f"Basic {jira_encoded_auth}"}
                    for f in downloaded_files:
                        files_upload = {'file': (f['name'], f['content'])}
                        await client.post(f"https://movingpay.atlassian.net/rest/api/3/issue/{issue_key}/attachments", headers=attach_headers, files=files_upload)
                
                # 3. Aguarda 4 segundos (na Vercel isso segurará o request vivo)
                await asyncio.sleep(4)
                
                # 4. PUT Descrição
                await client.put(f"https://movingpay.atlassian.net/rest/api/3/issue/{issue_key}", json={"fields": {"description": issue_data["description"]}}, headers=jira_headers)
                
                # 5. Move de Status
                await client.post(f"https://movingpay.atlassian.net/rest/api/3/issue/{issue_key}/transitions", json={"transition": {"id": refinamento_transition_id}}, headers=jira_headers)
                
                # 6. Notifica Slack
                now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
                client_final = str(demanda.nome_cliente if demanda.nome_cliente else issue_data.get("client_name", "NÃO IDENTIFICADO")).upper()
                resumo_txt = issue_data.get("resumo_slack", "")
                
                slack_msg = f"<{issue_url}|{issue_key}> CRIADO REFERENTE AO CLIENTE {client_final} {now_str}\n_{resumo_txt}_"
                await client.post("https://slack.com/api/chat.postMessage", json={"channel": SLACK_CHANNEL, "text": slack_msg}, headers=slack_headers)
                
                return {
                    "status": "success",
                    "issue_key": issue_key,
                    "url": issue_url,
                    "summary": summary,
                    "issuetype": issue_type_name,
                    "client_id_mapped": client_id
                }
            else:
                raise HTTPException(status_code=c_res.status_code, detail=c_res.text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
