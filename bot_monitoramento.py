import requests
import json
import base64
import time
import os
import re
import traceback
from datetime import datetime
import google.generativeai as genai

# === Credenciais Gemini ===
genai.configure(api_key="XXX_GEMINI_KEY_XXX")
model = genai.GenerativeModel('gemini-2.5-flash')

# === Credenciais Jira ===
jira_email = "marcos.vinicius@movingpay.com.br"
jira_token = "XXX_JIRA_TOKEN_XXX"
jira_auth_str = f"{jira_email}:{jira_token}"
jira_encoded_auth = base64.b64encode(jira_auth_str.encode('ascii')).decode('ascii')
jira_headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": f"Basic {jira_encoded_auth}"
}

marcos_account_id = "712020:e1b18321-5808-4927-be15-24f3756422ab"
refinamento_transition_id = "13" # Conforme verificado anteriormente para o projeto DSMM

# === Credenciais Slack ===
slack_token = "XXX_SLACK_TOKEN_XXX"
slack_channel = "C09SDGH8EBT"
slack_headers = {
    "Authorization": f"Bearer {slack_token}",
    "Content-Type": "application/json"
}

last_ts_file = r"C:\Users\marcos.vinicius\.gemini\tmp\system32\last_slack_ts.txt"

def get_last_ts():
    if os.path.exists(last_ts_file):
        with open(last_ts_file, 'r') as f:
            return f.read().strip()
    return str(time.time())

def set_last_ts(ts):
    with open(last_ts_file, 'w') as f:
        f.write(str(ts))

def download_slack_files(slack_files):
    """Baixa arquivos (fotos, vídeos, docs) do Slack"""
    downloaded = []
    if not slack_files: return downloaded
    for f in slack_files:
        file_url = f.get('url_private_download') or f.get('url_private')
        file_name = f.get('name')
        mimetype = f.get('mimetype', '')
        if file_url and file_name:
            sl_res = requests.get(file_url, headers={"Authorization": f"Bearer {slack_token}"})
            if sl_res.status_code == 200:
                downloaded.append({"name": file_name, "content": sl_res.content, "mimetype": mimetype})
    return downloaded

def get_jira_issue_data_v2(issue_key):
    url = f"https://movingpay.atlassian.net/rest/api/2/issue/{issue_key}"
    res = requests.get(url, headers=jira_headers)
    if res.status_code == 200:
        data = res.json()
        desc = data.get('fields', {}).get('description', 'Nenhuma descrição encontrada no ticket.')
        attachments = data.get('fields', {}).get('attachment', [])
        return desc, attachments
    return "Erro ao buscar do Jira", []

def download_jira_attachments(attachments):
    downloaded = []
    if not attachments: return downloaded
    for att in attachments:
        url = att.get('content')
        name = att.get('filename')
        mimetype = att.get('mimeType', '')
        if url and name:
            res = requests.get(url, headers={"Authorization": f"Basic {jira_encoded_auth}"})
            if res.status_code == 200:
                downloaded.append({"name": name, "content": res.content, "mimetype": mimetype})
    return downloaded

def upload_to_jira(issue_key, downloaded_files):
    if not downloaded_files: return
    url = f"https://movingpay.atlassian.net/rest/api/3/issue/{issue_key}/attachments"
    attach_headers = {"X-Atlassian-Token": "no-check", "Authorization": f"Basic {jira_encoded_auth}"}
    for f in downloaded_files:
        files = {'file': (f['name'], f['content'])}
        requests.post(url, headers=attach_headers, files=files)

