/**
 * 天机阁 · 风水八卦与五行生克推演引擎
 * 贯通西方塔罗牌元素与东方八卦九宫时空方位
 */

(function(root) {
  // 八卦九宫定义
  const BAGUA_DATA = {
    "北": { gua: "坎", wuxing: "水", yinyang: "阳", number: 1, color: "#2B5F8C", desc: "坎水居北，主财源流动、隐密智慧与深层隐患" },
    "南": { gua: "离", wuxing: "火", yinyang: "阴", number: 9, color: "#D33824", desc: "离火居南，主名望威仪、远景光明与心性热情" },
    "东": { gua: "震", wuxing: "木", yinyang: "阳", number: 3, color: "#2E8B57", desc: "震雷居东，主生机动向、春雷萌发与决断行动" },
    "西": { gua: "兑", wuxing: "金", yinyang: "阴", number: 7, color: "#D4AF37", desc: "兑泽居西，主口舌人际、喜悦欢聚与契约决断" },
    "东南": { gua: "巽", wuxing: "木", yinyang: "阴", number: 4, color: "#3CB371", desc: "巽风东南，主文昌名气、灵感流通与顺势而为" },
    "东北": { gua: "艮", wuxing: "土", yinyang: "阳", number: 8, color: "#B8860B", desc: "艮山东北，主安居守成、厚积薄发与止欲修身" },
    "西南": { gua: "坤", wuxing: "土", yinyang: "阴", number: 2, color: "#CD853F", desc: "坤土西南，主田宅承载、包容滋养与家庭和顺" },
    "西北": { gua: "乾", wuxing: "金", yinyang: "阳", number: 6, color: "#E6CA65", desc: "乾天西北，主权威领导、乾纲独断与基业秩序" },
    "中宫": { gua: "中", wuxing: "土", yinyang: "阴阳合", number: 5, color: "#C59B27", desc: "中宫枢纽，主核心自处、太极运转与平衡调和" }
  };

  // 天地人三才阵位定义
  const SPREAD_POSITIONS = [
    {
      index: 0,
      code: "heaven",
      name: "天位",
      bagua: "离",
      direction: "正南",
      wuxing: "火",
      symbol: "☰",
      aspect: "远景前景 · 外在气场 · 事业发展升腾之机",
      quote: "天行健，君子以自强不息"
    },
    {
      index: 1,
      code: "human",
      name: "人位",
      bagua: "中",
      direction: "中宫",
      wuxing: "土",
      symbol: "☯",
      aspect: "当下心念 · 自处之道 · 核心矛盾与行动决断",
      quote: "人法地，地法天，天法道"
    },
    {
      index: 2,
      code: "earth",
      name: "地位",
      bagua: "坎",
      direction: "正北",
      wuxing: "水",
      symbol: "☷",
      aspect: "深层根基 · 潜意识底色 · 隐形阻碍与环境承载",
      quote: "地势坤，君子以厚德载物"
    }
  ];

  // 五行生克规则
  const WUXING_GENERATES = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
  const WUXING_OVERCOMES = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };

  class FengshuiEngine {
    /**
     * 分析卡牌五行与阵位/方位五行的生克制化关系
     */
    static analyzeRelation(cardWuxing, targetWuxing) {
      if (cardWuxing === targetWuxing) {
        return {
          type: "比和",
          nature: "吉",
          weight: 1.15,
          text: `同气相求（${cardWuxing}与${targetWuxing}），气场稳固和谐，同频共振。`
        };
      }
      if (WUXING_GENERATES[cardWuxing] === targetWuxing) {
        return {
          type: "生出",
          nature: "次吉",
          weight: 1.05,
          text: `牌性${cardWuxing}生阵位${targetWuxing}，能量向外流转显化，虽有付出但成果昭著。`
        };
      }
      if (WUXING_GENERATES[targetWuxing] === cardWuxing) {
        return {
          type: "受生",
          nature: "大吉",
          weight: 1.30,
          text: `阵位${targetWuxing}生牌性${cardWuxing}，如鱼得水，得时空天时地利之助，能量倍增。`
        };
      }
      if (WUXING_OVERCOMES[cardWuxing] === targetWuxing) {
        return {
          type: "克出",
          nature: "平",
          weight: 0.95,
          text: `牌性${cardWuxing}克制阵位${targetWuxing}，主掌控与破局，虽需耗费心力但能占据主动。`
        };
      }
      if (WUXING_OVERCOMES[targetWuxing] === cardWuxing) {
        return {
          type: "受克",
          nature: "需调理",
          weight: 0.75,
          text: `牌性${cardWuxing}受阵位${targetWuxing}克制，能量受压抑滞涩，需以通关五行调理化煞。`
        };
      }

      return {
        type: "平合",
        nature: "平",
        weight: 1.0,
        text: `五行交融，气场平稳。`
      };
    }

    /**
     * 计算综合五行雷达能量平衡度 (0~100)
     */
    static calculateWuxingRadar(cards, baziResult, directionKey) {
      const scores = { "木": 20, "火": 20, "土": 20, "金": 20, "水": 20 };

      // 1. 卡牌五行加成（正位+25，逆位+15）
      if (cards && cards.length) {
        cards.forEach((item, idx) => {
          const card = item.card;
          const isReversed = item.isReversed;
          const wx = card.wuxing;
          const boost = isReversed ? 18 : 28;
          scores[wx] = (scores[wx] || 0) + boost;

          // 阵位五行生克调整
          const spreadPos = SPREAD_POSITIONS[idx] || SPREAD_POSITIONS[0];
          const rel = this.analyzeRelation(wx, spreadPos.wuxing);
          scores[spreadPos.wuxing] = (scores[spreadPos.wuxing] || 0) + 12 * rel.weight;
        });
      }

      // 2. 八字喜用神与本命日主加成
      if (baziResult && baziResult.wuxingCounts) {
        Object.keys(baziResult.wuxingCounts).forEach(wx => {
          const count = baziResult.wuxingCounts[wx] || 0;
          scores[wx] += count * 6;
        });
        if (baziResult.favorable) {
          baziResult.favorable.forEach(fav => {
            scores[fav] += 15;
          });
        }
      }

      // 3. 空间方位加成
      if (directionKey && BAGUA_DATA[directionKey]) {
        const dirWx = BAGUA_DATA[directionKey].wuxing;
        scores[dirWx] += 22;
      }

      // 归一化为 0~100 区间，使雷达图美观且有明显波动
      const maxVal = Math.max(...Object.values(scores), 1);
      const normalized = {};
      Object.keys(scores).forEach(k => {
        normalized[k] = Math.round(Math.min(100, Math.max(15, (scores[k] / maxVal) * 95)));
      });

      // 找出最旺与最弱五行
      const sorted = Object.keys(normalized).sort((a, b) => normalized[b] - normalized[a]);
      const dominant = sorted[0];
      const deficient = sorted[sorted.length - 1];

      return {
        scores: normalized,
        dominant,
        dominantScore: normalized[dominant],
        deficient,
        deficientScore: normalized[deficient],
        summary: `当前气场【${dominant}旺${deficient}弱】，${this.getEnergyAdvice(dominant, deficient)}`
      };
    }

    /**
     * 生成五行旺衰调理通俗建议
     */
    static getEnergyAdvice(dominant, deficient) {
      const wuxingColors = {
        "木": "青绿色", "火": "朱红色/暖暖橙色", "土": "大地色/黄色", "金": "白色/金色", "水": "黑色/深蓝色"
      };
      const wuxingItems = {
        "木": "绿植盆栽（如富贵竹、绿萝）或木质雕刻",
        "火": "暖色台灯、香薰蜡烛或红色中国结",
        "土": "紫砂茶具、天然陶瓷或玉石摆件",
        "金": "铜葫芦、金属风铃或金银饰品",
        "水": "流动水景、水培绿植或加湿器"
      };

      return `需注意扶助【${deficient}】之气，宜在日常环境中多采用${wuxingColors[deficient]}元素，并摆放${wuxingItems[deficient]}以促成五行流转。`;
    }

    /**
     * 获取指定方位的八卦信息
     */
    static getBaguaByDirection(dir) {
      return BAGUA_DATA[dir] || BAGUA_DATA["南"];
    }

    /**
     * 获取天地人阵位
     */
    static getSpreadPositions() {
      return SPREAD_POSITIONS;
    }
  }

  // 挂载到全局
  if (typeof window !== "undefined") {
    window.FengshuiEngine = FengshuiEngine;
    window.BAGUA_DATA = BAGUA_DATA;
    window.SPREAD_POSITIONS = SPREAD_POSITIONS;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { FengshuiEngine, BAGUA_DATA, SPREAD_POSITIONS };
  }
})(typeof window !== "undefined" ? window : global);
