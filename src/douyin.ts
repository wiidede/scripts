// ==UserScript==
// @name         wiidede-抖音工具
// @namespace    wiidede.space
// @version      1.0.0
// @description  抖音工具：倍速控制, 快捷键操作
// @author       wiidede
// @license      MIT
// @match        https://www.douyin.com/*
// @icon         https://www.douyin.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

function log(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log('[wiidede-抖音工具]: ', ...args)
}

function warn(...args: unknown[]): void {
  console.warn('[wiidede-抖音工具]: ', ...args)
}

// 配置参数
const DY_MAX_ATTEMPTS = 100
const DY_RETRY_DELAY = 100
let dyTimeoutId: number | null = null

// 抖音倍速选项：0.75x 1.0x 1.25x 1.5x 1.75x 2.0x 3.0x
const dyPlaybackRates: number[] = [3, 2, 1.75, 1.5, 1.25, 1, 0.75]
let dyCurrentRate: number = GM_getValue<number>('douyin_playback_rate', 1)

// 获取倍速菜单
function getRateMenu(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.xgplayer-playratio-wrap')
}

// 显示倍速消息
function showRateMessage(message: string): void {
  const oldNotice = document.querySelector<HTMLElement>('.douyin-rate-notice')
  if (oldNotice)
    oldNotice.remove()

  const notice = document.createElement('div')
  notice.className = 'douyin-rate-notice'
  notice.textContent = message

  document.body.appendChild(notice)

  setTimeout(() => {
    if (notice.parentNode) {
      notice.parentNode.removeChild(notice)
    }
  }, 2000)
}

// 设置倍速（优先点击页面元素）
function setPlaybackRate(rate: number, count = 0): void {
  const supportedRate = dyPlaybackRates.find(r => Math.abs(r - rate) < 0.01) || 1
  dyCurrentRate = supportedRate
  GM_setValue<number>('douyin_playback_rate', dyCurrentRate)

  const rateMenu = getRateMenu()
  if (rateMenu) {
    const items = rateMenu.querySelectorAll<HTMLElement>('.xgplayer-playratio-item')
    let found = false

    items.forEach((item) => {
      if (found)
        return
      const dataId = item.getAttribute('data-id')
      if (!dataId) {
        warn('未找到倍速选项的data-id属性')
        return
      }
      const itemRate = Number.parseFloat(dataId)
      if (Math.abs(itemRate - dyCurrentRate) < 0.01) {
        found = true
        item.click()
        log(`已设置倍速为 ${dyCurrentRate}x`)
        showRateMessage(`倍速： ${dyCurrentRate}x`)
      }
    })

    if (!found) {
      log(`未找到 ${dyCurrentRate}x 的倍速选项，尝试直接设置video`)
      // 如果找不到对应选项，直接设置video倍速
      const video = document.querySelector<HTMLVideoElement>('video')
      if (video) {
        video.playbackRate = dyCurrentRate
        showRateMessage(`倍速： ${dyCurrentRate}x (自定义)`)
      }
    }
  }
  else {
    log('未找到倍速菜单')
    if (count < DY_MAX_ATTEMPTS) {
      dyTimeoutId = window.setTimeout(setPlaybackRate, DY_RETRY_DELAY, rate, count + 1)
    }
  }
}

// 应用保存的倍速
function applySavedPlaybackRate(count = 0): void {
  const rateMenu = getRateMenu()
  if (!rateMenu) {
    if (count < DY_MAX_ATTEMPTS) {
      dyTimeoutId = window.setTimeout(applySavedPlaybackRate, DY_RETRY_DELAY, count + 1)
      return
    }
    warn('未找到倍速菜单')
    return
  }

  // 检查当前激活的倍速
  const items = rateMenu.querySelectorAll<HTMLElement>('.xgplayer-playratio-item')
  let currentActiveRate: number | null = null

  items.forEach((item) => {
    if (currentActiveRate !== null)
      return
    // 抖音可能用不同的方式标记当前选中项，检查样式或class
    if (item.classList.contains('active') || item.classList.contains('selected')) {
      const dataId = item.getAttribute('data-id')
      if (dataId) {
        currentActiveRate = Number.parseFloat(dataId)
      }
    }
  })

  if (currentActiveRate !== null && Math.abs(currentActiveRate - dyCurrentRate) > 0.01) {
    log(`当前倍速(${currentActiveRate}x)与保存倍速(${dyCurrentRate}x)不一致，正在调整`)
    setPlaybackRate(dyCurrentRate)
  }
  else if (currentActiveRate === null) {
    log('未找到激活的倍速选项，尝试设置')
    setPlaybackRate(dyCurrentRate)
  }
  else {
    log(`当前倍速(${currentActiveRate}x)与保存倍速一致，无需调整`)
  }
}