def generate_issue_data(extracted_text, sup_ref, downloaded_files, client_name_slack=None):
    file_names_str = ", ".join([f["name"] for f in downloaded_files]) if downloaded_files else "NENHUM ARQUIVO"
    
    clients_mapping = '''
    [001] EUROPAG: 10231, [006] CLOUDWALK: 10232, [007] PAYGO: 10233, [008] HYPERLOCAL: 10234, [011] YUPI: 10235, [013] PAGOLIVRE: 10236, [022] CDX: 10237, [027] AKIREDE: 10238, [030] TRADEUP: 10239, [031] FACILPAY: 10240, [040] IFOOD: 10241, [044] VILEVEPAY: 10242, [056] PLUS DELIVERY: 10243, [063] KEYPAY: 10244, [066] ORUSPAY: 10245, [067] PARCELECART: 10246, [076] CODEPAY: 10247, [077] EAGLE: 10248, [082] VALOREM: 10249, [086] PERFECTPAY: 10250, [101] PRONTOPAGUEI: 10251, [103] ALLBANKINVEST: 10252, [108] SIMPAY: 10253, [113] MP: 10254, [127] MUITOBANK: 10255, [128] MAISTODOS: 10256, [135] CEOPAG: 10257, [136] PAYPRIME: 10258, [138] PARCELENAHORA: 10259, [143] KIRVANO: 10260, [147] GREGPAY: 10261, [149] DELTAPAG: 10262, [152] PARCELAMOS: 10263, [154] SKYBANK: 10264, [156] COMPROPAY: 10265, [158] OCTUSPAY: 10266, [160] NEXTIONPAY: 10267, [162] ARKAMAY: 10268, [165] DOK: 10269, [168] ATLANTICPAY: 10270, [170] 2M: 10271, [172] INGRESSE: 10272, [174] TICKETANDGO: 10273, [176] ASSINY: 10274, [178] PAYUP: 10275, [180] RP3BANK: 10276, [182] MACREBANK: 10277, [184] TICTO: 10278, [186] BLOKKO: 10279, [187] CAKTOPAY: 10280, [189] AMERICAPAY: 10281, [191] FUNDOPAY: 10282, [193] ABEXPAY: 10283, [195] CARTOS: 10284, [196] HOLYCASH: 10285, [200] AMI: 10286, [203] CASADOCREDITO: 10287, [205] CREDITT: 10288, [207] TBKBANKS: 10289, [209] FASTPAY: 10290, [211] MUTUALBANK: 10291, [213] 4ONBRASIL: 10292, [217] AQUISIPAY: 10293, [221] CRONOS: 10294, [223] PIXPAY: 10295, [225] MAUPI: 10296, [227] HYPERCASHPAY: 10297, [229] SOLPAG: 10298, [231] LASTLINK: 10299, [233] BARATAO: 10300, [235] LERA: 10301, [237] EQUIS: 10302, [239] 8B: 10303, [241] MUSE: 10304, [243] MAGAZORD: 10305, GERAL MOVINGPAY: N/A, HOLDING: N/A
    '''
    prompt_text = f"""
    Você é um assistente técnico especialista em Jira.
    Conteúdo da Demanda: "{extracted_text}"
    Referência Detectada: {sup_ref}
    Cliente Fornecido: {client_name_slack if client_name_slack else 'Extrair do texto'}
    Arquivos: [{file_names_str}]
    
    Lista de clientes conhecidos e seus IDs no Jira:
    {clients_mapping}
    
    Regras:
    - NÃO INVENTE INFORMAÇÕES. Seja DIRETO e OBJETIVO.
    - Classifique: "Bug", "Story" ou "Task".
    - Se Story, defina story_type como "FEATURE" ou "MELHORIA".
    - Template ADF v1: Use nós "panel" com H3 no topo.
    
    Se TASK: [Contexto: info], [Descrição: info], [Observações: note]
    Se STORY (FEATURE): [Contexto: info], [Descrição: info], [Critérios de aceite: success], [Observações: note]
    Se STORY (MELHORIA): [Contexto: info], [Comportamento atual: warning], [Comportamento esperado: success], [Observações: note]
    Se BUG: [Contexto: info], [Problema: error], [Como replicar: warning], [Evidências: info], [Observações: note]
    (Evidências: se vazio, "Nenhuma evidência (prints/vídeos) foi anexada à demanda.")
    
    Retorne APENAS JSON: summary, description (ADF), client_name, issuetype, story_type e resumo_slack.
    Summary deve ser [Nome do Cliente] Título.
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
    except:
        return {"summary": f"[{sup_ref}] Demanda", "description": {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": extracted_text}]}]}, "client_name": client_name_slack or "Não identificado", "issuetype": "Task", "story_type": None}

print("Iniciando Bot Corrigido (Frequência 30s + Gatilho Flexível)...")

while True:
    try:
        last_ts = get_last_ts()
        url = f"https://slack.com/api/conversations.history?channel={slack_channel}&oldest={last_ts}"
        res = requests.get(url, headers=slack_headers)
        data = res.json()
        if data.get('ok') and data.get('messages'):
            for msg in reversed(data['messages']):
                ts = msg.get('ts')
                original_text = msg.get('text', '')
                text_lower = original_text.lower()
                if msg.get('bot_id'):
                    set_last_ts(ts)
                    continue
                
                text_clean = re.sub(r'<@[A-Z0-9]+>', '', text_lower).strip()
                original_clean = re.sub(r'<@[A-Z0-9]+>', '', original_text).strip()
                
                # GATILHO CORRIGIDO: Aceita dsm, dsmm ou demanda
                has_trigger = text_clean.startswith('criar dsm') or text_clean.startswith('criar dsmm') or text_clean.startswith('criar demanda')
                has_desc_tag = bool(re.search(r'(descri[cç][aã]o:|demanda:)', text_lower))
                sup_match = re.search(r'sup-\d+', original_text, re.IGNORECASE)
                
                is_direct_desc = has_trigger and has_desc_tag
                is_sup_link = has_trigger and not has_desc_tag and sup_match

                if is_direct_desc or is_sup_link:
                    print(f"Demanda detectada: {ts}")
                    sup_ref = sup_match.group(0).upper() if sup_match else "Demanda"
                    downloaded_files = download_slack_files(msg.get('files', []))
                    client_name_slack = None
                    if is_sup_link:
                        parts = [p.strip() for p in original_clean.split(',')]
                        if len(parts) >= 2: client_name_slack = parts[1]
                        jira_desc, jira_atts = get_jira_issue_data_v2(sup_ref)
                        downloaded_files.extend(download_jira_attachments(jira_atts))
                        extracted_content = f"Ticket {sup_ref}: {jira_desc}"
                    else:
                        trigger_part = original_clean.split(':', 1)[0]
                        if ',' in trigger_part: client_name_slack = trigger_part.split(',')[1].strip()
                        content_match = re.search(r'(?:descri[cç][aã]o:|demanda:)\s*(.*)', original_text, re.IGNORECASE | re.DOTALL)
                        extracted_content = content_match.group(1).strip() if content_match else original_text

                    issue_data = generate_issue_data(extracted_content, sup_ref, downloaded_files, client_name_slack)
                    summary = issue_data.get("summary")
                    issue_type_name = issue_data.get("issuetype", "Task")
                    story_type = issue_data.get("story_type")
                    client_id = issue_data.get("client_id")

                    # Cria Issue atribuída ao Marcos Vinicius no DSMM
                    fields = {"project": {"key": "DSMM"}, "summary": summary, "issuetype": {"name": issue_type_name}, "assignee": {"id": marcos_account_id}}
                    
                    # Start Date: Data atual
                    fields["customfield_10015"] = datetime.now().strftime("%Y-%m-%d")
                    
                    # Impacto Default: Significant / Large
                    fields["customfield_10004"] = {"id": "10001"}
                    
                    # Saúde do Cliente: Verde
                    fields["customfield_10333"] = {"id": "10119"}
                    
                    # Cliente
                    if client_id:
                        fields["customfield_10469"] = [{"id": str(client_id)}]
                        
                    if issue_type_name == "Story" and story_type:
                        fields["customfield_10402"] = {"id": "10189" if story_type.upper() == "FEATURE" else "10190"}
                    
                    c_res = requests.post("https://movingpay.atlassian.net/rest/api/3/issue", json={"fields": fields}, headers=jira_headers)
                    if c_res.status_code == 201:
                        issue_key = c_res.json()['key']
                        print(f"Jira criado: {issue_key}")
                        if downloaded_files: upload_to_jira(issue_key, downloaded_files)
                        time.sleep(4)
                        requests.put(f"https://movingpay.atlassian.net/rest/api/3/issue/{issue_key}", json={"fields": {"description": issue_data["description"]}}, headers=jira_headers)
                        requests.post(f"https://movingpay.atlassian.net/rest/api/3/issue/{issue_key}/transitions", json={"transition": {"id": refinamento_transition_id}}, headers=jira_headers)
                        
                        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
                        client_final = str(issue_data.get("client_name", "Não identificado")).upper()
                        # NOTIFICAÇÃO PADRÃO
                        slack_msg = f"<{f'https://movingpay.atlassian.net/browse/{issue_key}'}|{issue_key}> CRIADO REFERENTE AO CLIENTE {client_final} {now_str}"
                        thread_ts = msg.get('thread_ts') or ts
                        requests.post("https://slack.com/api/chat.postMessage", json={"channel": slack_channel, "text": slack_msg, "thread_ts": thread_ts}, headers=slack_headers)
                set_last_ts(ts)
    except Exception as e:
        print(f"Erro: {e}")
        time.sleep(10)
    time.sleep(5)
