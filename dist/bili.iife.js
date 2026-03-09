// ==UserScript==
// @name         wiidede-B站工具
// @namespace    wiidede.space
// @version      1.2.1
// @description  bilibili工具：自动宽屏，倍速控制, 快捷键操作
// @author       wiidede
// @license      MIT
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/list/watchlater/*
// @match        https://www.bilibili.com/bangumi/play/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==
(function() {
	//#region src/bili.ts
	// @license      MIT
	function log(...args) {
		console.log("[wiidede-B站工具]: ", ...args);
	}
	function warn(...args) {
		console.warn("[wiidede-B站工具]: ", ...args);
	}
	const MAX_ATTEMPTS = 100;
	const RETRY_DELAY = 100;
	let timeoutId = null;
	const playbackRates = [
		2,
		1.5,
		1.25,
		1,
		.75,
		.5
	];
	let currentRate = GM_getValue("bilibili_playback_rate", 1);
	const shortcutConfigs = [{
		key: "Enter",
		selector: ".bpx-player-ctrl-web",
		description: "网页全屏",
		shiftKey: true
	}, {
		key: "Enter",
		selector: ".bpx-player-ctrl-full",
		description: "全屏"
	}];
	function autoWideScreen(count = 0) {
		const ctrlBtn = document.querySelector(".bpx-player-ctrl-wide");
		const squirtle = document.querySelector(".squirtle-video-widescreen ");
		if (ctrlBtn) {
			ctrlBtn.click();
			log("wide screen: ", ctrlBtn);
		} else if (squirtle) {
			squirtle.click();
			log("wide screen: ", squirtle);
		} else if (count < MAX_ATTEMPTS) setTimeout(autoWideScreen, RETRY_DELAY, count + 1);
		else warn("wide screen: not found button");
	}
	function showRateMessage(message) {
		const oldNotice = document.querySelector(".bpx-player-dm-notice");
		if (oldNotice) oldNotice.remove();
		const notice = document.createElement("div");
		notice.className = "bpx-player-dm-notice";
		notice.textContent = message;
		(document.querySelector(".bpx-player-container") || document.body).appendChild(notice);
		setTimeout(() => {
			if (notice.parentNode) notice.parentNode.removeChild(notice);
		}, 2e3);
	}
	function setCustomPlaybackRate(rate) {
		const videoElement = document.querySelector(".bpx-player-video-wrap video");
		if (videoElement) {
			videoElement.playbackRate = rate;
			currentRate = rate;
			GM_setValue("bilibili_playback_rate", currentRate);
			showRateMessage(`倍速： ${rate}x (自定义)`);
			log(`已设置自定义倍速为 ${rate}x`);
		} else {
			warn("未找到视频元素");
			showRateMessage("无法设置自定义倍速");
		}
	}
	function applySavedPlaybackRate(count = 0) {
		if (currentRate > 2) {
			const videoElement = document.querySelector(".bpx-player-video-wrap video");
			if (videoElement) {
				videoElement.playbackRate = currentRate;
				log(`已恢复自定义倍速为 ${currentRate}x`);
				showRateMessage(`倍速已恢复为 ${currentRate}x (自定义)`);
			} else {
				warn("未找到视频元素，稍后重试");
				if (count < MAX_ATTEMPTS) timeoutId = window.setTimeout(applySavedPlaybackRate, RETRY_DELAY, count + 1);
			}
			return;
		}
		const rateMenu = document.querySelector(".bpx-player-ctrl-playbackrate-menu");
		if (!rateMenu) {
			if (count < MAX_ATTEMPTS) {
				timeoutId = window.setTimeout(applySavedPlaybackRate, RETRY_DELAY, count + 1);
				return;
			}
			warn("未找到倍速菜单");
			return;
		}
		const currentActive = rateMenu.querySelector(".bpx-state-active");
		if (currentActive?.dataset.value) {
			const activeRate = Number.parseFloat(currentActive.dataset.value);
			if (Math.abs(activeRate - currentRate) > .01) {
				log(`当前倍速(${activeRate}x)与保存倍速(${currentRate}x)不一致，正在调整`);
				setPlaybackRate(currentRate);
			} else log(`当前倍速(${activeRate}x)与保存倍速一致，无需调整`);
		} else {
			log("未找到激活的倍速选项，尝试设置");
			setPlaybackRate(currentRate);
		}
	}
	function setPlaybackRate(rate, count = 0) {
		currentRate = playbackRates.find((r) => Math.abs(r - rate) < .01) || 1;
		GM_setValue("bilibili_playback_rate", currentRate);
		const rateMenu = document.querySelector(".bpx-player-ctrl-playbackrate-menu");
		if (rateMenu) {
			const items = rateMenu.querySelectorAll(".bpx-player-ctrl-playbackrate-menu-item");
			let found = false;
			items.forEach((item) => {
				if (!item.dataset.value) {
					warn("未找到倍速选项的data-value属性");
					return;
				}
				const itemRate = Number.parseFloat(item.dataset.value);
				if (Math.abs(itemRate - currentRate) < .01) {
					found = true;
					if (!item.classList.contains("bpx-state-active")) {
						item.click();
						log(`已设置倍速为 ${currentRate}x`);
						showRateMessage(`倍速： ${currentRate}x`);
					}
				}
			});
			if (!found) log(`未找到 ${currentRate}x 的倍速选项`);
		} else {
			log("未找到倍速菜单");
			if (count < MAX_ATTEMPTS) timeoutId = window.setTimeout(setPlaybackRate, RETRY_DELAY, rate, count + 1);
		}
	}
	function increasePlaybackRate() {
		const currentIndex = playbackRates.findIndex((r) => Math.abs(r - currentRate) < .01);
		if (currentIndex > 0) {
			const newRate = playbackRates[currentIndex - 1];
			setPlaybackRate(newRate);
		} else {
			showRateMessage("已经是最大倍速 (2x)");
			log("已经是最大倍速 (2x)");
		}
	}
	function decreasePlaybackRate() {
		const currentIndex = playbackRates.findIndex((r) => Math.abs(r - currentRate) < .01);
		if (currentIndex < playbackRates.length - 1) {
			const newRate = playbackRates[currentIndex + 1];
			setPlaybackRate(newRate);
		} else {
			showRateMessage("已经是最小倍速 (0.5x)");
			log("已经是最小倍速 (0.5x)");
		}
	}
	function clickElementBySelector(selector, description) {
		const element = document.querySelector(selector);
		if (element) {
			element.click();
			showRateMessage(description);
			log(`已点击${description}: ${element}`);
		} else warn(`未找到${description}元素: ${selector}`);
	}
	function handleShortcutClick(event) {
		for (const config of shortcutConfigs) {
			const keyMatch = event.key === config.key || event.key.toLowerCase() === config.key.toLowerCase();
			const ctrlMatch = !!config.ctrlKey === event.ctrlKey;
			const altMatch = !!config.altKey === event.altKey;
			const shiftMatch = !!config.shiftKey === event.shiftKey;
			const metaMatch = !config.ctrlKey && !config.altKey && !config.shiftKey ? !event.metaKey : true;
			if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
				event.preventDefault();
				log(`按下了${config.ctrlKey ? "Ctrl+" : ""}${config.altKey ? "Alt+" : ""}${config.shiftKey ? "Shift+" : ""}${config.key} - ${config.description}`);
				clickElementBySelector(config.selector, config.description);
				return true;
			}
		}
		return false;
	}
	function handleKeyPress(event) {
		const activeElement = document.activeElement;
		if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)) return;
		if (handleShortcutClick(event)) return;
		if (!event.ctrlKey && !event.altKey && !event.metaKey && event.location === 0) switch (event.key.toLowerCase()) {
			case "z":
				log("按下了Z键 - 重置倍速");
				event.preventDefault();
				setPlaybackRate(1);
				break;
			case "x":
				log("按下了X键 - 减小倍速");
				event.preventDefault();
				decreasePlaybackRate();
				break;
			case "c":
				log("按下了C键 - 增加倍速");
				event.preventDefault();
				increasePlaybackRate();
				break;
			case "1":
				log("按下了1键 - 1倍速");
				event.preventDefault();
				setPlaybackRate(1);
				break;
			case "2":
				log("按下了2键 - 2倍速");
				event.preventDefault();
				setPlaybackRate(2);
				break;
			case "3":
				log("按下了3键 - 3倍速");
				event.preventDefault();
				setCustomPlaybackRate(3);
				break;
		}
	}
	GM_addStyle(`
    .bpx-player-dm-notice {
      position: absolute;
      left: 24px;
      top: 24px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 9999;
      pointer-events: none;
      animation: toastFadeIn 0.2s ease-out, toastFadeOut 0.15s ease-in 2.35s forwards;
    }
    @keyframes toastFadeIn {
      from {
        transform: translateY(-4px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    @keyframes toastFadeOut {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(-4px);
        opacity: 0;
      }
    }
  `);
	function cleanup() {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		document.removeEventListener("keydown", handleKeyPress);
		log("事件监听器已清理");
	}
	function init() {
		autoWideScreen();
		document.addEventListener("keydown", handleKeyPress);
		applySavedPlaybackRate();
		log("快捷键监听器已添加 (Z/X/C:倍速, 1/2/3:快速倍速)");
		window.addEventListener("beforeunload", cleanup);
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
	else setTimeout(init);
	//#endregion
})();