// 增加倍速
function increasePlaybackRate(): void {
  const currentIndex = dyPlaybackRates.findIndex(r => Math.abs(r - dyCurrentRate) < 0.01)
  if (currentIndex > 0) {
    const newRate = dyPlaybackRates[currentIndex - 1]
    setPlaybackRate(newRate)
  }
  else {
    showRateMessage('已经是最大倍速 (3x)')
    log('已经是最大倍速 (3x)')
  }
}

// 减小倍速
function decreasePlaybackRate(): void {
  const currentIndex = dyPlaybackRates.findIndex(r => Math.abs(r - dyCurrentRate) < 0.01)
  if (currentIndex < dyPlaybackRates.length - 1) {
    const newRate = dyPlaybackRates[currentIndex + 1]
    setPlaybackRate(newRate)
  }
  else {
    showRateMessage('已经是最小倍速 (0.75x)')
    log('已经是最小倍速 (0.75x)')
  }
}

// 键盘快捷键处理
function handleKeyPress(event: KeyboardEvent): void {
  const activeElement = document.activeElement as HTMLElement | null
  const isInputFocused = activeElement
    && (activeElement.tagName === 'INPUT'
      || activeElement.tagName === 'TEXTAREA'
      || activeElement.isContentEditable)
  if (isInputFocused)
    return

  if (!event.ctrlKey && !event.altKey && !event.metaKey && event.location === 0) {
    const key = event.key.toLowerCase()
    if (['z', 'x', 'c', '1', '2', '3'].includes(key)) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      switch (key) {
        case 'z':
          log('按下了Z键 - 重置倍速')
          setPlaybackRate(1)
          break
        case 'x':
          log('按下了X键 - 减小倍速')
          decreasePlaybackRate()
          break
        case 'c':
          log('按下了C键 - 增加倍速')
          increasePlaybackRate()
          break
        case '1':
          log('按下了1键 - 1倍速')
          setPlaybackRate(1)
          break
        case '2':
          log('按下了2键 - 2倍速')
          setPlaybackRate(2)
          break
        case '3':
          log('按下了3键 - 3倍速')
          setPlaybackRate(3)
          break
      }
    }
  }
}

// 添加样式
GM_addStyle(`
    .douyin-rate-notice {
      position: fixed;
      left: 24px;
      top: 24px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 99999;
      pointer-events: none;
      animation: douyinToastFadeIn 0.2s ease-out, douyinToastFadeOut 0.15s ease-in 2.35s forwards;
    }
    @keyframes douyinToastFadeIn {
      from {
        transform: translateY(-4px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    @keyframes douyinToastFadeOut {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(-4px);
        opacity: 0;
      }
    }
  `)

// 清理函数
function cleanup(): void {
  if (dyTimeoutId !== null) {
    clearTimeout(dyTimeoutId)
    dyTimeoutId = null
  }
  document.removeEventListener('keydown', handleKeyPress, true)
  log('事件监听器已清理')
}

// 初始化
function init(): void {
  // 使用捕获阶段监听，确保在抖音的事件处理之前执行
  document.addEventListener('keydown', handleKeyPress, true)
  applySavedPlaybackRate()
  log('快捷键监听器已添加 (Z/X/C:倍速, 1/2/3:快速倍速)')

  // 添加页面卸载时的清理
  window.addEventListener('beforeunload', cleanup)
}

// 启动脚本
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
}
else {
  setTimeout(init)
}
