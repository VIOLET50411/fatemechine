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
    history: [],
    theme: "light" // 'light' | 'dark'
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
    initTheme();
    loadSavedSettings();
    loadHistory();
    populateDateSelectors();
    initEventListeners();
    navigateToStep("landing");
  }

  // 主题控制
  function initTheme() {
    const savedTheme = localStorage.getItem("tianji_theme") || "light";
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    AppState.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tianji_theme", theme);

    const themeSelect = document.getElementById("select-theme-mode");
    if (themeSelect && themeSelect.value !== theme) {
      themeSelect.value = theme;
    }
  }

  // 2. 加载设置与历史
  function loadSavedSettings() {
    const savedDeck = localStorage.getItem("tianji_deck_mode");
    if (savedDeck) AppState.deckMode = savedDeck;

    const keyInput = document.getElementById("input-deepseek-key");
    const endpointInput = document.getElementById("input-deepseek-endpoint");
    const modelInput = document.getElementById("input-deepseek-model");
    const deckSelect = document.getElementById("select-deck-mode");
    const themeSelect = document.getElementById("select-theme-mode");

    if (keyInput) keyInput.value = DeepSeekClient.getApiKey();
    if (endpointInput) endpointInput.value = DeepSeekClient.getEndpoint();
    if (modelInput) modelInput.value = DeepSeekClient.getModel();
    if (deckSelect) deckSelect.value = AppState.deckMode;
    if (themeSelect) themeSelect.value = AppState.theme;
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: -2px;">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span>${AppState.isBaziDetailed ? "切换为通俗说明" : "切换为专业说明"}</span>
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
    allSections.forEach(sec => {
      sec.classList.remove("active-step", "active-section");
    });

    // 显示目标 section
    const targetSection = document.getElementById(`section-${stepName}`);
    if (targetSection) {
      targetSection.classList.add("active-step", "active-section");
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
          <span class="tag-facing">坐向：${res.direction} · ${res.baguaInfo.gua}卦 · 五行属${res.baguaInfo.wuxing}</span>
          <span class="tag-time">${res.timestamp}</span>
        </div>
        <div class="overview-keyphrase">「${res.overview.keyPhrase}」</div>
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
              <span class="fs-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
                </svg>
              </span>
              <span class="fs-label">吉利方位</span>
              <span class="fs-val">${g.focalDirection}</span>
            </div>
            <div class="fs-item">
              <span class="fs-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                  <path d="M2 12h20"></path>
                </svg>
              </span>
              <span class="fs-label">调和色系</span>
              <span class="fs-val">${g.recommendedColor}</span>
            </div>
            <div class="fs-item">
              <span class="fs-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </span>
              <span class="fs-label">适宜器物</span>
              <span class="fs-val">${g.recommendedItems}</span>
            </div>
            <div class="fs-item">
              <span class="fs-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
              </span>
              <span class="fs-label">日常行动</span>
              <span class="fs-val">${g.actionAdvice}</span>
            </div>
          </div>
          <div class="fs-mindset-quote">
            <span>${g.mindsetTip}</span>
          </div>
        </div>
      `;
    }

    // 初始化多轮追问模块上下文
    initChatFollowUpSection();

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
          <div class="prompt-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h3>尚未配置 DeepSeek API Key</h3>
          <p>深度解盘由 DeepSeek 模型提供大模型交叉推演。请在右上角设置中填入你的 DeepSeek API Key 即可开启无限次深度解盘。</p>
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
      statusContainer.innerHTML = `<span class="streaming-spinner"></span> 正在结合八字与塔罗信息分析...`;
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
          statusContainer.innerHTML = `<span>解盘分析完毕</span>`;
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

    // 首页快速起卦传送门
    document.querySelectorAll(".quick-portal-item").forEach(item => {
      item.addEventListener("click", () => {
        const topic = item.dataset.topic;
        if (topic) {
          AppState.topic = topic;
          document.querySelectorAll(".topic-select-card").forEach(c => {
            c.classList.toggle("selected", c.dataset.topic === topic);
          });
          navigateToStep("bazi");
        }
      });
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

    // 八字输入下一步与上一步
    document.getElementById("btn-bazi-next")?.addEventListener("click", () => {
      updateBaziPreview();
      navigateToStep("compass");
    });
    document.getElementById("btn-bazi-back")?.addEventListener("click", () => {
      navigateToStep("topic");
    });

    // 罗盘下一步与上一步
    document.getElementById("btn-compass-next")?.addEventListener("click", () => {
      navigateToStep("shuffle");
      startShuffleAnimation();
    });
    document.getElementById("btn-compass-back")?.addEventListener("click", () => {
      navigateToStep("bazi");
    });

    // 开启三才阵
    document.getElementById("btn-start-spread")?.addEventListener("click", () => {
      if (AppState.drawnCards.length < 3) return;
      navigateToStep("spread");
      renderSpreadAltar();
    });

    // 重新洗牌
    document.getElementById("btn-re-shuffle")?.addEventListener("click", () => {
      AppState.drawnCards = [];
      initFanCards();
    });

    // 结果页 Tab
    document.getElementById("tab-btn-simple")?.addEventListener("click", () => {
      switchResultTab("simple");
    });
    document.getElementById("tab-btn-deepseek")?.addEventListener("click", () => {
      switchResultTab("deepseek");
    });

    // 重新占卜
    document.getElementById("btn-restart-divination")?.addEventListener("click", () => {
      AppState.drawnCards = [];
      AppState.readingResult = null;
      AppState.chatMessages = [];
      navigateToStep("landing");
    });

    // 复制解盘
    document.getElementById("btn-copy-reading")?.addEventListener("click", () => {
      copyReadingSummary();
    });

    // 发送追问
    document.getElementById("btn-chat-send")?.addEventListener("click", () => {
      const input = document.getElementById("chat-input-textarea");
      if (input) handleSendFollowUpQuestion(input.value);
    });

    // 多轮追问：回车发送（Shift+Enter换行）
    document.getElementById("chat-input-textarea")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendFollowUpQuestion(e.target.value);
      }
    });

    // 快捷推荐问题点击
    document.querySelectorAll(".btn-quick-prompt").forEach(btn => {
      btn.addEventListener("click", () => {
        const promptText = btn.dataset.prompt;
        if (promptText) handleSendFollowUpQuestion(promptText);
      });
    });

    // 设置模态框
    DOM.btnOpenSettings?.addEventListener("click", openSettingsModal);
    DOM.btnCloseSettings?.addEventListener("click", closeSettingsModal);
    DOM.btnSaveSettings?.addEventListener("click", saveSettingsModal);

    // 设置中的主题切换
    document.getElementById("select-theme-mode")?.addEventListener("change", (e) => {
      setTheme(e.target.value);
      showToast(e.target.value === "light" ? "已切换至浅色模式" : "已切换至深色模式");
    });

    // 设置中快捷打开历史
    document.getElementById("btn-settings-open-history")?.addEventListener("click", () => {
      closeSettingsModal();
      openHistoryDrawer();
    });

    // 设置中清空历史
    document.getElementById("btn-clear-history-settings")?.addEventListener("click", clearHistory);

    // 历史抽屉
    DOM.btnOpenHistory?.addEventListener("click", openHistoryDrawer);
    DOM.btnCloseHistory?.addEventListener("click", closeHistoryDrawer);
    DOM.btnClearHistory?.addEventListener("click", clearHistory);
  }

  // ==================== 14. 多轮追问解惑交互实现 ====================
  function initChatFollowUpSection() {
    const res = AppState.readingResult;
    if (!res) return;

    // 初始化多轮会话上下文
    const payload = DeepSeekClient.buildPayload({
      topic: AppState.topic,
      baziResult: AppState.baziResult,
      direction: AppState.direction,
      drawnCards: AppState.drawnCards
    });

    AppState.chatMessages = [
      { role: "system", content: DeepSeekClient.getSystemPrompt() },
      { role: "user", content: `这是我刚占卜排出的命盘与卦象数据：\n${JSON.stringify(payload, null, 2)}\n请基于此准备为我解答后续提问。` },
      { role: "assistant", content: `我已经结合你问测的【${res.topicName}】、坐向【${res.direction}】与排盘结果进行分析。随时可以针对具体问题向我提问。` }
    ];

    const welcomeEl = document.getElementById("chat-initial-welcome");
    if (welcomeEl) {
      welcomeEl.innerHTML = `已为你生成问测【<strong>${res.topicName}</strong>】的占卜结果，当前坐向为【<strong>${res.direction}</strong>】。若有没看懂的牌意、想进一步了解的细节或具体建议，请随时提问。`;
    }

    const messagesContainer = document.getElementById("chat-messages-container");
    if (messagesContainer) {
      // 保留第一条欢迎词，清除旧历史追问
      const initialRow = messagesContainer.querySelector(".msg-sage");
      messagesContainer.innerHTML = "";
      if (initialRow) messagesContainer.appendChild(initialRow);
    }
  }

  let isChatResponding = false;
  async function handleSendFollowUpQuestion(text) {
    const question = (text || "").trim();
    if (!question || isChatResponding) return;

    const inputArea = document.getElementById("chat-input-textarea");
    if (inputArea) inputArea.value = "";

    const messagesContainer = document.getElementById("chat-messages-container");
    if (!messagesContainer) return;

    // 1. 添加用户消息气泡
    const userRow = document.createElement("div");
    userRow.className = "chat-message-row msg-user";
    userRow.innerHTML = `
      <div class="msg-avatar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div class="msg-bubble">
        <div class="msg-sender">你</div>
        <div class="msg-text">${escapeHtml(question)}</div>
      </div>
    `;
    messagesContainer.appendChild(userRow);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 2. 添加助手回复占位气泡
    const sageRow = document.createElement("div");
    sageRow.className = "chat-message-row msg-sage";
    sageRow.innerHTML = `
      <div class="msg-avatar">☯</div>
      <div class="msg-bubble">
        <div class="msg-sender">占卜助手</div>
        <div class="msg-text"><span class="streaming-spinner"></span> 正在分析并生成解答...</div>
      </div>
    `;
    messagesContainer.appendChild(sageRow);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    const sageTextEl = sageRow.querySelector(".msg-text");

    isChatResponding = true;

    // 3. 判断是否配置了 DeepSeek API Key
    if (DeepSeekClient.hasKey()) {
      AppState.chatMessages.push({ role: "user", content: question });

      await DeepSeekClient.streamChat({
        messages: AppState.chatMessages,
        onChunk: (chunk, fullText) => {
          if (sageTextEl) {
            sageTextEl.innerHTML = DeepSeekClient.renderMarkdown(fullText);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        },
        onDone: (fullText) => {
          isChatResponding = false;
          AppState.chatMessages.push({ role: "assistant", content: fullText });
          if (sageTextEl) {
            sageTextEl.innerHTML = DeepSeekClient.renderMarkdown(fullText);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        },
        onError: (err) => {
          isChatResponding = false;
          if (sageTextEl) {
            sageTextEl.innerHTML = `<span style="color:var(--cinnabar)">追问连接异常：${err.message}</span>`;
          }
        }
      });
    } else {
      // 本地智能综合合成回答
      setTimeout(() => {
        const localAnswer = generateLocalContextualAnswer(question, AppState.readingResult, AppState.baziResult);
        isChatResponding = false;
        if (sageTextEl) {
          sageTextEl.innerHTML = `
            ${DeepSeekClient.renderMarkdown(localAnswer)}
            <div style="margin-top:0.75rem; padding-top:0.5rem; border-top:1px dashed var(--border-subtle); font-size:0.8rem; color:var(--text-muted);">
              提示：如需开启多轮大模型深度对话解答，可在右上角「设置」中配置 DeepSeek API Key。
            </div>
          `;
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 700);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function generateLocalContextualAnswer(question, res, bazi) {
    if (!res) return "请先完成一次排盘占卜，以便据此解答。";
    const cards = res.cardReadings;
    const dominant = res.radar.dominant;
    const deficient = res.radar.deficient;
    const focalDir = res.fengshuiGuidance.focalDirection;
    const dayMaster = bazi ? bazi.dayMaster.name : "自身命元";

    if (question.includes("隐患") || question.includes("矛盾") || question.includes("化解")) {
      const earthPos = cards[2] || cards[0];
      return `关于隐患与化解方法：\n\n地位隐患位显现为 ${earthPos.cardName} ${earthPos.orientation}，五行属${earthPos.cardWuxing}。\n\n1. 核心症结：指示你在现实层面可能面临 ${earthPos.keywords.slice(0, 2).join("与")} 的阻力。当前五行气场为${dominant}旺${deficient}弱，容易出现思绪波动或推进受阻。\n2. 化解建议：重点在【${focalDir}】进行环境整理，可摆放 ${res.fengshuiGuidance.recommendedItems}，以 ${res.fengshuiGuidance.recommendedColor} 配色调和气场，保持稳健节奏即可化解。`;
    }

    if (question.includes("时间") || question.includes("月份") || question.includes("时机") || question.includes("转机")) {
      return `关于转机出现的时间点：\n\n结合你的日元 ${dayMaster} 与当前坐向 ${res.direction} 分析：\n\n1. 最佳契机：在五行中【${deficient}】能量生旺的时间段转机最为明显，通常在农历【${deficient === '水' ? '冬月或腊月' : deficient === '木' ? '春季二三月' : deficient === '火' ? '夏季四五月' : '季末交替月份'}】前后整体运势更为顺畅。\n2. 行动建议：在转机显现之前，建议按「${res.overview.keyPhrase}」的指引，先做好前期准备，稳步推进。`;
    }

    if (question.includes("行动") || question.includes("做") || question.includes("建议")) {
      return `关于接下来的具体行动：\n\n结合排盘结果，建议从以下两点着手：\n\n1. 明确重心：面对 ${cards[1]?.cardName || '当下'} 所呈现的局势，建议理清优先顺序，明确自己的核心诉求与底线。\n2. 空间借力：${res.fengshuiGuidance.actionAdvice}\n\n保持内外一致，有助于更快打开局面。`;
    }

    return `关于你所问的「${question}」：\n\n结合当前人位抽取的 ${cards[1]?.cardName} ${cards[1]?.orientation} 与天位前景的 ${cards[0]?.cardName}，整体发展正处于关键转变期。结合本命日元 ${dayMaster} 的特点，建议先稳固基础，再顺势推进。`;
  }

  // 14. 复制解盘摘要
  function copyReadingSummary() {
    const res = AppState.readingResult;
    if (!res) return;

    const cardsText = res.cardReadings.map(c => 
      `· ${c.positionName}：${c.cardName} ${c.orientation}，五行属${c.cardWuxing}\n  释义：${c.plainExplanation.oneLiner}`
    ).join("\n\n");

    const text = `【风水与塔罗占卜报告】
问测诉求：${res.topicName}
当前坐向：${res.direction} ${res.baguaInfo.gua}卦
本命日元：${AppState.baziResult ? AppState.baziResult.dayMaster.name : "随缘"}

核心断语：「${res.overview.keyPhrase}」
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
    const theme = document.getElementById("select-theme-mode")?.value || "dark";

    DeepSeekClient.setApiKey(key);
    DeepSeekClient.setEndpoint(endpoint);
    DeepSeekClient.setModel(model);
    AppState.deckMode = deck;
    localStorage.setItem("tianji_deck_mode", deck);

    if (theme !== AppState.theme) {
      setTheme(theme);
    }

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
