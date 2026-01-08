# Servidor de Consulta CRF/FGTS

Servidor Node.js com Puppeteer para consultar automaticamente o Certificado de Regularidade do FGTS na Caixa.

## Deploy no Render.com (Gratuito)

### Passo 1: Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome do repositório: `consulta-crf-server`
3. Deixe público
4. Clique em "Create repository"

### Passo 2: Subir os arquivos

Você pode fazer isso diretamente pelo navegador do GitHub:

1. No seu novo repositório, clique em "uploading an existing file"
2. Arraste os 3 arquivos desta pasta:
   - `package.json`
   - `server.js`
   - `README.md`
3. Clique em "Commit changes"

### Passo 3: Deploy no Render

1. Acesse [render.com](https://render.com) e crie uma conta (pode usar o GitHub)
2. Clique em "New" → "Web Service"
3. Conecte seu repositório GitHub `consulta-crf-server`
4. Configure:
   - **Name**: `consulta-crf-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Clique em "Create Web Service"

### Passo 4: Aguardar deploy

O Render vai:
1. Clonar o repositório
2. Instalar dependências
3. Iniciar o servidor

Após alguns minutos, você terá uma URL como:
```
https://consulta-crf-server.onrender.com
```

### Passo 5: Testar

Acesse a URL no navegador. Você deve ver:
```json
{
  "status": "ok",
  "message": "Servidor de Consulta CRF/FGTS ativo"
}
```

### Passo 6: Me passar a URL

Depois que funcionar, me envie a URL do seu servidor no Lovable para eu configurar a integração.

---

## Uso da API

### Endpoint: `POST /consulta-crf`

**Request:**
```json
{
  "cnpj": "02016507000169"
}
```

**Response (sucesso):**
```json
{
  "success": true,
  "situacao": "REGULAR",
  "razaoSocial": "ELETROSUL CENTRAIS ELETRICAS S A",
  "dataConsulta": "2026-01-08T17:00:00.000Z",
  "validadeAte": "2026-02-07T00:00:00.000Z",
  "numeroCertificado": "CRF-02016507000169"
}
```

---

## Observações

- O plano gratuito do Render "dorme" após 15 minutos de inatividade
- A primeira consulta após o servidor acordar pode demorar ~30 segundos
- Consultas subsequentes são mais rápidas (~5-10 segundos)
