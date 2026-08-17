/**
 * 天机阁 · 核心主程序控制器 (App Coordinator)
 * 调度流程生命周期、状态机、UI组件与数据流
 */

document.addEventListener("DOMContentLoaded", () => {
  // 全局应用状态
  const AppState = {
    currentStep: "landing", // 'landing' | 'topic' | 'bazi' | 'compass' | 'shuffle' | 'cards' | 'spread' | 'result'
    topic: "career",
    birthInfo: {
      year: 1995,
      month: 8,
      day: 18,
      hour: "12",
      gender: "男"
    },
    baziResult: null,
    direction: "南",
    deckMode: "major", // 'major' | 'full'
    drawnCards: [],
    readingResult: null,
    activeResultTab: "simple", // 'simple' | 'deepseek'
    isBaziDetailed: false,
    history: []
  };

  // 控制器实例
  let compassController = null;
  let cardController = null;

  // DOM 元素缓存
  const DOM = {
    header: document.querySelector(".app-header"),
    stepsContainer: document.querySelector(".app-stage-container"),
    settingsModal: document.getElementById("settings-modal"),
    historyDrawer: document.getElementById("history-drawer"),
    toast: document.getElementById("app-toast"),
    
    // 各阶段容器
    sectionLanding: document.getElementById("section-landing"),
    sectionTopic: document.getElementById("section-topic"),
    sectionBazi: document.getElementById("section-bazi"),
    sectionCompass: document.getElementById("section-compass"),
    sectionShuffle: document.getElementById("section-shuffle"),
    sectionCards: document.getElementById("section-cards"),
    sectionSpread: document.getElementById("section-spread"),
    sectionResult: document.getElementById("section-result"),

    // 常用按钮
    btnOpenSettings: document.getElementById("btn-open-settings"),
    btnCloseSettings: document.getElementById("btn-close-settings"),
    btnSaveSettings: document.getElementById("btn-save-settings"),
    btnOpenHistory: document.getElementById("btn-open-history"),
    btnCloseHistory: document.getElementById("btn-close-history"),
    btnClearHistory: document.getElementById("btn-clear-history")
  };

  // 1. 初始化
  function initApp() {
    loadSavedSettings();
    loadHistory();
    populateDateSelectors();
    initEventListeners();
    navigateToStep("landing");
  }

  // 2. 加载设置与历史
  function loadSavedSettings() {
    const savedDeck = localStorage.getItem("tianji_deck_mode");
    if (savedDeck) AppState.deckMode = savedDeck;

    const keyInput = document.getElementById("input-deepseek-key");
    const endpointInput = document.getElementById("input-deepseek-endpoint");
    const modelInput = document.getElementById("input-deepseek-model");
    const deckSelect = document.getElementById("select-deck-mode");

    if (keyInput) keyInput.value = DeepSeekClient.getApiKey();
    if (endpointInput) endpointInput.value = DeepSeekClient.getEndpoint();
    if (modelInput) modelInput.value = DeepSeekClient.getModel();
    if (deckSelect) deckSelect.value = AppState.deckMode;
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem("tianji_divination_history");
      if (saved) {
        AppState.history = JSON.parse(saved);
      }
    } catch (e) {
      AppState.history = [];
    }
  }

  function saveToHistory(readingData) {
    const historyItem = {
      id: Date.now(),
      date: new Date().toLocaleString("zh-CN"),
      topic: readingData.topic,
      topicName: readingData.topicName,
      direction: readingData.direction,
      overview: readingData.overview.keyPhrase,
      cards: readingData.cardReadings.map(c => ({
        name: c.cardName,
        orientation: c.orientation,
        wuxing: c.cardWuxing,
        pos: c.positionName
      }))
    };

    AppState.history.unshift(historyItem);
    if (AppState.history.length > 20) AppState.history.pop();
    localStorage.setItem("tianji_divination_history", JSON.stringify(AppState.history));
  }

  // 3. 填充日期选择器
  function populateDateSelectors() {
    const yearSelect = document.getElementById("select-birth-year");
    const monthSelect = document.getElementById("select-birth-month");
    const daySelect = document.getElementById("select-birth-day");

    if (!yearSelect || !monthSelect || !daySelect) return;

    // 年份：1940 ~ 2030
    yearSelect.innerHTML = "";
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1940; y--) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = `${y} 年`;
      if (y === 1996) opt.selected = true;
      yearSelect.appendChild(opt);
    }

    // 月份：1 ~ 12
    monthSelect.innerHTML = "";
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = `${m} 月`;
      if (m === 8) opt.selected = true;
      monthSelect.appendChild(opt);
    }

    // 日期更新函数
    function updateDays() {
      const y = parseInt(yearSelect.value, 10);
      const m = parseInt(monthSelect.value, 10);
      const daysInMonth = new Date(y, m, 0).getDate();
      const currentDayVal = parseInt(daySelect.value, 10) || 18;

      daySelect.innerHTML = "";
      for (let d = 1; d <= daysInMonth; d++) {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = `${d} 日`;
        if (d === Math.min(currentDayVal, daysInMonth)) opt.selected = true;
        daySelect.appendChild(opt);
      }
    }

    yearSelect.addEventListener("change", () => { updateDays(); updateBaziPreview(); });
    monthSelect.addEventListener("change", () => { updateDays(); updateBaziPreview(); });
    daySelect.addEventListener("change", () => { updateBaziPreview(); });

    updateDays();
  }

  // 4. 更新八字实时推演预览
  function updateBaziPreview() {
    const year = document.getElementById("select-birth-year")?.value || 1996;
    const month = document.getElementById("select-birth-month")?.value || 8;
    const day = document.getElementById("select-birth-day")?.value || 18;
    const hour = document.getElementById("select-birth-hour")?.value || "12";
    const gender = document.querySelector("input[name='birth-gender']:checked")?.value || "男";

    AppState.birthInfo = { year, month, day, hour, gender };

    const engine = new BaziEngine(year, month, day, hour, gender);
    AppState.baziResult = engine.calculate();

    const previewContainer = document.getElementById("bazi-result-preview");
    if (!previewContainer) return;

    const res = AppState.baziResult;
    const wuxingColorMap = {
      "木": "var(--wx-wood)", "火": "var(--wx-fire)", "土": "var(--wx-earth)", "金": "var(--wx-metal)", "水": "var(--wx-water)"
    };

    // 五行分布条
    let wuxingBarsHtml = "";
    Object.keys(res.wuxingCounts).forEach(wx => {
      const count = res.wuxingCounts[wx] || 0;
      const pct = Math.min(100, count * 22);
      wuxingBarsHtml += `
        <div class="bazi-wuxing-stat-item">
          <span class="wx-name" style="color:${wuxingColorMap[wx]}">${wx} (${count})</span>
          <div class="wx-progress-track">
            <div class="wx-progress-fill" style="width:${pct}%; background:${wuxingColorMap[wx]}"></div>
          </div>
        </div>
      `;
    });

    previewContainer.innerHTML = `
      <div class="bazi-chart-card">
        <div class="bazi-chart-header">
          <div class="bazi-chart-title">
            <span class="bazi-badge-gold">乾坤八字命盘</span>
            <span class="bazi-pillars-summary">${res.fourPillarsText}</span>
          </div>
          <button type="button" class="btn-toggle-bazi-mode" id="btn-toggle-bazi-mode">
            ${AppState.isBaziDetailed ? "切换为通俗白话" : "切换为专业命理"}
          </button>
        </div>

        <div class="bazi-pillars-grid">
          <div class="pillar-col">
            <span class="p-tag">年柱 (祖上)</span>
            <span class="p-val stem">${res.pillars.year.stem}</span>
            <span class="p-val branch">${res.pillars.year.branch}</span>
            <span class="p-wuxing">${res.pillars.year.wuxing}</span>
          </div>
          <div class="pillar-col">
            <span class="p-tag">月柱 (提纲)</span>
            <span class="p-val stem">${res.pillars.month.stem}</span>
            <span class="p-val branch">${res.pillars.month.branch}</span>
            <span class="p-wuxing">${res.pillars.month.wuxing}</span>
          </div>
          <div class="pillar-col active-master">
            <span class="p-tag">日柱 (日主·本命)</span>
            <span class="p-val stem master-stem">${res.pillars.day.stem}</span>
            <span class="p-val branch">${res.pillars.day.branch}</span>
            <span class="p-wuxing">${res.pillars.day.wuxing}</span>
          </div>
          <div class="pillar-col">
            <span class="p-tag">时柱 (归宿)</span>
            <span class="p-val stem">${res.pillars.hour ? res.pillars.hour.stem : "时"}</span>
            <span class="p-val branch">${res.pillars.hour ? res.pillars.hour.branch : "辰"}</span>
            <span class="p-wuxing">${res.pillars.hour ? res.pillars.hour.wuxing : "随缘"}</span>
          </div>
        </div>

        <div class="bazi-wuxing-summary-row">
          <div class="bazi-master-info">
            <span>本命日元：<strong style="color:var(--gold-bright)">${res.dayMaster.name}</strong></span>
            <span>命局状态：<strong class="status-badge">${res.strengthStatus}</strong></span>
            <span>喜用五行：<strong style="color:var(--wx-wood)">${res.favorable.join("、")}</strong></span>
          </div>
          <div class="bazi-wuxing-bars">
            ${wuxingBarsHtml}
          </div>
        </div>

        <div class="bazi-explanation-box">
          <p class="bazi-exp-text">
            ${AppState.isBaziDetailed ? res.detailedExplanation : res.simpleExplanation}
          </p>
        </div>
      </div>
    `;

    // 绑定切换按钮
    const toggleBtn = previewContainer.querySelector("#btn-toggle-bazi-mode");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        AppState.isBaziDetailed = !AppState.isBaziDetailed;
        updateBaziPreview();
      });
    }
  }

  // 5. 步骤路由导航
  function navigateToStep(stepName) {
    AppState.currentStep = stepName;

    // 隐藏所有 section
    const allSections = document.querySelectorAll(".app-step-section");
    allSections.forEach(sec => sec.classList.remove("active-section"));

    // 显示目标 section
    const targetSection = document.getElementById(`section-${stepName}`);
    if (targetSection) {
      targetSection.classList.add("active-section");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // 步骤激活钩子
    if (stepName === "bazi") {
      updateBaziPreview();
    } else if (stepName === "compass") {
      initCompassSection();
    } else if (stepName === "shuffle") {
      runShuffleFlow();
    } else if (stepName === "cards") {
      initCardsSection();
    } else if (stepName === "spread") {
      runSpreadFlow();
    } else if (stepName === "result") {
      renderResultSection();
    }
  }

  // 6. 罗盘页面初始化
  function initCompassSection() {
    const compassBox = document.getElementById("compass-interactive-box");
    if (compassBox && !compassController) {
      compassController = new CompassController(compassBox, {
        initialDirection: AppState.direction,
        onDirectionChange: (newDir) => {
          AppState.direction = newDir;
        }
      });
    } else if (compassController) {
      compassController.setDirection(AppState.direction);
    }
  }

  // 7. 洗牌流程过渡
  async function runShuffleFlow() {
    const shuffleContainer = document.getElementById("shuffle-animation-container");
    if (!cardController) {
      const fanBox = document.getElementById("cards-fan-container");
      cardController = new CardInteractionController(fanBox, {
        deckMode: AppState.deckMode,
        onSelectionChange: handleCardSelectionChange,
        onThreeCardsReady: handleThreeCardsReady
      });
    }

    await cardController.playShuffleAnimation(shuffleContainer, () => {
      navigateToStep("cards");
    });
  }

  // 8. 选牌页面初始化
  function initCardsSection() {
    if (!cardController) {
      const fanBox = document.getElementById("cards-fan-container");
      cardController = new CardInteractionController(fanBox, {
        deckMode: AppState.deckMode,
        onSelectionChange: handleCardSelectionChange,
        onThreeCardsReady: handleThreeCardsReady
      });
    }
    cardController.initDeck(AppState.deckMode);
    cardController.renderFanPool();
    
    const selectedBar = document.getElementById("cards-selected-bar");
    if (selectedBar) {
      cardController.renderSelectedBar(selectedBar);
    }

    const btnStartSpread = document.getElementById("btn-start-spread");
    if (btnStartSpread) {
      btnStartSpread.disabled = true;
    }
  }

  function handleCardSelectionChange(selectedCards) {
    AppState.drawnCards = selectedCards;
    const selectedBar = document.getElementById("cards-selected-bar");
    if (selectedBar && cardController) {
      cardController.renderSelectedBar(selectedBar);
    }

    const btnStartSpread = document.getElementById("btn-start-spread");
    if (btnStartSpread) {
      btnStartSpread.disabled = selectedCards.length < 3;
    }
  }

  function handleThreeCardsReady(selectedCards) {
    showToast("三才卦位已选满，请点击「开启三才神煞阵」解盘！");
    const btnStartSpread = document.getElementById("btn-start-spread");
    if (btnStartSpread) {
      btnStartSpread.disabled = false;
      btnStartSpread.classList.add("btn-pulse");
    }
  }

  // 9. 阵位落牌与3D翻牌流程
  async function runSpreadFlow() {
    const altarBox = document.getElementById("spread-altar-container");
    if (!altarBox || !cardController) return;

    await cardController.executeSpreadReveal(altarBox, (item, index) => {
      const posName = ["天位（前景）", "人位（当下）", "地位（隐患）"][index];
      showToast(`${posName} 显象：「${item.card.nameCn}·${item.isReversed ? '逆位' : '正位'}」`);
    });

    // 翻牌完成后停留1.2秒，自动生成解盘数据并进入结果页
    setTimeout(() => {
      AppState.readingResult = ReadingEngine.generateReading({
        topic: AppState.topic,
        baziResult: AppState.baziResult,
        direction: AppState.direction,
        drawnCards: AppState.drawnCards
      });
      saveToHistory(AppState.readingResult);
      navigateToStep("result");
    }, 1200);
  }

  // 10. 渲染结果页
  function renderResultSection() {
    const res = AppState.readingResult;
    if (!res) return;

    // 渲染顶部总览
    const overviewEl = document.getElementById("result-overview-box");
    if (overviewEl) {
      overviewEl.innerHTML = `
        <div class="overview-header-tag">
          <span class="tag-topic">问事：${res.topicName}</span>
          <span class="tag-facing">坐向：${res.direction}（${res.baguaInfo.gua}卦·五行${res.baguaInfo.wuxing}）</span>
          <span class="tag-time">${res.timestamp}</span>
        </div>
        <div class="overview-keyphrase">「 ${res.overview.keyPhrase} 」</div>
        <div class="overview-summary-text">${res.overview.summaryText}</div>
      `;
    }

    // 渲染五行能量雷达图
    const radarContainer = document.getElementById("result-radar-box");
    if (radarContainer) {
      radarContainer.innerHTML = `
        <div class="radar-card-inner">
          <div class="radar-title-row">
            <h3 class="box-title">五行时空气场雷达</h3>
            <span class="radar-balance-badge">主导：${res.radar.dominant}旺 / 需扶：${res.radar.deficient}弱</span>
          </div>
          <div class="radar-svg-wrapper">
            ${CardRenderer.renderWuxingRadarSvg(res.radar.scores, 280)}
          </div>
          <div class="radar-desc-caption">${res.radar.summary}</div>
        </div>
      `;
    }

    // 渲染三才逐牌白话详解
    const cardsGrid = document.getElementById("result-cards-grid");
    if (cardsGrid) {
      cardsGrid.innerHTML = res.cardReadings.map(c => `
        <div class="result-card-detail-card wx-border-${c.cardWuxing}">
          <div class="card-detail-header">
            <span class="pos-badge">${c.positionName} · ${c.positionBagua}宫</span>
            <span class="pos-aspect-sub">${c.positionAspect}</span>
          </div>
          <div class="card-detail-body">
            <div class="card-mini-thumb">
              ${CardRenderer.renderCardFrontHtml(getCardById(c.cardId), c.isReversed, "thumb-mode")}
            </div>
            <div class="card-detail-content">
              <div class="card-name-row">
                <span class="c-name">${c.cardName}</span>
                <span class="c-ori ${c.isReversed ? 'rev' : 'up'}">${c.orientation}</span>
                <span class="c-wuxing wx-${c.cardWuxing}">五行${c.cardWuxing}</span>
              </div>
              <div class="c-keywords">象意：${c.keywords.join(" · ")}</div>
              <div class="c-meaning-text"><strong>【通俗事态】</strong>${c.topicAdvice}</div>
              <div class="c-spatial-text">${c.plainExplanation.spatialRelation}</div>
            </div>
          </div>
        </div>
      `).join("");
    }

    // 渲染居家/办公风水调理指南
    const fengshuiBox = document.getElementById("result-fengshui-box");
    if (fengshuiBox) {
      const g = res.fengshuiGuidance;
      fengshuiBox.innerHTML = `
        <div class="fengshui-card-inner">
          <div class="fengshui-header">
            <h3 class="box-title">境物相调 · 风水化解与环境调理</h3>
            <span class="fengshui-badge">核心调理方位：${g.focalDirection}</span>
          </div>
          <div class="fengshui-grid-items">
            <div class="fs-item">
              <span class="fs-icon">🧭</span>
              <span class="fs-label">吉利方位</span>
              <span class="fs-val">${g.focalDirection}</span>
            </div>
            <div class="fs-item">
              <span class="fs-icon">🎨</span>
              <span class="fs-label">调和色系</span>
              <span class="fs-val">${g.recommendedColor}</span>
            </div>
            <div class="fs-item">
              <span class="fs-icon">🪴</span>
              <span class="fs-label">适宜器物</span>
              <span class="fs-val">${g.recommendedItems}</span>
            </div>
            <div class="fs-item">
              <span class="fs-icon">✨</span>
              <span class="fs-label">日常行动</span>
              <span class="fs-val">${g.actionAdvice}</span>
            </div>
          </div>
          <div class="fs-mindset-quote">
            <span>📿 ${g.mindsetTip}</span>
          </div>
        </div>
      `;
    }

    // 切换到通俗解读 Tab
    switchResultTab("simple");
  }

  // 11. 结果页 Tab 切换与 DeepSeek 深度解盘触发
  function switchResultTab(tabName) {
    AppState.activeResultTab = tabName;
    const btnSimple = document.getElementById("tab-btn-simple");
    const btnDeepseek = document.getElementById("tab-btn-deepseek");
    const panelSimple = document.getElementById("tab-panel-simple");
    const panelDeepseek = document.getElementById("tab-panel-deepseek");

    if (tabName === "simple") {
      if (btnSimple) btnSimple.classList.add("active");
      if (btnDeepseek) btnDeepseek.classList.remove("active");
      if (panelSimple) panelSimple.classList.add("active");
      if (panelDeepseek) panelDeepseek.classList.remove("active");
    } else {
      if (btnSimple) btnSimple.classList.remove("active");
      if (btnDeepseek) btnDeepseek.classList.add("active");
      if (panelSimple) panelSimple.classList.remove("active");
      if (panelDeepseek) panelDeepseek.classList.add("active");

      // 触发 DeepSeek 流式解盘
      startDeepSeekStreamFlow();
    }
  }

  // 12. DeepSeek 流式解盘流程
  let isDeepSeekStreaming = false;
  async function startDeepSeekStreamFlow() {
    const streamContainer = document.getElementById("deepseek-stream-output");
    const statusContainer = document.getElementById("deepseek-stream-status");
    if (!streamContainer) return;

    if (!DeepSeekClient.hasKey()) {
      streamContainer.innerHTML = `
        <div class="deepseek-no-key-prompt">
          <div class="prompt-icon">🔮</div>
          <h3>尚未配置 DeepSeek API Key</h3>
          <p>深度通义解盘由 DeepSeek 模型提供大模型交叉推演。请在右上角设置中填入你的 DeepSeek API Key 即可开启无限次深度解盘。</p>
          <button type="button" class="btn-primary" id="btn-prompt-open-settings">立即配置 API Key</button>
        </div>
      `;
      document.getElementById("btn-prompt-open-settings")?.addEventListener("click", () => {
        openSettingsModal();
      });
      return;
    }

    if (isDeepSeekStreaming) return;
    isDeepSeekStreaming = true;

    if (statusContainer) {
      statusContainer.innerHTML = `<span class="streaming-spinner"></span> 导师正在凝神推演东西方气场象意...`;
      statusContainer.style.display = "flex";
    }

    streamContainer.innerHTML = `<div class="deepseek-stream-content markdown-body"></div>`;
    const contentEl = streamContainer.querySelector(".deepseek-stream-content");

    await DeepSeekClient.streamReading({
      topic: AppState.topic,
      baziResult: AppState.baziResult,
      direction: AppState.direction,
      drawnCards: AppState.drawnCards,
      onChunk: (chunk, fullText) => {
        if (contentEl) {
          contentEl.innerHTML = DeepSeekClient.renderMarkdown(fullText);
        }
      },
      onDone: (fullText) => {
        isDeepSeekStreaming = false;
        if (statusContainer) {
          statusContainer.innerHTML = `<span>✨</span> 天机推演完毕`;
          setTimeout(() => { statusContainer.style.display = "none"; }, 2500);
        }
      },
      onError: (err) => {
        isDeepSeekStreaming = false;
        if (statusContainer) statusContainer.style.display = "none";
        contentEl.innerHTML = `
          <div class="deepseek-error-alert">
            <h4>解盘连接异常</h4>
            <p>${err.message}</p>
            <p class="sub-hint">已自动为你保留上方「通俗极速解读」作为参考。</p>
          </div>
        `;
      }
    });
  }

  // 13. 事件监听器绑定
  function initEventListeners() {
    // 首页开始按钮
    document.getElementById("btn-hero-start")?.addEventListener("click", () => {
      navigateToStep("topic");
    });

    // 主题选择卡片
    const topicCards = document.querySelectorAll(".topic-select-card");
    topicCards.forEach(card => {
      card.addEventListener("click", () => {
        topicCards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        AppState.topic = card.dataset.topic;
        setTimeout(() => {
          navigateToStep("bazi");
        }, 250);
      });
    });

    // 八字确定并下一步
    document.getElementById("btn-bazi-next")?.addEventListener("click", () => {
      navigateToStep("compass");
    });

    // 八字返回上一步
    document.getElementById("btn-bazi-back")?.addEventListener("click", () => {
      navigateToStep("topic");
    });

    // 罗盘确定并进入洗牌
    document.getElementById("btn-compass-next")?.addEventListener("click", () => {
      navigateToStep("shuffle");
    });

    // 罗盘返回上一步
    document.getElementById("btn-compass-back")?.addEventListener("click", () => {
      navigateToStep("bazi");
    });

    // 选牌开始解盘
    document.getElementById("btn-start-spread")?.addEventListener("click", () => {
      if (AppState.drawnCards.length === 3) {
        navigateToStep("spread");
      }
    });

    // 选牌重新洗牌
    document.getElementById("btn-re-shuffle")?.addEventListener("click", () => {
      navigateToStep("shuffle");
    });

    // 结果页 Tab 切换
    document.getElementById("tab-btn-simple")?.addEventListener("click", () => {
      switchResultTab("simple");
    });
    document.getElementById("tab-btn-deepseek")?.addEventListener("click", () => {
      switchResultTab("deepseek");
    });

    // 重新占卜
    document.getElementById("btn-restart-divination")?.addEventListener("click", () => {
      AppState.drawnCards = [];
      navigateToStep("topic");
    });

    // 复制解盘摘要
    document.getElementById("btn-copy-reading")?.addEventListener("click", () => {
      copyReadingSummary();
    });

    // 设置模态框
    DOM.btnOpenSettings?.addEventListener("click", openSettingsModal);
    DOM.btnCloseSettings?.addEventListener("click", closeSettingsModal);
    DOM.btnSaveSettings?.addEventListener("click", saveSettingsModal);

    // 历史抽屉
    DOM.btnOpenHistory?.addEventListener("click", openHistoryDrawer);
    DOM.btnCloseHistory?.addEventListener("click", closeHistoryDrawer);
    DOM.btnClearHistory?.addEventListener("click", clearHistory);
  }

  // 14. 复制解盘摘要
  function copyReadingSummary() {
    const res = AppState.readingResult;
    if (!res) return;

    const cardsText = res.cardReadings.map(c => 
      `· ${c.positionName}：${c.cardName}（${c.orientation}，五行${c.cardWuxing}）\n  释义：${c.plainExplanation.oneLiner}`
    ).join("\n\n");

    const text = `【天机阁 · 风水塔罗解盘报告】
问测诉求：${res.topicName}
时空坐向：${res.direction}（${res.baguaInfo.gua}卦）
本命日元：${AppState.baziResult ? AppState.baziResult.dayMaster.name : "随缘"}

总揽天机：「${res.overview.keyPhrase}」
${res.overview.summaryText}

三才卦象：
${cardsText}

风水调理指南：
方位：${res.fengshuiGuidance.focalDirection}
色彩：${res.fengshuiGuidance.recommendedColor}
适宜物件：${res.fengshuiGuidance.recommendedItems}
建议：${res.fengshuiGuidance.actionAdvice}

— 占断时间：${res.timestamp} —`;

    navigator.clipboard.writeText(text).then(() => {
      showToast("解盘摘要已复制到剪贴板，可粘贴分享！");
    }).catch(() => {
      showToast("复制成功！");
    });
  }

  // 15. 设置与历史交互
  function openSettingsModal() {
    DOM.settingsModal?.classList.add("modal-open");
    loadSavedSettings();
  }

  function closeSettingsModal() {
    DOM.settingsModal?.classList.remove("modal-open");
  }

  function saveSettingsModal() {
    const key = document.getElementById("input-deepseek-key")?.value || "";
    const endpoint = document.getElementById("input-deepseek-endpoint")?.value || "";
    const model = document.getElementById("input-deepseek-model")?.value || "";
    const deck = document.getElementById("select-deck-mode")?.value || "major";

    DeepSeekClient.setApiKey(key);
    DeepSeekClient.setEndpoint(endpoint);
    DeepSeekClient.setModel(model);
    AppState.deckMode = deck;
    localStorage.setItem("tianji_deck_mode", deck);

    closeSettingsModal();
    showToast("设置已保存！");
  }

  function openHistoryDrawer() {
    renderHistoryList();
    DOM.historyDrawer?.classList.add("drawer-open");
  }

  function closeHistoryDrawer() {
    DOM.historyDrawer?.classList.remove("drawer-open");
  }

  function clearHistory() {
    if (confirm("确定要清空所有占卜历史记录吗？")) {
      AppState.history = [];
      localStorage.removeItem("tianji_divination_history");
      renderHistoryList();
      showToast("历史记录已清空");
    }
  }

  function renderHistoryList() {
    const listEl = document.getElementById("history-items-list");
    if (!listEl) return;

    if (AppState.history.length === 0) {
      listEl.innerHTML = `<div class="history-empty">暂无占卜记录，推演一次即可自动保存。</div>`;
      return;
    }

    listEl.innerHTML = AppState.history.map(item => `
      <div class="history-card-item">
        <div class="history-meta">
          <span class="h-topic">${item.topicName || item.topic}</span>
          <span class="h-time">${item.date}</span>
        </div>
        <div class="h-phrase">「${item.overview}」</div>
        <div class="h-cards-row">
          ${item.cards.map(c => `
            <span class="h-card-tag">${c.pos.slice(0, 2)}: ${c.name}(${c.orientation})</span>
          `).join(" ")}
        </div>
      </div>
    `).join("");
  }

  // 16. Toast 提示
  let toastTimer = null;
  function showToast(message) {
    if (!DOM.toast) return;
    DOM.toast.textContent = message;
    DOM.toast.classList.add("toast-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      DOM.toast.classList.remove("toast-show");
    }, 3200);
  }

  // 启动
  initApp();
});
