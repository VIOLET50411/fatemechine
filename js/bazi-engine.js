/**
 * 天机阁 · 四柱八字排盘与五行喜忌计算引擎
 * 基于天文历法、天干地支五行生克与月令用神推演
 */

(function(root) {
  // 天干
  const HEAVENLY_STEMS = [
    { name: "甲", wuxing: "木", yinyang: "阳" },
    { name: "乙", wuxing: "木", yinyang: "阴" },
    { name: "丙", wuxing: "火", yinyang: "阳" },
    { name: "丁", wuxing: "火", yinyang: "阴" },
    { name: "戊", wuxing: "土", yinyang: "阳" },
    { name: "己", wuxing: "土", yinyang: "阴" },
    { name: "庚", wuxing: "金", yinyang: "阳" },
    { name: "辛", wuxing: "金", yinyang: "阴" },
    { name: "壬", wuxing: "水", yinyang: "阳" },
    { name: "癸", wuxing: "水", yinyang: "阴" }
  ];

  // 地支与藏干
  const EARTHLY_BRANCHES = [
    { name: "子", wuxing: "水", yinyang: "阳", zodiac: "鼠", hidden: ["癸"] },
    { name: "丑", wuxing: "土", yinyang: "阴", zodiac: "牛", hidden: ["己", "癸", "辛"] },
    { name: "寅", wuxing: "木", yinyang: "阳", zodiac: "虎", hidden: ["甲", "丙", "戊"] },
    { name: "卯", wuxing: "木", yinyang: "阴", zodiac: "兔", hidden: ["乙"] },
    { name: "辰", wuxing: "土", yinyang: "阳", zodiac: "龙", hidden: ["戊", "乙", "癸"] },
    { name: "巳", wuxing: "火", yinyang: "阴", zodiac: "蛇", hidden: ["丙", "庚", "戊"] },
    { name: "午", wuxing: "火", yinyang: "阳", zodiac: "马", hidden: ["丁", "己"] },
    { name: "未", wuxing: "土", yinyang: "阴", zodiac: "羊", hidden: ["己", "丁", "乙"] },
    { name: "申", wuxing: "金", yinyang: "阳", zodiac: "猴", hidden: ["庚", "壬", "戊"] },
    { name: "酉", wuxing: "金", yinyang: "阴", zodiac: "鸡", hidden: ["辛"] },
    { name: "戌", wuxing: "土", yinyang: "阳", zodiac: "狗", hidden: ["戊", "辛", "丁"] },
    { name: "亥", wuxing: "水", yinyang: "阴", zodiac: "猪", hidden: ["壬", "甲"] }
  ];

  // 天干五行映射
  const STEM_WUXING = {
    "甲": "木", "乙": "木",
    "丙": "火", "丁": "火",
    "戊": "土", "己": "土",
    "庚": "金", "辛": "金",
    "壬": "水", "癸": "水"
  };

  // 地支五行映射
  const BRANCH_WUXING = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木",
    "辰": "土", "巳": "火", "午": "火", "未": "土",
    "申": "金", "酉": "金", "戌": "土", "亥": "水"
  };

  // 节气近似交节日（公历月对应节气日）
  const SOLAR_TERMS_APPROX = [
    { month: 1, day: 5, term: "小寒" },
    { month: 2, day: 4, term: "立春" },
    { month: 3, day: 5, term: "惊蛰" },
    { month: 4, day: 4, term: "清明" },
    { month: 5, day: 5, term: "立夏" },
    { month: 6, day: 5, term: "芒种" },
    { month: 7, day: 7, term: "小暑" },
    { month: 8, day: 7, term: "立秋" },
    { month: 9, day: 7, term: "白露" },
    { month: 10, day: 8, term: "寒露" },
    { month: 11, day: 7, term: "立冬" },
    { month: 12, day: 7, term: "大雪" }
  ];

  // 时辰映射表（24小时制到地支）
  const HOUR_TO_BRANCH_INDEX = {
    "23": 0, "00": 0, "0": 0,
    "01": 1, "02": 1, "1": 1, "2": 1,
    "03": 2, "04": 2, "3": 2, "4": 2,
    "05": 3, "06": 3, "5": 3, "6": 3,
    "07": 4, "08": 4, "7": 4, "8": 4,
    "09": 5, "10": 5, "9": 5, "10": 5,
    "11": 6, "12": 6, "11": 6, "12": 6,
    "13": 7, "14": 7, "13": 7, "14": 7,
    "15": 8, "16": 8, "15": 8, "16": 8,
    "17": 9, "18": 9, "17": 9, "18": 9,
    "19": 10, "20": 10, "19": 10, "20": 10,
    "21": 11, "22": 11, "21": 11, "22": 11
  };

  /**
   * 八字排盘计算类
   */
  class BaziEngine {
    constructor(year, month, day, hour = null, gender = "男") {
      this.year = parseInt(year, 10);
      this.month = parseInt(month, 10); // 1-12
      this.day = parseInt(day, 10);     // 1-31
      this.hour = hour !== null && hour !== "" && hour !== undefined ? parseInt(hour, 10) : null;
      this.gender = gender;
    }

    /**
     * 计算年柱（以立春为界）
     */
    getYearPillar() {
      let calcYear = this.year;
      // 若在2月4日（立春）之前，归属上一年
      if (this.month < 2 || (this.month === 2 && this.day < 4)) {
        calcYear -= 1;
      }
      const stemIndex = (calcYear - 4) % 10;
      const branchIndex = (calcYear - 4) % 12;
      const stem = HEAVENLY_STEMS[(stemIndex + 10) % 10].name;
      const branch = EARTHLY_BRANCHES[(branchIndex + 12) % 12].name;
      return {
        stem,
        branch,
        name: stem + branch,
        wuxing: STEM_WUXING[stem] + BRANCH_WUXING[branch]
      };
    }

    /**
     * 计算月柱（年上起月五虎遁）
     */
    getMonthPillar(yearStem) {
      // 确定节气月（以节气为准）
      let termIndex = this.month - 1;
      const approxTermDay = SOLAR_TERMS_APPROX[termIndex].day;
      if (this.day < approxTermDay) {
        termIndex = (termIndex - 1 + 12) % 12;
      }

      // 月支：正月建寅(2), 二月建卯(3)... 十二月建丑(1)
      const monthBranchMap = [
        "丑", "寅", "卯", "辰", "巳", "午",
        "未", "申", "酉", "戌", "亥", "子"
      ];
      const branch = monthBranchMap[termIndex];

      // 五虎遁年上起月表
      // 甲己之年丙作首，乙庚之岁戊为头，丙辛必定寻庚起，丁壬壬位顺行流，更有戊癸何方觅，甲寅之上好追求
      const startStemMap = {
        "甲": "丙", "己": "丙",
        "乙": "戊", "庚": "戊",
        "丙": "庚", "辛": "庚",
        "丁": "壬", "壬": "壬",
        "戊": "甲", "癸": "甲"
      };

      const startStem = startStemMap[yearStem] || "甲";
      let startStemIdx = HEAVENLY_STEMS.findIndex(s => s.name === startStem);
      
      // 从寅月开始数偏移
      const branchOrderFromYin = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
      const offset = branchOrderFromYin.indexOf(branch);
      const stem = HEAVENLY_STEMS[(startStemIdx + offset) % 10].name;

      return {
        stem,
        branch,
        name: stem + branch,
        wuxing: STEM_WUXING[stem] + BRANCH_WUXING[branch]
      };
    }

    /**
     * 计算日柱（万年历儒略日准确推算法）
     */
    getDayPillar() {
      // 计算公历纪日积数
      const y = this.year;
      const m = this.month;
      const d = this.day;

      let a = Math.floor((14 - m) / 12);
      let yearCalc = y + 4800 - a;
      let monthCalc = m + 12 * a - 3;
      let jdn = d + Math.floor((153 * monthCalc + 2) / 5) + 365 * yearCalc + Math.floor(yearCalc / 4) - Math.floor(yearCalc / 100) + Math.floor(yearCalc / 400) - 32045;

      // 儒略日与天干地支偏移公式
      const stemIndex = (jdn + 9) % 10;
      const branchIndex = (jdn + 1) % 12;

      const stem = HEAVENLY_STEMS[(stemIndex + 10) % 10].name;
      const branch = EARTHLY_BRANCHES[(branchIndex + 12) % 12].name;

      return {
        stem,
        branch,
        name: stem + branch,
        wuxing: STEM_WUXING[stem] + BRANCH_WUXING[branch]
      };
    }

    /**
     * 计算时柱（日上起时五鼠遁）
     */
    getHourPillar(dayStem) {
      if (this.hour === null || isNaN(this.hour)) {
        return null;
      }

      // 确定时支
      const hStr = String(this.hour).padStart(2, "0");
      const branchIdx = HOUR_TO_BRANCH_INDEX[hStr] !== undefined ? HOUR_TO_BRANCH_INDEX[hStr] : 0;
      const branch = EARTHLY_BRANCHES[branchIdx].name;

      // 日上起时五鼠遁
      // 甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
      const startStemMap = {
        "甲": "甲", "己": "甲",
        "乙": "丙", "庚": "丙",
        "丙": "戊", "辛": "戊",
        "丁": "庚", "壬": "庚",
        "戊": "壬", "癸": "壬"
      };

      const startStem = startStemMap[dayStem] || "甲";
      const startStemIdx = HEAVENLY_STEMS.findIndex(s => s.name === startStem);
      const stem = HEAVENLY_STEMS[(startStemIdx + branchIdx) % 10].name;

      return {
        stem,
        branch,
        name: stem + branch,
        wuxing: STEM_WUXING[stem] + BRANCH_WUXING[branch]
      };
    }

    /**
     * 完整排盘与五行喜忌计算
     */
    calculate() {
      const yearPillar = this.getYearPillar();
      const monthPillar = this.getMonthPillar(yearPillar.stem);
      const dayPillar = this.getDayPillar();
      const hourPillar = this.getHourPillar(dayPillar.stem);

      const dayMaster = dayPillar.stem;
      const dayMasterWuxing = STEM_WUXING[dayMaster];

      // 统计五行分布（含天干与地支主气）
      const wuxingCounts = { "木": 0, "火": 0, "土": 0, "金": 0, "水": 0 };
      const wuxingWeights = { "木": 0, "火": 0, "土": 0, "金": 0, "水": 0 };

      const allStems = [yearPillar.stem, monthPillar.stem, dayPillar.stem];
      const allBranches = [yearPillar.branch, monthPillar.branch, dayPillar.branch];

      if (hourPillar) {
        allStems.push(hourPillar.stem);
        allBranches.push(hourPillar.branch);
      }

      // 天干计数
      allStems.forEach(s => {
        const wx = STEM_WUXING[s];
        wuxingCounts[wx] = (wuxingCounts[wx] || 0) + 1;
        wuxingWeights[wx] = (wuxingWeights[wx] || 0) + 1.2;
      });

      // 地支计数（月令权重翻倍）
      allBranches.forEach((b, idx) => {
        const wx = BRANCH_WUXING[b];
        wuxingCounts[wx] = (wuxingCounts[wx] || 0) + 1;
        // 月令（idx === 1）得令权重加成
        const branchWeight = idx === 1 ? 2.5 : 1.5;
        wuxingWeights[wx] = (wuxingWeights[wx] || 0) + branchWeight;
      });

      // 计算日主强弱（同党：生我者+同我者；异党：克我者+我克者+我生者）
      const generates = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
      const motherOf = { "火": "木", "土": "火", "金": "土", "水": "金", "木": "水" };

      const selfElement = dayMasterWuxing;
      const parentElement = motherOf[selfElement];

      const samePartyScore = (wuxingWeights[selfElement] || 0) + (wuxingWeights[parentElement] || 0);
      const totalScore = Object.values(wuxingWeights).reduce((a, b) => a + b, 0);
      const strengthRatio = samePartyScore / totalScore;

      let strengthStatus = "中和平衡";
      let favorable = [];
      let unfavorable = [];

      if (strengthRatio > 0.52) {
        strengthStatus = "日元身旺";
        // 身旺喜克泄耗（异党）
        const childElement = generates[selfElement];
        const wealthElement = generates[childElement]; // 我克者
        const officerElement = motherOf[parentElement]; // 克我者
        favorable = [childElement, wealthElement, officerElement].filter((v, i, a) => a.indexOf(v) === i);
        unfavorable = [selfElement, parentElement];
      } else if (strengthRatio < 0.38) {
        strengthStatus = "日元身弱";
        // 身弱喜印比生扶（同党）
        favorable = [parentElement, selfElement];
        unfavorable = Object.keys(wuxingCounts).filter(wx => !favorable.includes(wx));
      } else {
        strengthStatus = "五行平和";
        // 缺什么补什么
        const lowestWx = Object.keys(wuxingWeights).sort((a, b) => wuxingWeights[a] - wuxingWeights[b])[0];
        favorable = [lowestWx, parentElement];
        unfavorable = [Object.keys(wuxingWeights).sort((a, b) => wuxingWeights[b] - wuxingWeights[a])[0]];
      }

      // 生成通俗白话解说
      const simpleExplanation = this.generateSimpleExplanation(dayMaster, dayMasterWuxing, strengthStatus, favorable, wuxingCounts);
      // 生成命理专业详解
      const detailedExplanation = this.generateDetailedExplanation(yearPillar, monthPillar, dayPillar, hourPillar, dayMaster, dayMasterWuxing, strengthStatus, favorable, unfavorable);

      return {
        solarDate: `${this.year}年${this.month}月${this.day}日 ${this.hour !== null ? this.hour + "时" : "时辰未知"}`,
        gender: this.gender,
        pillars: {
          year: yearPillar,
          month: monthPillar,
          day: dayPillar,
          hour: hourPillar
        },
        fourPillarsText: `${yearPillar.name}年 ${monthPillar.name}月 ${dayPillar.name}日 ${hourPillar ? hourPillar.name + "时" : "(时辰随缘)"}`,
        dayMaster: {
          stem: dayMaster,
          wuxing: dayMasterWuxing,
          name: dayMaster + dayMasterWuxing
        },
        wuxingCounts,
        wuxingWeights,
        strengthStatus,
        favorable,
        unfavorable,
        simpleExplanation,
        detailedExplanation
      };
    }

    /**
     * 生成通俗白话解读
     */
    generateSimpleExplanation(dayMaster, dayMasterWuxing, strengthStatus, favorable, wuxingCounts) {
      const traitMap = {
        "木": "仁慈正直、富有生机与求知欲，做事有韧劲",
        "火": "热情开朗、注重礼仪与行动力，富有感染力",
        "土": "稳重敦厚、守信可靠与包容心，善于承载",
        "金": "果断刚毅、讲义气与条理性，执行力极强",
        "水": "聪明机敏、善于应变与感知力，灵性极高"
      };

      const favorableAdviceMap = {
        "木": "多亲近大自然、选用绿植与木质家居、多穿青绿色服饰能助旺气场",
        "火": "多接触阳光、明亮暖光、红色/橙色元素能激发你的核心动力",
        "土": "多接触大地、陶瓷茶艺、大地色系能稳固你的内心根基",
        "金": "宜保持环境整洁明亮、佩戴金银金属饰品、白色/金色助你果断决断",
        "水": "多饮水、亲近水景、选用黑色/深蓝色系能滋养你的灵感与财气"
      };

      const favText = favorable.map(f => favorableAdviceMap[f]).slice(0, 2).join("；");

      return `你的本命属性为「${dayMaster}${dayMasterWuxing}」，性格天生具有${traitMap[dayMasterWuxing] || "独特灵气"}。命局整体呈现【${strengthStatus}】之象。日常生活中，${favText}。`;
    }

    /**
     * 生成命理专业详解
     */
    generateDetailedExplanation(yearPillar, monthPillar, dayPillar, hourPillar, dayMaster, dayMasterWuxing, strengthStatus, favorable, unfavorable) {
      return `【四柱统析】年柱${yearPillar.name}（${yearPillar.wuxing}），月柱${monthPillar.name}（${monthPillar.wuxing}），日元${dayMaster}${dayMasterWuxing}坐${dayPillar.branch}，${hourPillar ? "时柱" + hourPillar.name + "（" + hourPillar.wuxing + "）" : "时辰未定以三柱论局"}。
月令${monthPillar.branch}气当令，定命局主基调。日元${dayMaster}属${dayMasterWuxing}，经生克扶抑测算为【${strengthStatus}】。
命局用神取【${favorable.join("、")}】，克泄耗忌神为【${unfavorable.join("、")}】。行事与空间布局宜顺应喜用五行生发之势，化忌为用。`;
    }
  }

  // 挂载到全局
  if (typeof window !== "undefined") {
    window.BaziEngine = BaziEngine;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { BaziEngine };
  }
})(typeof window !== "undefined" ? window : global);
