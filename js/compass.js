/**
 * 天机阁 · 八卦罗盘方位感测与交互控制器
 * 支持移动端设备陀螺仪/电子指南针与桌面端拖拽选择
 */

(function(root) {
  class CompassController {
    constructor(containerEl, options = {}) {
      this.container = containerEl;
      this.options = Object.assign({
        onDirectionChange: () => {},
        initialDirection: "南"
      }, options);

      this.currentHeading = 180; // 默认面南
      this.currentDirectionKey = "南";
      this.isSensorActive = false;
      this.isDragging = false;
      this.startAngle = 0;
      this.currentRotation = 0;

      this.initElements();
      this.bindEvents();
      this.setDirection(this.options.initialDirection);
    }

    initElements() {
      this.dialEl = document.getElementById("compass-dial-ring") || this.container.querySelector(".compass-dial");
      this.needleEl = document.getElementById("compass-magnetic-needle") || this.container.querySelector(".compass-needle");
      this.infoGuaEl = document.getElementById("compass-current-gua") || this.container.querySelector(".compass-gua-name");
      this.infoDirEl = document.getElementById("compass-current-dir") || this.container.querySelector(".compass-dir-name");
      this.infoDescEl = document.getElementById("compass-current-desc") || this.container.querySelector(".compass-desc-text");
      this.infoWuxingEl = document.getElementById("compass-current-wuxing") || this.container.querySelector(".compass-wuxing-tag");
      this.sensorBtn = document.getElementById("btn-toggle-gyro") || this.container.querySelector(".btn-enable-sensor");
      this.dirButtons = document.querySelectorAll(".compass-quick-btn");
    }

    bindEvents() {
      // 1. 快速方向按钮
      this.dirButtons.forEach(btn => {
        btn.addEventListener("click", () => {
          const dir = btn.dataset.dir;
          if (dir) {
            this.setDirection(dir);
          }
        });
      });

      // 2. 罗盘拖拽交互（鼠标与触控）
      if (this.dialEl) {
        this.dialEl.addEventListener("mousedown", this.onDragStart.bind(this));
        window.addEventListener("mousemove", this.onDragMove.bind(this));
        window.addEventListener("mouseup", this.onDragEnd.bind(this));

        this.dialEl.addEventListener("touchstart", this.onDragStart.bind(this), { passive: false });
        window.addEventListener("touchmove", this.onDragMove.bind(this), { passive: false });
        window.addEventListener("touchend", this.onDragEnd.bind(this));
      }

      // 3. 陀螺仪传感器按钮
      if (this.sensorBtn) {
        this.sensorBtn.addEventListener("click", () => {
          this.requestDeviceOrientation();
        });
      }
    }

    /**
     * 计算鼠标/手指相对罗盘中心的角度
     */
    getAngleFromEvent(e) {
      if (!this.dialEl) return 0;
      const rect = this.dialEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      let theta = Math.atan2(dy, dx); // 弧度
      let deg = (theta * 180) / Math.PI; // -180 ~ 180
      deg = (deg + 90 + 360) % 360; // 0度为北（正上方）
      return deg;
    }

    onDragStart(e) {
      this.isDragging = true;
      this.startAngle = this.getAngleFromEvent(e);
      if (e.cancelable) e.preventDefault();
    }

    onDragMove(e) {
      if (!this.isDragging) return;
      if (e.cancelable) e.preventDefault();

      const currentAngle = this.getAngleFromEvent(e);
      const diff = currentAngle - this.startAngle;
      this.currentRotation = (this.currentRotation + diff + 360) % 360;
      this.startAngle = currentAngle;

      this.updateDialRotation(this.currentRotation);
      this.detectDirectionFromAngle(this.currentRotation);
    }

    onDragEnd() {
      this.isDragging = false;
    }

    /**
     * 从角度推导八卦方位
     */
    detectDirectionFromAngle(angleDeg) {
      const normalized = (angleDeg % 360 + 360) % 360;
      let dirKey = "北";

      if (normalized >= 337.5 || normalized < 22.5) dirKey = "正北";
      else if (normalized >= 22.5 && normalized < 67.5) dirKey = "东北";
      else if (normalized >= 67.5 && normalized < 112.5) dirKey = "正东";
      else if (normalized >= 112.5 && normalized < 157.5) dirKey = "东南";
      else if (normalized >= 157.5 && normalized < 202.5) dirKey = "正南";
      else if (normalized >= 202.5 && normalized < 247.5) dirKey = "西南";
      else if (normalized >= 247.5 && normalized < 292.5) dirKey = "正西";
      else if (normalized >= 292.5 && normalized < 337.5) dirKey = "西北";

      if (dirKey !== this.currentDirectionKey) {
        this.currentDirectionKey = dirKey;
        this.updateInfoPanel(dirKey);
        this.options.onDirectionChange(dirKey);
      }
    }

    /**
     * 程序直接设置方向
     */
    setDirection(dirKey) {
      const dirAngles = {
        "北": 0, "正北": 0,
        "东北": 45,
        "东": 90, "正东": 90,
        "东南": 135,
        "南": 180, "正南": 180,
        "西南": 225,
        "西": 270, "正西": 270,
        "西北": 315
      };

      const angle = dirAngles[dirKey] !== undefined ? dirAngles[dirKey] : 180;
      this.currentRotation = angle;
      this.currentDirectionKey = dirKey;
      this.updateDialRotation(angle);
      this.updateInfoPanel(dirKey);
      this.options.onDirectionChange(dirKey);
    }

    updateDialRotation(deg) {
      if (this.dialEl) {
        this.dialEl.style.transform = `rotate(${deg}deg)`;
      }
      if (this.needleEl) {
        this.needleEl.style.transform = `rotate(${-deg}deg)`;
      }
    }

    updateInfoPanel(dirKey) {
      // 兼容 "南" 与 "正南"
      const normalizedDir = dirKey.replace("正", "");
      const bagua = FengshuiEngine.getBaguaByDirection(dirKey) || FengshuiEngine.getBaguaByDirection(normalizedDir);
      if (!bagua) return;

      if (this.infoGuaEl) this.infoGuaEl.textContent = `${bagua.gua}卦`;
      if (this.infoDirEl) this.infoDirEl.textContent = `正坐朝向 · ${dirKey} (${Math.round(this.currentRotation)}°)`;
      if (this.infoDescEl) this.infoDescEl.textContent = bagua.desc;
      if (this.infoWuxingEl) {
        this.infoWuxingEl.textContent = `五行属${bagua.wuxing} · ${bagua.colorDesc || '旺气相随'}`;
        this.infoWuxingEl.className = `compass-wuxing-tag wx-${bagua.wuxing}`;
      }

      // 高亮选中的按钮
      this.dirButtons.forEach(btn => {
        const btnDir = btn.dataset.dir;
        if (btnDir === dirKey || btnDir === normalizedDir || btnDir === "正" + dirKey) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    /**
     * 请求设备传感器权限
     */
    async requestDeviceOrientation() {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === "granted") {
            this.startDeviceOrientationListening();
          } else {
            alert("未获得指南针传感器权限，可直接在屏幕上滑动罗盘或点击快捷按钮选择方位。");
          }
        } catch (err) {
          console.warn("DeviceOrientation permission request error:", err);
          this.startDeviceOrientationListening();
        }
      } else if ("ondeviceorientation" in window || "ondeviceorientationabsolute" in window) {
        this.startDeviceOrientationListening();
      } else {
        alert("当前设备或浏览器环境暂不支持自动罗盘，请直接旋转罗盘或点击下方方位按钮选择。");
      }
    }

    startDeviceOrientationListening() {
      this.isSensorActive = true;
      if (this.sensorBtn) {
        this.sensorBtn.innerHTML = `<span class="sensor-indicator-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#34c759; margin-right:6px; vertical-align:middle; box-shadow:0 0 8px rgba(52,199,89,0.7);"></span><span id="gyro-btn-text">指南针感测中 · 实时定向</span>`;
        this.sensorBtn.classList.add("sensor-active");
      }

      const handleOrientation = (e) => {
        let heading = null;
        if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
          // iOS Safari 绝对航向
          heading = e.webkitCompassHeading;
        } else if (e.alpha !== null && e.alpha !== undefined) {
          // Android Chrome 航向
          heading = (360 - e.alpha) % 360;
        }

        if (heading !== null && !isNaN(heading)) {
          this.currentRotation = heading;
          this.updateDialRotation(heading);
          this.detectDirectionFromAngle(heading);
        }
      };

      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
  }

  // 挂载到全局
  if (typeof window !== "undefined") {
    window.CompassController = CompassController;
  }
})(typeof window !== "undefined" ? window : global);
