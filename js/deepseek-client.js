/**
 * 天机阁 · DeepSeek AI 深度解盘与多轮交互追问引擎
 * 支持东西方玄学深度交融系统提示词、多轮对话追问（Contextual Follow-up Chat）与流式 SSE 渲染
 */

(function(root) {
  const STORAGE_KEY = "tianji_deepseek_key";
  const STORAGE_ENDPOINT = "tianji_deepseek_endpoint";
  const STORAGE_MODEL = "tianji_deepseek_model";

  const DEFAULT_ENDPOINT = "https://api.deepseek.com/chat/completions";
  const DEFAULT_MODEL = "deepseek-chat";

  const SYSTEM_PROMPT = `# Role: 东西方占卜与命理综合分析顾问

## Core Philosophy & Integration Principle
你精通风水环境学、五行生克与西方塔罗牌体系。
【核心原则】：塔罗是塔罗（西方原型象征、潜意识映射与事态演化），风水五行是风水五行（东方时空场能、环境坐向与八字命盘）。
严禁生硬割裂罗列，也严禁把塔罗强行包装成中式外壳。

【客观严谨原则】：
1. 必须秉持客观、准确、公正、辩证的立场。严禁过分积极（不盲目吹捧奉承，不粉饰太平），严禁过分消极（不制造焦虑恐慌，不作宿命论断言）。
2. 如实、清晰地指出当前局势中的潜在阻力、盲区漏洞与实质风险，同时客观指出积极契机与切实可行的破局行动方案。
3. 问测主题【事业与学业】同时涵盖：职场工作、求职晋升、跳槽创业、学业考试、考研考公与进修深造等场景，需根据用户具体抽牌与格局辩证分析。
4. 语言通顺自然、专业透彻，不故弄玄虚，避免在正文中频繁使用括号做冗余解释。

---

## Output Framework & Structure (初始解盘报告)
严格按以下四个模块输出解盘报告，语言兼具专业性与实用洞察，客观通透：

### 1. 综合总览与核心判断
- 融合塔罗核心信息与五行生克，用 2 到 3 句话直接给出综合断语。
- 提炼核心提点，客观说明当前局势的根本特征与关键矛盾。

### 2. 三才阵位具体分析
对抽出的天位前景、人位当下、地位隐患三张牌逐一深度剖析：
- 牌面本意：该牌原本的西方象征意义、心理走向与正逆位真实内涵。
- 五行与环境结合：解释该牌元素在当前八卦方位与八字格局下的具体表现（生克泄耗）。
- 现实指引：针对用户的问测主题（若为事业学业，兼顾工作与学业考试），给出通俗直白的明确结论。

### 3. 环境阻力与深层隐患
- 结合当前坐向、所处空间与五行偏颇，客观指出环境与心态上的潜在卡点与实质风险。

### 4. 具体行动与环境调整建议
给出 2 到 3 条易于执行的日常调理方案：
- 空间与环境整理：具体到方位、材质、色彩搭配等实用建议。
- 现实行动节奏：针对当前局势最应采取的心理防线或具体行动节奏。

---

## Multi-Turn Follow-up Guidance (追问答疑指引)
当用户对解盘结果提出进一步问题时（例如询问具体时间、某张逆位牌怎么化解、具体人际或考试工作细节等）：
1. 始终严格基于前面已排出的八字、时空坐向、所抽三张牌的正逆位与五行信息进行针对性分析。
2. 回答一针见血、逻辑连贯、客观公正，有问必答，并给出具体可行的现实行动与环境改善建议。
3. 语言通俗自然，用普通话讲透道理，不故弄玄虚。`;

  const getStorage = (key) => {
    try {
      if (typeof localStorage !== "undefined") return localStorage.getItem(key);
    } catch (e) {}
    return null;
  };

  const setStorage = (key, val) => {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, val);
    } catch (e) {}
  };

  const getFengshuiEngine = () => {
    if (typeof window !== "undefined" && window.FengshuiEngine) return window.FengshuiEngine;
    if (typeof FengshuiEngine !== "undefined") return FengshuiEngine;
    if (typeof require === "function") return require("./fengshui-engine.js").FengshuiEngine;
    return root.FengshuiEngine;
  };

  class DeepSeekClient {
    static getApiKey() {
      return getStorage(STORAGE_KEY) || "";
    }

    static setApiKey(key) {
      setStorage(STORAGE_KEY, (key || "").trim());
    }

    static getEndpoint() {
      return getStorage(STORAGE_ENDPOINT) || DEFAULT_ENDPOINT;
    }

    static setEndpoint(endpoint) {
      setStorage(STORAGE_ENDPOINT, (endpoint || "").trim());
    }

    static getModel() {
      return getStorage(STORAGE_MODEL) || DEFAULT_MODEL;
    }

    static setModel(model) {
      setStorage(STORAGE_MODEL, (model || "").trim());
    }

    static hasKey() {
      return !!this.getApiKey();
    }

    static getSystemPrompt() {
      return SYSTEM_PROMPT;
    }

    /**
     * 构建发送给模型的标准化初始数据 Payload
     */
    static buildPayload({ topic, baziResult, direction, drawnCards }) {
      const FengshuiEngine = getFengshuiEngine();
      const topicNames = {
        career: "事业功名（求职晋升、跳槽创业、职场气场）",
        love: "情感姻缘（正缘桃花、感情走向、婚姻默契）",
        wealth: "财禄丰殖（正财偏财、投资风向、聚财守财）",
        home: "居所宅运（家宅安宁、空间气场、乔迁吉凶）"
      };

      const baguaInfo = FengshuiEngine.getBaguaByDirection(direction);
      const spreadPositions = FengshuiEngine.getSpreadPositions();

      const cardsDrawnPayload = drawnCards.map((item, idx) => {
        const spreadPos = spreadPositions[idx] || spreadPositions[0];
        const card = item.card;
        const isReversed = item.isReversed;
        const rel = FengshuiEngine.analyzeRelation(card.wuxing, spreadPos.wuxing);

        return {
          position: `${spreadPos.name}·${spreadPos.direction}${spreadPos.bagua}宫（${spreadPos.aspect}）`,
          card_name: `${card.nameCn}（${card.nameEn}）`,
          orientation: isReversed ? "逆位" : "正位",
          card_western_element: card.element,
          card_wuxing: card.wuxing,
          position_wuxing: spreadPos.wuxing,
          wuxing_interaction: rel.type
        };
      });

      return {
        user_query: `占卜诉求：【${topicNames[topic] || topic}】`,
        birth_context: baziResult ? {
          four_pillars: baziResult.fourPillarsText,
          day_master: baziResult.dayMaster.name,
          strength_status: baziResult.strengthStatus,
          favorable_elements: baziResult.favorable.join("、"),
          unfavorable_elements: baziResult.unfavorable.join("、"),
          wuxing_counts: baziResult.wuxingCounts
        } : "生辰未提供（随缘占算）",
        space_context: {
          current_facing: `${direction}（${baguaInfo.desc}）`,
          bagua_gua: baguaInfo.gua,
          facing_wuxing: baguaInfo.wuxing
        },
        spread_name: "天地人三才·八卦时空综合阵",
        cards_drawn: cardsDrawnPayload,
        reading_time: new Date().toLocaleString("zh-CN")
      };
    }

    /**
     * 发起通用多轮流式对话请求
     * @param {Object} params
     * @param {Array} params.messages - [{ role: 'system'|'user'|'assistant', content: string }]
     * @param {Function} params.onChunk - (chunk, fullText) => {}
     * @param {Function} params.onDone - (fullText) => {}
     * @param {Function} params.onError - (err) => {}
     */
    static async streamChat({ messages, onChunk, onDone, onError }) {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        if (onError) onError(new Error("未配置 DeepSeek API Key，请在右上角设置中填入 API Key"));
        return;
      }

      const endpoint = this.getEndpoint();
      const model = this.getModel();

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.65,
            stream: true
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`API 请求失败 (${response.status}): ${errBody || response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); // 保留未完整的行

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) continue;

            const dataStr = trimmed.replace(/^data:\s*/, "");
            if (dataStr === "[DONE]") {
              if (onDone) onDone(fullText);
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullText += delta;
                if (onChunk) onChunk(delta, fullText);
              }
            } catch (e) {
              // 忽略个别行解析错误
            }
          }
        }

        if (onDone) onDone(fullText);
      } catch (err) {
        console.error("DeepSeek Stream Error:", err);
        if (onError) onError(err);
      }
    }

    /**
     * 发起首次综合解盘
     */
    static async streamReading({ topic, baziResult, direction, drawnCards, onChunk, onDone, onError }) {
      const payloadData = this.buildPayload({ topic, baziResult, direction, drawnCards });
      const initialMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payloadData, null, 2) }
      ];

      return this.streamChat({
        messages: initialMessages,
        onChunk,
        onDone,
        onError
      });
    }

    /**
     * 极简轻量级 Markdown 转 HTML 渲染器
     */
    static renderMarkdown(md) {
      if (!md) return "";
      let html = md;

      // H3
      html = html.replace(/^### (.*$)/gim, '<h3 class="deepseek-h3">$1</h3>');
      // H2
      html = html.replace(/^## (.*$)/gim, '<h2 class="deepseek-h2">$1</h2>');
      // H1
      html = html.replace(/^# (.*$)/gim, '<h1 class="deepseek-h1">$1</h1>');
      // Bold
      html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
      // Lists
      html = html.replace(/^\- (.*$)/gim, '<li class="deepseek-li">$1</li>');
      html = html.replace(/(<li.*<\/li>)/s, '<ul class="deepseek-ul">$1</ul>');
      // Paragraphs
      html = html.split(/\n\n+/).map(p => {
        if (p.startsWith("<h") || p.startsWith("<ul") || p.startsWith("<li")) return p;
        return `<p class="deepseek-p">${p.replace(/\n/g, "<br/>")}</p>`;
      }).join("\n");

      return html;
    }
  }

  // 挂载到全局
  if (typeof window !== "undefined") {
    window.DeepSeekClient = DeepSeekClient;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { DeepSeekClient };
  }
})(typeof window !== "undefined" ? window : global);
