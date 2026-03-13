import { GoogleGenAI, Type } from "@google/genai";

export const geminiService = {
  async getAI() {
    let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    
    // Check if we need to prompt for a key (for models that require it)
    if ((!apiKey || apiKey === "" || apiKey === "undefined") && typeof window !== 'undefined' && (window as any).aistudio) {
      const aistudio = (window as any).aistudio;
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // If no key is selected and we don't have one in env, we might need to open the dialog
        // However, we'll just throw for now and let the UI handle it if needed.
        // For free models, GEMINI_API_KEY should be present.
      }
      apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    }

    if (!apiKey || apiKey === "" || apiKey === "undefined") {
      throw new Error("GEMINI_API_KEY is not set. Please ensure it is configured in the environment.");
    }
    return new GoogleGenAI({ apiKey });
  },

  async processNaturalLanguage(text: string, leadId?: number, stages: string[] = []) {
    const ai = await this.getAI();
    const stagesContext = stages.length > 0 ? `Estágios disponíveis no CRM: ${stages.join(", ")}` : "";
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise o seguinte texto de um vendedor e determine a ação pretendida sobre os leads do CRM.
      
      Texto: "${text}"
      ID do Lead Contextual (opcional): ${leadId || "nenhum"}
      ${stagesContext}
      
      Ações possíveis:
      - "create_lead": Criar um novo lead. Requer nome e empresa. Identificado por palavras como "add", "adicione", "ad", "novo lead", ou apenas fornecendo os dados.
      - "update_lead": Atualizar dados de um lead existente.
      - "delete_lead": Remover um lead.
      - "search_lead": Buscar um lead.
      - "unknown": Se não for possível identificar.
      
      Instruções de Estágio:
      - O usuário frequentemente indica o estágio no final da frase usando preposições como "na", "no", "em".
      - Exemplos: "na 1° menssagem", "no diagnostico", "em proposta", "no fechamento".
      - Identifique qual estágio do CRM melhor corresponde a esses termos.
      - Se o usuário disser "1° menssagem", mapeie para o estágio que contenha "1ª Mensagem" ou similar.
      - Se o usuário disser "diagnostico", mapeie para o estágio que contenha "Diagnóstico" ou similar.
      - Use os estágios disponíveis listados acima para fazer a correspondência exata.
      
      Retorne um JSON com:
      - action: string (uma das ações acima)
      - data: {
          name: string (nome do lead),
          job_title: string (cargo ou função),
          company: string (empresa),
          stage_name: string (o nome EXATO do estágio conforme a lista fornecida, se identificado),
          phone: string (apenas números),
          email: string,
          summary: string (resumo amigável da ação realizada)
        }
      - target_lead_query: string (se for update/delete/search, termo para identificar o lead, ex: nome ou empresa)
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            data: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                job_title: { type: Type.STRING },
                company: { type: Type.STRING },
                stage_name: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
                summary: { type: Type.STRING }
              }
            },
            target_lead_query: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  },

  async mapSpreadsheetColumns(headers: string[]) {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um especialista em mapeamento de dados. Sua tarefa é mapear os cabeçalhos de uma planilha para os campos internos de um CRM.
      
      Campos do CRM:
      - name: Nome completo do lead ou contato (ex: "Responsável", "Contato", "Nome").
      - job_title: Cargo, função ou posição do contato na empresa (ex: "Cargo", "Função", "Position").
      - company: Nome da empresa, organização, razão social ou cliente (ex: "Empresa", "Razão Social", "Nome Fantasia", "Cliente", "Organização", "Company").
      - email: Endereço de e-mail.
      - phone: Telefone, celular ou contato telefônico.
      - website: URL do site da empresa.
      - segment: Setor de atuação, indústria ou nicho.
      - location: Cidade, estado, endereço ou localização geográfica.
      - cnpj: Cadastro Nacional da Pessoa Jurídica (CNPJ).
      - stage: Status atual, estágio do funil ou situação (ex: Lead, Proposta, Negociação).
      - value: Valor monetário do negócio, receita estimada ou orçamento.
      
      Cabeçalhos da Planilha: ${headers.join(", ")}
      
      Instruções:
      1. Identifique a melhor correspondência para cada campo do CRM com base nos cabeçalhos fornecidos.
      2. Considere variações de nomes (ex: "Razão Social" -> "company", "Nome do Cliente" -> "company" se for uma empresa, "E-mail" -> "email", "Celular" -> "phone", "Faturamento" -> "value").
      3. Retorne APENAS um objeto JSON onde as chaves são os campos do CRM e os valores são os cabeçalhos exatos da planilha.
      4. Se um campo não tiver uma correspondência clara, não o inclua no JSON.
      5. Seja inteligente: "Nome do Cliente" mapeia para "name" se for pessoa física, ou "company" se for pessoa jurídica. Na dúvida, se houver "Responsável" e "Cliente", "Responsável" -> "name" e "Cliente" -> "company".
      6. ATENÇÃO: Diferencie "Nome" de "Cargo". Se houver colunas como "Responsável" e "Cargo", mapeie "Responsável" para "name" e "Cargo" para "job_title". Não confunda o nome da pessoa com o cargo dela.
      7. ATENÇÃO: Priorize mapear "Empresa" ou "Razão Social" para o campo "company". Se houver uma coluna chamada "Nome" e outra "Empresa", "Nome" -> "name" e "Empresa" -> "company".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            job_title: { type: Type.STRING },
            company: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            website: { type: Type.STRING },
            segment: { type: Type.STRING },
            location: { type: Type.STRING },
            cnpj: { type: Type.STRING },
            stage: { type: Type.STRING },
            value: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  },

  async enrichCompanyInfo(cnpj: string) {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere informações fictícias mas realistas para uma empresa brasileira com o CNPJ ${cnpj}.
      Retorne um JSON com: company (nome), website, segment, location (Cidade/UF), size (Pequena, Média, Grande).`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  }
};
