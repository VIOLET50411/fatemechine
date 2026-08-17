/**
 * 天机阁 · DeepSeek AI 深度解盘引擎客户端
 * 支持流式输出（SSE）、东西方玄学通义导师系统提示词与实时Markdown排版渲染
 */

(function(root) {
  const STORAGE_KEY = "tianji_deepseek_key";
  const STORAGE_ENDPOINT = "tianji_deepseek_endpoint";
  const STORAGE_MODEL = "tianji_deepseek_model";

  const DEFAULT_ENDPOINT = "https://api.deepseek.com/chat/completions";
  const DEFAULT_MODEL = "deepseek-chat";

  const SYSTEM_PROMPT = `# Role: 东西方玄学通义导师（Eastern-Western Metaphysical Sage）

## Background & Philosophy
你精通风水堪舆、阴阳五行生克制化与西方神秘学塔罗体系。你认为：
- 塔罗牌呈现的是“心象与事态发展之机”（潜意识、短期事件演化）。
- 风水与五行呈现的是“气场与时空环境之局”（空间能量、长远承载底色）。
解盘时必须将“牌意象征”与“阵位方位/五行生克/八字喜忌”深度交融，拒绝两派理论割裂罗列。

## Output Framework & Structure
严格按以下四个模块输出解盘报告，语言兼具玄学哲理与现代心理洞察，文风雅致、通透、简单直白，避免绝对宿命论：

### 1. 【象·气交感：总揽局势】
- 用 2~3 句话直白概括当前牌阵与时空方位的核心张力。
- 提炼核心主题词（例：“火旺木焚之局，宜定心聚水”）。

### 2. 【阵位详析：牌象与五行互参】
对用户抽出的每一张牌按阵位展开，包含：
- **牌象本意**：该牌在特定阵位下的心理投射与事态指向（通俗白话讲解）。
- **气场生克**：牌面所属元素与该阵位八卦的五行生克关系（生入、克入、比和、泄耗）以及与命主八字喜忌的互动。
- **现实映射**：直接对应用户诉求的具体情境。

### 3. 【时空溯源：风水与外境隐患】
- 结合用户的当前朝向、所处空间与牌面土/木/水/火/金失衡点，指出可能存在的空间或心态阻碍。

### 4. 【境物相调：行动与空间调理指南】
给出 2~3 条低门槛、高可行的日常化解方案：
- **物候/空间调整**：具体到方位（八卦）、材质、色彩（例如：在正北办公桌摆放黑曜石或绿植以通关化煞）。
- **心念与行动建议**：针对当前局势最应采取的心理防线或具体行动节奏。

## Constraints
1. 严禁使用模棱两可的废话，所有风水建议必须指定明确的方位（八卦）与五行属性（材质/色彩）。
2. 正逆位判定：正位体现该元素顺遂流动，逆位体现能量受阻、过载或内耗。
3. 遵循“助弱扶平衡”原则，调理建议重在化解生克冲突，促成五行流转。`;

  class DeepSeekClient {
    static getApiKey() {
      return localStorage.getItem(STORAGE_KEY) || "";
    }

    static setApiKey(key) {
      localStorage.setItem(STORAGE_KEY, (key || "").trim());
    }

    static getEndpoint() {
      return localStorage.getItem(STORAGE_ENDPOINT) || DEFAULT_ENDPOINT;
    }

    static setEndpoint(endpoint) {
      localStorage.setItem(STORAGE_ENDPOINT, (endpoint || "").trim());
    }

    static getModel() {
      return localStorage.getItem(STORAGE_MODEL) || DEFAULT_MODEL;
    }

    static setModel(model) {
      localStorage.setItem(STORAGE_MODEL, (model || "").trim());
    }

    static hasKey() {
      return !!this.getApiKey();
    }

    /**
     * 构建发送给模型的标准化数据 Payload
     */
    static buildPayload({ topic, baziResult, direction, drawnCards }) {
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
          card_element: card.element,
          card_wuxing: card.wuxing,
          position_wuxing: spreadPos.wuxing,
          wuxing_relation: rel.type
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
        spread_name: "天地人三才·八卦方位阵",
        cards_drawn: cardsDrawnPayload,
        reading_time: new Date().toLocaleString("zh-CN")
      };
    }

    /**
     * 发起流式请求调用
     */
    static async streamReading({ topic, baziResult, direction, drawnCards, onChunk, onDone, onError }) {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        if (onError) onError(new Error("未配置 DeepSeek API Key，请在右上角设置中填入 API Key"));
        return;
      }

      const payloadData = this.buildPayload({ topic, baziResult, direction, drawnCards });
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
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: JSON.stringify(payloadData, null, 2) }
            ],
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
