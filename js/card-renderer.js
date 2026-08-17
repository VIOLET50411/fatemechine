/**
 * 天机阁 · 牌面与五行雷达图可视化渲染引擎
 * 支持真实国风素材与程序化水墨卡牌无缝渲染
 */

(function(root) {
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

      // 如果有独立高质量图片
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

      // 如果是程序化生成的水墨牌面
      return this.generateProceduralCardHtml(card, isReversed, extraClasses, wuxingColor);
    }

    /**
     * 程序化生成水墨国风牌面
     */
    static generateProceduralCardHtml(card, isReversed, extraClasses, wuxingColor) {
      const reversedClass = isReversed ? "is-reversed" : "";
      const suitIcons = {
        "wands": "🔥",
        "cups": "💧",
        "swords": "⚔️",
        "pentacles": "🪙"
      };

      const suitSymbol = card.suit ? (suitIcons[card.suit] || "☯") : "☯";

      return `
        <div class="card-visual card-art-procedural ${reversedClass} ${extraClasses}" style="--element-glow: ${wuxingColor}">
          <div class="procedural-parchment-bg"></div>
          <div class="procedural-border-frame">
            <div class="frame-corner top-left">☰</div>
            <div class="frame-corner top-right">☷</div>
            <div class="frame-corner bottom-left">☵</div>
            <div class="frame-corner bottom-right">☲</div>
            
            <div class="procedural-header">
              <div class="proc-number">${card.number}</div>
              <div class="proc-gua">${card.baguaGua ? card.baguaGua + "卦" : ""}</div>
            </div>

            <div class="procedural-center-art">
              <div class="ink-splash-circle"></div>
              <div class="ink-center-symbol">${suitSymbol}</div>
              <div class="ink-taiji-watermark">☯</div>
              <div class="ink-wuxing-stamp" style="border-color:${wuxingColor}; color:${wuxingColor};">${card.wuxing}</div>
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
          <div class="card-back-pattern-glow"></div>
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
        { name: "火", color: "var(--wx-fire)", angle: -90 + 72 },    // 右上
        { name: "土", color: "var(--wx-earth)", angle: -90 + 144 },  // 右下
        { name: "金", color: "var(--wx-metal)", angle: -90 + 216 },  // 左下
        { name: "水", color: "var(--wx-water)", angle: -90 + 288 }   // 左上
      ];

      // 计算多边形网格坐标
      const getCoords = (r, angleDeg) => {
        const rad = (angleDeg * Math.PI) / 180;
        return {
          x: center + r * Math.cos(rad),
          y: center + r * Math.sin(rad)
        };
      };

      // 生成背景五角同心网格 (20%, 40%, 60%, 80%, 100%)
      let gridPolygons = "";
      [0.25, 0.5, 0.75, 1.0].forEach(ratio => {
        const pts = elements.map(e => {
          const pt = getCoords(radius * ratio, e.angle);
          return `${pt.x},${pt.y}`;
        }).join(" ");
        gridPolygons += `<polygon points="${pts}" class="radar-grid-polygon" stroke="rgba(212, 175, 55, ${0.15 + ratio * 0.15})" fill="none" stroke-width="1" />`;
      });

      // 生成轴线
      let axisLines = "";
      elements.forEach(e => {
        const pt = getCoords(radius, e.angle);
        axisLines += `<line x1="${center}" y1="${center}" x2="${pt.x}" y2="${pt.y}" stroke="rgba(212, 175, 55, 0.25)" stroke-dasharray="2 2" stroke-width="1" />`;
      });

      // 生成数据多边形
      const dataPoints = elements.map(e => {
        const score = radarScores[e.name] || 50;
        const currentR = radius * (score / 100);
        const pt = getCoords(currentR, e.angle);
        return `${pt.x},${pt.y}`;
      }).join(" ");

      // 标签与顶点圆点
      let labelsAndDots = "";
      elements.forEach(e => {
        const score = radarScores[e.name] || 50;
        const ptDot = getCoords(radius * (score / 100), e.angle);
        const ptLabel = getCoords(radius * 1.22, e.angle);

        labelsAndDots += `
          <circle cx="${ptDot.x}" cy="${ptDot.y}" r="4.5" fill="${e.color}" class="radar-data-dot" stroke="#fff" stroke-width="1.5" />
          <text x="${ptLabel.x}" y="${ptLabel.y}" text-anchor="middle" dominant-baseline="central" class="radar-label" fill="${e.color}">
            ${e.name} ${score}%
          </text>
        `;
      });

      return `
        <svg viewBox="0 0 ${size} ${size}" class="wuxing-radar-svg" width="${size}" height="${size}">
          <defs>
            <radialGradient id="radarAreaGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(212, 175, 55, 0.6)" />
              <stop offset="70%" stop-color="rgba(211, 56, 36, 0.35)" />
              <stop offset="100%" stop-color="rgba(43, 95, 140, 0.2)" />
            </radialGradient>
          </defs>
          ${gridPolygons}
          ${axisLines}
          <polygon points="${dataPoints}" fill="url(#radarAreaGradient)" stroke="var(--gold-bright)" stroke-width="2.5" class="radar-data-polygon" />
          ${labelsAndDots}
          <circle cx="${center}" cy="${center}" r="3" fill="var(--gold-bright)" />
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
