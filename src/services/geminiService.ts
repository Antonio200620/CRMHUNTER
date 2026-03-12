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

  async processNaturalLanguage(text: string, leadId?: number) {
    const ai = await this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise o seguinte texto de um vendedor e determine a ação pretendida sobre os leads do CRM.
      
      Texto: "${text}"
      ID do Lead Contextual (opcional): ${leadId || "nenhum"}
      
      Ações possíveis:
      - "create_lead": Criar um novo lead. Requer nome e empresa.
      - "update_lead": Atualizar dados de um lead (estágio, telefone, email, etc).
      - "delete_lead": Remover um lead do sistema.
      - "search_lead": Buscar informações sobre um lead específico.
      - "unknown": Se não for possível identificar a ação.
      
      Retorne um JSON com:
      - action: string (uma das ações acima)
      - data: {
          name: string (nome do lead),
          company: string (empresa),
          stage_name: string (ex: "Lead", "Proposta", "Fechamento"),
          phone: string,
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
      - name: Nome completo do lead ou contato.
      - company: Nome da empresa ou organização.
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
      2. Considere variações de nomes (ex: "Razão Social" -> "company", "E-mail" -> "email", "Celular" -> "phone", "Faturamento" -> "value").
      3. Retorne APENAS um objeto JSON onde as chaves são os campos do CRM e os valores são os cabeçalhos exatos da planilha.
      4. Se um campo não tiver uma correspondência clara, não o inclua no JSON.
      5. Seja inteligente: "Nome do Cliente" mapeia para "name", "Telefone Comercial" mapeia para "phone", etc.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
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
