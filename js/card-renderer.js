/**
 * 天机阁 · 牌面与五行雷达图可视化渲染引擎 (Liquid Glass & Masterpiece Tarot Cards)
 * 支持真实高清素材与全套22大阿卡纳及4大元素小阿卡纳的定制化复古矢量绘图
 */

(function(root) {
  // 经典塔罗大阿卡纳与小阿卡纳专属图腾与副标题定义
  const ARCHETYPE_ICONS = {
    0: { icon: "🎒", symbol: "🧳", aura: "0 · The Fool", subtitle: "自由探索 · 纯真启程" },
    1: { icon: "🪄", symbol: "♾️", aura: "I · The Magician", subtitle: "如其在上 · 如其在下" },
    2: { icon: "🌙", symbol: "🏛️", aura: "II · High Priestess", subtitle: "直觉深邃 · 隐秘真理" },
    3: { icon: "👑", symbol: "🌾", aura: "III · The Empress", subtitle: "丰饶繁衍 · 厚德载物" },
    4: { icon: "♈", symbol: "🏰", aura: "IV · The Emperor", subtitle: "乾纲独断 · 秩序权威" },
    5: { icon: "🗝️", symbol: "🪽", aura: "V · The Hierophant", subtitle: "精神传承 · 明师指路" },
    6: { icon: "🕊️", symbol: "❤️", aura: "VI · The Lovers", subtitle: "灵肉契合 · 神圣契约" },
    7: { icon: "🛡️", symbol: "⚔️", aura: "VII · The Chariot", subtitle: "乘风破浪 · 旗开得胜" },
    8: { icon: "🦁", symbol: "♾️", aura: "VIII · Strength", subtitle: "以柔克刚 · 慈悲定力" },
    9: { icon: "🏮", symbol: "🏔️", aura: "IX · The Hermit", subtitle: "孤灯照夜 · 内求真道" },
    10: { icon: "☸️", symbol: "✨", aura: "X · Wheel of Fortune", subtitle: "时空流转 · 因果循环" },
    11: { icon: "⚖️", symbol: "🗡️", aura: "XI · Justice", subtitle: "法理昭彰 · 业力平衡" },
    12: { icon: "🌟", symbol: "🌳", aura: "XII · The Hanged Man", subtitle: "逆向顿悟 · 灵性觉醒" },
    13: { icon: "🥀", symbol: "🦅", aura: "XIII · Death", subtitle: "旧局断灭 · 涅槃重生" },
    14: { icon: "🕊️", symbol: "🏺", aura: "XIV · Temperance", subtitle: "甘露交融 · 动态平衡" },
    15: { icon: "🐐", symbol: "🔥", aura: "XV · The Devil", subtitle: "物质执念 · 照见阴影" },
    16: { icon: "⚡", symbol: "🏰", aura: "XVI · The Tower", subtitle: "假象崩解 · 惊雷破晓" },
    17: { icon: "⭐", symbol: "🏺", aura: "XVII · The Star", subtitle: "希望如泉 · 抚平创伤" },
    18: { icon: "🐺", symbol: "🌕", aura: "XVIII · The Moon", subtitle: "潜意识涌 · 拨开迷雾" },
    19: { icon: "☀️", symbol: "🌻", aura: "XIX · The Sun", subtitle: "如日中天 · 生命昂扬" },
    20: { icon: "📯", symbol: "🕊️", aura: "XX · Judgement", subtitle: "神圣号角 · 灵魂召选" },
    21: { icon: "🌌", symbol: "🌿", aura: "XXI · The World", subtitle: "环宇通达 · 大千圆满" }
  };

  class CardRenderer {
    /**
     * 渲染单张卡牌正面的 HTML 结构
     */
    static renderCardFrontHtml(card, isReversed = false, extraClasses = "") {
      const reversedClass = isReversed ? "is-reversed" : "";
      const wuxingColorMap = {
        "木": "var(--wx-wood)",
        "火": "var(--wx-fire)",
        "土": "var(--wx-earth)",
        "金": "var(--wx-metal)",
        "水": "var(--wx-water)"
      };

      const wuxingColor = wuxingColorMap[card.wuxing] || "var(--gold-main)";

      // 如果有高质量独立图片
      if (card.image) {
        return `
          <div class="card-visual card-art-image ${reversedClass} ${extraClasses}" style="--element-glow: ${wuxingColor}">
            <img src="${card.image}" alt="${card.nameCn}" class="card-img-element" loading="lazy" />
            <div class="card-aura-glow"></div>
            <div class="card-overlay-badge">
              <span class="badge-wuxing" style="background:${wuxingColor}">${card.wuxing}</span>
              <span class="badge-orientation">${isReversed ? "逆位" : "正位"}</span>
            </div>
            <div class="card-bottom-title">
              <span class="card-num-label">${card.number}</span>
              <span class="card-name-label">${card.nameCn}</span>
            </div>
          </div>
        `;
      }

      // 如果是专属定制的复古矢量卡牌
      return this.generateProceduralCardHtml(card, isReversed, extraClasses, wuxingColor);
    }

    /**
     * 程序化生成精美复古神秘学牌面
     */
    static generateProceduralCardHtml(card, isReversed, extraClasses, wuxingColor) {
      const reversedClass = isReversed ? "is-reversed" : "";
      const suitIcons = {
        "wands": { icon: "🔥", symbol: "🪵", aura: "Wands · 权杖", subtitle: "离火意志 · 开创进取" },
        "cups": { icon: "💧", symbol: "🏆", aura: "Cups · 圣杯", subtitle: "坎水流芳 · 情感交融" },
        "swords": { icon: "⚔️", symbol: "🗡️", aura: "Swords · 宝剑", subtitle: "乾金刚断 · 理智明辨" },
        "pentacles": { icon: "🪙", symbol: "🌱", aura: "Pentacles · 星币", subtitle: "坤土纳宝 · 实体丰盛" }
      };

      const meta = ARCHETYPE_ICONS[card.id] || (card.suit ? suitIcons[card.suit] : { icon: "✦", symbol: "★", aura: card.nameEn, subtitle: card.nameEn });

      return `
        <div class="card-visual card-art-procedural ${reversedClass} ${extraClasses}" style="--element-glow: ${wuxingColor}">
          <div class="procedural-border-frame">
            <div class="frame-corner top-left">✦</div>
            <div class="frame-corner top-right">✦</div>
            <div class="frame-corner bottom-left">✦</div>
            <div class="frame-corner bottom-right">✦</div>
            
            <div class="procedural-header">
              <div class="proc-number">${card.number}</div>
              <div class="proc-gua">${card.element ? card.element + '元素' : (card.wuxing ? '五行属' + card.wuxing : '')}</div>
            </div>

            <div class="procedural-center-art">
              <div class="celestial-ring-outer"></div>
              <div class="celestial-ring-inner"></div>
              <div class="ink-center-symbol">${meta.icon}</div>
              <div class="proc-archetype-text">${meta.aura}</div>
              <div style="font-size: 0.62rem; color: rgba(255,255,255,0.6);">${meta.subtitle}</div>
            </div>

            <div class="procedural-footer">
              <div class="proc-name-cn">${card.nameCn}</div>
              <div class="proc-name-en">${card.nameEn}</div>
            </div>
          </div>

          <div class="card-overlay-badge">
            <span class="badge-wuxing" style="background:${wuxingColor}">${card.wuxing}</span>
            <span class="badge-orientation">${isReversed ? "逆位" : "正位"}</span>
          </div>
          <div class="card-aura-glow"></div>
        </div>
      `;
    }

    /**
     * 渲染牌背 HTML
     */
    static renderCardBackHtml() {
      return `
        <div class="card-visual card-art-back">
          <img src="assets/cards/card_back.jpg" alt="牌背" class="card-img-element" />
          <div class="card-aura-glow"></div>
        </div>
      `;
    }

    /**
     * 渲染3D翻转卡牌容器
     */
    static render3DCardContainer(card, isReversed = false, cardIndex = 0, isFlipped = false) {
      return `
        <div class="tarot-3d-card-wrapper" data-card-id="${card.id}" data-index="${cardIndex}">
          <div class="tarot-3d-card-inner ${isFlipped ? 'flipped' : ''}">
            <div class="tarot-card-face card-face-back">
              ${this.renderCardBackHtml()}
            </div>
            <div class="tarot-card-face card-face-front">
              ${this.renderCardFrontHtml(card, isReversed)}
            </div>
          </div>
        </div>
      `;
    }

    /**
     * 动态绘制五行雷达图（SVG 矢量图形）
     */
    static renderWuxingRadarSvg(radarScores, size = 260) {
      const center = size / 2;
      const radius = size * 0.38;
      const elements = [
        { name: "木", color: "var(--wx-wood)", angle: -90 },         // 上
        { name: "火", color: "var(--wx-fire)", angle: -18 },         // 右上
        { name: "土", color: "var(--wx-earth)", angle: 54 },         // 右下
        { name: "金", color: "var(--wx-metal)", angle: 126 },        // 左下
        { name: "水", color: "var(--wx-water)", angle: 198 }         // 左上
      ];

      // 五边形网格层 (4圈)
      let gridLevelsSvg = "";
      [0.25, 0.5, 0.75, 1.0].forEach(level => {
        const points = elements.map(e => {
          const rad = (e.angle * Math.PI) / 180;
          const x = center + radius * level * Math.cos(rad);
          const y = center + radius * level * Math.sin(rad);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ");

        gridLevelsSvg += `<polygon points="${points}" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />`;
      });

      // 轴线与标签
      let axesAndLabelsSvg = "";
      elements.forEach(e => {
        const rad = (e.angle * Math.PI) / 180;
        const endX = center + radius * Math.cos(rad);
        const endY = center + radius * Math.sin(rad);

        // 标签外扩位置
        const labelX = center + (radius + 20) * Math.cos(rad);
        const labelY = center + (radius + 20) * Math.sin(rad) + 4;

        const val = radarScores[e.name] || 0;

        axesAndLabelsSvg += `
          <line x1="${center}" y1="${center}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="2 2" />
          <text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${e.color}" font-family="sans-serif">
            ${e.name} ${val}
          </text>
        `;
      });

      // 数据多边形
      const maxScore = Math.max(...Object.values(radarScores), 10);
      const dataPoints = elements.map(e => {
        const score = radarScores[e.name] || 0;
        const normalized = Math.max(0.15, score / maxScore);
        const rad = (e.angle * Math.PI) / 180;
        const x = center + radius * normalized * Math.cos(rad);
        const y = center + radius * normalized * Math.sin(rad);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");

      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="wuxing-radar-svg">
          <defs>
            <radialGradient id="radarAreaGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(243, 209, 121, 0.45)" />
              <stop offset="100%" stop-color="rgba(212, 175, 55, 0.1)" />
            </radialGradient>
          </defs>
          ${gridLevelsSvg}
          ${axesAndLabelsSvg}
          <polygon points="${dataPoints}" fill="url(#radarAreaGradient)" stroke="var(--gold-bright)" stroke-width="2" stroke-linejoin="round" />
          ${elements.map(e => {
            const score = radarScores[e.name] || 0;
            const normalized = Math.max(0.15, score / maxScore);
            const rad = (e.angle * Math.PI) / 180;
            const x = center + radius * normalized * Math.cos(rad);
            const y = center + radius * normalized * Math.sin(rad);
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${e.color}" stroke="#fff" stroke-width="1.5" />`;
          }).join("")}
        </svg>
      `;
    }
  }

  // 挂载到全局
  if (typeof window !== "undefined") {
    window.CardRenderer = CardRenderer;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { CardRenderer };
  }
})(typeof window !== "undefined" ? window : global);
