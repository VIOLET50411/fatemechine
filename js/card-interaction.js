/**
 * 天机阁 · 选牌、洗牌动效与三才阵位3D交互控制器
 */

(function(root) {
  class CardInteractionController {
    constructor(fanContainerEl, options = {}) {
      this.container = fanContainerEl;
      this.options = Object.assign({
        deckMode: "major", // 'major'(22) | 'full'(78)
        onSelectionChange: () => {},
        onThreeCardsReady: () => {}
      }, options);

      this.deck = [];
      this.selectedCards = []; // [{ card, isReversed, originalIndex }]
      this.maxSelect = 3;
      this.isShuffling = false;

      this.initDeck();
    }

    /**
     * 初始化牌库
     */
    initDeck(deckMode = null) {
      if (deckMode) this.options.deckMode = deckMode;
      const rawCards = this.options.deckMode === "major" 
        ? getMajorArcanaCards() 
        : getAllCards();

      // 深度拷贝并打乱顺序（Fisher-Yates 洗牌算法）
      this.deck = [...rawCards];
      this.shuffleDeckArray();
      this.selectedCards = [];
    }

    shuffleDeckArray() {
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
    }

    /**
     * 执行全屏沉浸式水墨洗牌动效
     */
    async playShuffleAnimation(stageContainer, onComplete) {
      this.isShuffling = true;
      stageContainer.innerHTML = `
        <div class="shuffle-animation-stage">
          <div class="shuffle-ink-vortex"></div>
          <div class="shuffle-cards-stack">
            <div class="stack-card card-1">${CardRenderer.renderCardBackHtml()}</div>
            <div class="stack-card card-2">${CardRenderer.renderCardBackHtml()}</div>
            <div class="stack-card card-3">${CardRenderer.renderCardBackHtml()}</div>
            <div class="stack-card card-4">${CardRenderer.renderCardBackHtml()}</div>
            <div class="stack-card card-5">${CardRenderer.renderCardBackHtml()}</div>
          </div>
          <div class="shuffle-caption">
            <div class="shuffle-caption-title">天机推演 · 气场融通</div>
            <div class="shuffle-caption-sub">正在调谐五行时空能量，洗炼神思...</div>
          </div>
        </div>
      `;

      // 重新洗牌
      this.shuffleDeckArray();

      // 动画持续2.5秒
      return new Promise(resolve => {
        setTimeout(() => {
          this.isShuffling = false;
          if (onComplete) onComplete();
          resolve();
        }, 2400);
      });
    }

    /**
     * 渲染扇形选牌池
     */
    renderFanPool() {
      this.container.innerHTML = "";
      const total = this.deck.length;
      const isMobile = window.innerWidth <= 768;

      const fanWrapper = document.createElement("div");
      fanWrapper.className = `cards-fan-wrapper ${isMobile ? 'fan-mobile-mode' : 'fan-desktop-mode'}`;

      // 弧度参数
      const spreadAngle = isMobile ? 100 : 130; // 总跨度
      const angleStep = spreadAngle / (total - 1);
      const startAngle = -spreadAngle / 2;

      this.deck.forEach((card, index) => {
        const cardItem = document.createElement("div");
        cardItem.className = "fan-card-item";
        cardItem.dataset.index = index;
        cardItem.dataset.cardId = card.id;

        // 计算扇形旋转与抛物线位移
        const currentAngle = startAngle + index * angleStep;
        // 抛物线拱形高度
        const curveOffset = Math.cos((currentAngle * Math.PI) / 180) * (isMobile ? 15 : 45);
        const zIndex = index + 1;

        if (!isMobile) {
          cardItem.style.transform = `rotate(${currentAngle}deg) translateY(${-curveOffset}px)`;
          cardItem.style.zIndex = zIndex;
        }

        cardItem.innerHTML = `
          <div class="fan-card-inner">
            ${CardRenderer.renderCardBackHtml()}
          </div>
          <div class="fan-card-glow-edge"></div>
        `;

        // 点击选牌
        cardItem.addEventListener("click", () => this.handleCardClick(cardItem, card, index));

        fanWrapper.appendChild(cardItem);
      });

      this.container.appendChild(fanWrapper);
    }

    /**
     * 处理选牌点击
     */
    handleCardClick(cardEl, card, index) {
      if (this.isShuffling) return;

      // 检查是否已被选中
      const existingIdx = this.selectedCards.findIndex(s => s.originalIndex === index);
      if (existingIdx !== -1) {
        // 取消选择
        this.selectedCards.splice(existingIdx, 1);
        cardEl.classList.remove("is-picked");
        this.options.onSelectionChange(this.selectedCards);
        return;
      }

      // 检查是否已满3张
      if (this.selectedCards.length >= this.maxSelect) {
        return;
      }

      // 随机判定正逆位（50%概率）
      const isReversed = Math.random() < 0.5;

      const pickData = {
        card,
        isReversed,
        originalIndex: index,
        positionIndex: this.selectedCards.length
      };

      this.selectedCards.push(pickData);
      cardEl.classList.add("is-picked");

      this.options.onSelectionChange(this.selectedCards);

      if (this.selectedCards.length === this.maxSelect) {
        this.options.onThreeCardsReady(this.selectedCards);
      }
    }

    /**
     * 渲染底部已选牌状态栏
     */
    renderSelectedBar(containerEl) {
      const positionNames = ["天位（离宫·前景）", "人位（中宫·当下）", "地位（坎宫·隐患）"];
      let slotsHtml = "";

      for (let i = 0; i < 3; i++) {
        const item = this.selectedCards[i];
        if (item) {
          slotsHtml += `
            <div class="selected-slot filled" data-slot="${i}">
              <div class="slot-badge">${positionNames[i]}</div>
              <div class="slot-card-preview">
                <span class="slot-card-num">${item.card.number}</span>
                <span class="slot-card-name">${item.card.nameCn}</span>
                <span class="slot-card-ori ${item.isReversed ? 'ori-rev' : 'ori-up'}">${item.isReversed ? '逆' : '正'}</span>
              </div>
            </div>
          `;
        } else {
          slotsHtml += `
            <div class="selected-slot empty" data-slot="${i}">
              <div class="slot-badge">${positionNames[i]}</div>
              <div class="slot-empty-placeholder">待选牌...</div>
            </div>
          `;
        }
      }

      const count = this.selectedCards.length;
      const countText = count === 3 
        ? "三才归位，天机已聚" 
        : `已选 ${count}/3 · ${count === 0 ? '请在上方扇面抽取第1张牌（天位）' : count === 1 ? '请抽取第2张牌（人位）' : '请抽取第3张牌（地位）'}`;

      containerEl.innerHTML = `
        <div class="selected-bar-container">
          <div class="selected-bar-title">
            <span class="selected-count-badge">${countText}</span>
          </div>
          <div class="selected-slots-row">
            ${slotsHtml}
          </div>
        </div>
      `;
    }

    /**
     * 在八卦三才祭坛上依次飞入并3D翻转卡牌
     */
    async executeSpreadReveal(altarContainerEl, onCardFlipped) {
      const positions = FengshuiEngine.getSpreadPositions();
      altarContainerEl.innerHTML = `
        <div class="spread-altar-layout">
          <div class="spread-position-col pos-heaven" data-pos="0">
            <div class="position-header">
              <span class="pos-symbol">☰</span>
              <span class="pos-title">天位 · 离宫</span>
              <span class="pos-aspect">前景与升腾之机</span>
            </div>
            <div class="position-card-slot" id="spread-slot-0"></div>
          </div>
          <div class="spread-position-col pos-human" data-pos="1">
            <div class="position-header">
              <span class="pos-symbol">☯</span>
              <span class="pos-title">人位 · 中宫</span>
              <span class="pos-aspect">当下自处与核心矛盾</span>
            </div>
            <div class="position-card-slot" id="spread-slot-1"></div>
          </div>
          <div class="spread-position-col pos-earth" data-pos="2">
            <div class="position-header">
              <span class="pos-symbol">☷</span>
              <span class="pos-title">地位 · 坎宫</span>
              <span class="pos-aspect">潜在隐患与深层根基</span>
            </div>
            <div class="position-card-slot" id="spread-slot-2"></div>
          </div>
        </div>
      `;

      // 逐张落位与翻转
      for (let i = 0; i < 3; i++) {
        const item = this.selectedCards[i];
        if (!item) continue;

        const slotEl = altarContainerEl.querySelector(`#spread-slot-${i}`);
        slotEl.innerHTML = CardRenderer.render3DCardContainer(item.card, item.isReversed, i, false);

        await new Promise(r => setTimeout(r, 450));

        // 翻转3D卡牌
        const innerEl = slotEl.querySelector(".tarot-3d-card-inner");
        if (innerEl) {
          innerEl.classList.add("flipped");
        }

        // 添加五行脉冲光环
        slotEl.classList.add("revealed", `wx-${item.card.wuxing}`);

        if (onCardFlipped) {
          onCardFlipped(item, i);
        }

        await new Promise(r => setTimeout(r, 650));
      }
    }
  }

  // 挂载到全局
  if (typeof window !== "undefined") {
    window.CardInteractionController = CardInteractionController;
  }
})(typeof window !== "undefined" ? window : global);
