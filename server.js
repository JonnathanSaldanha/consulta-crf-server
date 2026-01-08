const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Formata CNPJ para exibição
function formatarCNPJ(cnpj) {
  const clean = cnpj.replace(/\D/g, '');
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Servidor de Consulta CRF/FGTS ativo',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de consulta
app.post('/consulta-crf', async (req, res) => {
  const { cnpj } = req.body;

  if (!cnpj) {
    return res.status(400).json({ success: false, error: 'CNPJ é obrigatório' });
  }

  const cnpjLimpo = cnpj.replace(/\D/g, '');

  if (cnpjLimpo.length !== 14) {
    return res.status(400).json({ success: false, error: 'CNPJ inválido' });
  }

  console.log(`[${new Date().toISOString()}] Consultando CNPJ: ${formatarCNPJ(cnpjLimpo)}`);

  let browser;
  
  try {
    // Inicia o navegador
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });

    const page = await browser.newPage();
    
    // Configura timeout
    page.setDefaultTimeout(30000);
    
    // Acessa a página de consulta
    await page.goto('https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf', {
      waitUntil: 'networkidle2'
    });

    // Aguarda o formulário carregar
    await page.waitForSelector('select[id$="tipoInscricao"]', { timeout: 10000 });

    // Seleciona "CNPJ" no dropdown
    await page.select('select[id$="tipoInscricao"]', 'CNPJ');
    
    // Aguarda um pouco para o formulário atualizar
    await page.waitForTimeout(500);

    // Preenche o CNPJ
    const inputInscricao = await page.$('input[id$="inscricao"]');
    if (inputInscricao) {
      await inputInscricao.click({ clickCount: 3 }); // Seleciona todo texto
      await inputInscricao.type(cnpjLimpo);
    }

    // Clica no botão Consultar
    const btnConsultar = await page.$('input[type="submit"][value="Consultar"], button[id$="btnConsultar"]');
    if (btnConsultar) {
      await btnConsultar.click();
    } else {
      // Tenta encontrar por outro seletor
      await page.click('input[type="submit"]');
    }

    // Aguarda a resposta carregar
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Extrai os dados da página de resultado
    const resultado = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      // Verifica se está regular ou irregular
      const pageText = document.body.innerText.toUpperCase();
      const isRegular = pageText.includes('REGULAR PERANTE O FGTS') || 
                        pageText.includes('ESTÁ REGULAR');
      const isIrregular = pageText.includes('IRREGULAR') || 
                          pageText.includes('NÃO ESTÁ REGULAR');

      // Tenta extrair dados específicos
      let inscricao = null;
      let razaoSocial = null;
      let validade = null;

      // Busca por padrões no texto
      const inscricaoMatch = pageText.match(/INSCRI[CÇ][AÃ]O[:\s]+([0-9.\/-]+)/i);
      if (inscricaoMatch) inscricao = inscricaoMatch[1];

      const razaoMatch = pageText.match(/RAZ[AÃ]O SOCIAL[:\s]+([^\n]+)/i);
      if (razaoMatch) razaoSocial = razaoMatch[1].trim();

      const validadeMatch = pageText.match(/VALIDADE[:\s]+(\d{2}\/\d{2}\/\d{4})/i) ||
                           pageText.match(/V[AÁ]LIDO AT[EÉ][:\s]+(\d{2}\/\d{2}\/\d{4})/i);
      if (validadeMatch) validade = validadeMatch[1];

      return {
        situacao: isRegular ? 'REGULAR' : (isIrregular ? 'IRREGULAR' : 'INDEFINIDO'),
        inscricao,
        razaoSocial,
        validade,
        textoCompleto: document.body.innerText.substring(0, 2000)
      };
    });

    console.log(`[${new Date().toISOString()}] Resultado para ${formatarCNPJ(cnpjLimpo)}: ${resultado.situacao}`);

    // Converte validade para ISO se existir
    let validadeISO = null;
    if (resultado.validade) {
      const [dia, mes, ano] = resultado.validade.split('/');
      validadeISO = new Date(ano, mes - 1, dia).toISOString();
    }

    res.json({
      success: true,
      situacao: resultado.situacao,
      razaoSocial: resultado.razaoSocial,
      inscricao: resultado.inscricao,
      dataConsulta: new Date().toISOString(),
      validadeAte: validadeISO,
      numeroCertificado: resultado.situacao === 'REGULAR' ? `CRF-${cnpjLimpo}` : null
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro na consulta:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao consultar a Caixa'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Consulta CRF rodando na porta ${PORT}`);
  console.log(`📋 Endpoint: POST /consulta-crf`);
  console.log(`💡 Exemplo: { "cnpj": "02016507000169" }`);
});
