/**
 * 天机阁 · 综合解盘引擎（通俗极速版）
 * 将西方塔罗原型象征与东方风水五行、八字喜忌无缝融合，提供通俗易懂且富有哲理的解盘结果
 */

(function(root) {
  const getFengshuiEngine = () => {
    if (typeof window !== "undefined" && window.FengshuiEngine) return window.FengshuiEngine;
    if (typeof FengshuiEngine !== "undefined") return FengshuiEngine;
    if (typeof require === "function") return require("./fengshui-engine.js").FengshuiEngine;
    return root.FengshuiEngine;
  };

  class ReadingEngine {
    /**
     * 生成完整的综合解盘报告
     * @param {Object} params
     * @param {string} params.topic - 'career' | 'love' | 'wealth' | 'home'
     * @param {Object} params.baziResult - BaziEngine计算结果
     * @param {string} params.direction - 空间朝向，如 '南', '北', '东'
     * @param {Array} params.drawnCards - [{ card, isReversed, positionIndex }]
     */
    static generateReading({ topic, baziResult, direction, drawnCards }) {
      const FengshuiEngine = getFengshuiEngine();

      const topicTitles = {
        career: "事业功名",
        love: "情感姻缘",
        wealth: "财禄丰殖",
        home: "居所宅运"
      };

      const topicName = topicTitles[topic] || "所问之事";
      const baguaInfo = FengshuiEngine.getBaguaByDirection(direction);
      const spreadPositions = FengshuiEngine.getSpreadPositions();
      const radar = FengshuiEngine.calculateWuxingRadar(drawnCards, baziResult, direction);

      // 1. 生成总览一句话
      const overview = this.generateOverview({ topic, drawnCards, radar, baziResult, baguaInfo });

      // 2. 逐牌生成三才阵位详析
      const cardReadings = drawnCards.map((item, idx) => {
        const spreadPos = spreadPositions[idx] || spreadPositions[0];
        const card = item.card;
        const isReversed = item.isReversed;
        const orientationText = isReversed ? "逆位" : "正位";
        const content = isReversed ? card.reversed : card.upright;

        // 五行生克分析
        const relation = FengshuiEngine.analyzeRelation(card.wuxing, spreadPos.wuxing);

        // 结合用户主题的具体解释
        const topicSpecificAdvice = content[topic] || content.general;

        return {
          positionIndex: idx,
          positionName: spreadPos.name,
          positionBagua: spreadPos.bagua,
          positionWuxing: spreadPos.wuxing,
          positionAspect: spreadPos.aspect,
          cardId: card.id,
          cardName: card.nameCn,
          cardNameEn: card.nameEn,
          orientation: orientationText,
          isReversed,
          cardElement: card.element,
          cardWuxing: card.wuxing,
          keywords: content.keywords,
          meaning: content.general,
          topicAdvice: topicSpecificAdvice,
          wuxingRelation: relation,
          plainExplanation: this.generatePlainCardExplanation(card, isReversed, spreadPos, relation, topic, topicSpecificAdvice)
        };
      });

      // 3. 生成风水实操指南
      const fengshuiGuidance = this.generateFengshuiGuidance({ topic, direction, baguaInfo, radar, baziResult, drawnCards });

      return {
        topic,
        topicName,
        direction,
        baguaInfo,
        overview,
        radar,
        cardReadings,
        fengshuiGuidance,
        timestamp: new Date().toLocaleString("zh-CN")
      };
    }

    /**
     * 生成总揽天机概括
     */
    static generateOverview({ topic, drawnCards, radar, baziResult, baguaInfo }) {
      const reversedCount = drawnCards.filter(c => c.isReversed).length;
      let tone = "顺遂通达";
      let keyPhrase = "顺天应时，时来运转";

      if (reversedCount === 0) {
        tone = "气机贯通，万象欣荣";
        keyPhrase = `${radar.dominant}旺得势，一往无前`;
      } else if (reversedCount === 1) {
        tone = "大局平稳，偶有微澜";
        keyPhrase = "藏器待时，稳扎稳打";
      } else if (reversedCount === 2) {
        tone = "阴阳交错，需防暗礁";
        keyPhrase = "克己慎行，以退为进";
      } else {
        tone = "旧局待破，重塑根基";
        keyPhrase = "破茧重生，静待春雷";
      }

      const dayMasterText = baziResult ? `以你命元「${baziResult.dayMaster.name}」与当前所坐「${baguaInfo.desc}」观之：` : "纵观天地人三才时空气场：";
      
      const summaryText = `${dayMasterText}当前局势呈现【${tone}】之象。三才阵中${radar.summary}问测之事，当以通透之心把握关键节奏。`;

      return {
        tone,
        keyPhrase,
        summaryText
      };
    }

    /**
     * 生成单张牌的白话直白解读
     */
    static generatePlainCardExplanation(card, isReversed, spreadPos, relation, topic, topicAdvice) {
      const orientation = isReversed ? "逆位" : "正位";
      const toneMap = {
        "大吉": "能量极其充沛顺遂",
        "吉": "得气场稳固扶持",
        "次吉": "需主动付出，成果显著",
        "平": "需靠自身实力把控局面",
        "需调理": "气场略有阻滞，需防心浮气躁"
      };

      return {
        oneLiner: `${spreadPos.name}（${spreadPos.direction}）现「${card.nameCn}·${orientation}」，五行${relation.type}，${toneMap[relation.nature] || "气场平稳"}。`,
        detail: topicAdvice,
        spatialRelation: `【气场互参】牌性属${card.wuxing}，与阵位${spreadPos.bagua}位${spreadPos.wuxing}形成${relation.type}之势。${relation.text}`
      };
    }

    /**
     * 生成居家与办公环境风水调理指南
     */
    static generateFengshuiGuidance({ topic, direction, baguaInfo, radar, baziResult, drawnCards }) {
      const deficient = radar.deficient;
      const dominant = radar.dominant;

      const remedies = {
        "木": {
          dir: "正东（震位）或东南（巽位）",
          color: "青色、碧绿色或原木色",
          items: "水培富贵竹、阔叶绿植或木质文昌塔",
          action: "早晨多开东向窗户迎纳朝阳生气，工作台左侧（青龙位）保持生机。"
        },
        "火": {
          dir: "正南（离位）",
          color: "朱红色、暖橙色或紫色",
          items: "暖光台灯、香薰蜡烛或红色中国结装饰",
          action: "保持正南方明亮通透，午间多晒太阳，提振自身精气神与名望。"
        },
        "土": {
          dir: "东北（艮位）、西南（坤位）或室内中央",
          color: "黄色、米色、赭石色或咖啡色",
          items: "紫砂茶壶、天然玉石印章、黄水晶或陶瓷摆件",
          action: "保持桌面中央整洁沉稳，多喝温水热茶，稳固行事根基与资产。"
        },
        "金": {
          dir: "正西（兑位）或西北（乾位）",
          color: "纯白色、银色或黄铜烫金色",
          items: "铜葫芦、金属机械钟表、纯铜聚宝盆或金石印章",
          action: "清理办公桌右侧杂物，保持环境条理清晰，签署合同前三思定夺。"
        },
        "水": {
          dir: "正北（坎位）",
          color: "玄黑、深海蓝或墨青色",
          items: "桌面静音流水摆件、黑曜石球或水培常春藤",
          action: "正北方位避免堆放易燃杂物，睡前饮一杯温水，利于静心聚气。"
        }
      };

      const remedy = remedies[deficient] || remedies["水"];

      return {
        deficientElement: deficient,
        dominantElement: dominant,
        focalDirection: remedy.dir,
        recommendedColor: remedy.color,
        recommendedItems: remedy.items,
        actionAdvice: remedy.action,
        mindsetTip: "风水之妙在乎心物相应。空间整洁则心气通达，五行流转则万事顺遂。"
      };
    }
  }

  // 挂载到全局
  if (typeof window !== "undefined") {
    window.ReadingEngine = ReadingEngine;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { ReadingEngine };
  }
})(typeof window !== "undefined" ? window : global);
