export type SupportedLocale = 'en' | 'zh-CN' | 'zh-TW' | 'ja'
export type LanguageSetting = SupportedLocale | 'system'

const LANGUAGE_STORAGE_KEY = 'grid-forge-language-v1'

export type AppMessages = {
  title: {
    eyebrow: string
    desktop: string
    mobile: string
  }
  metrics: {
    score: string
    rank: string
    lines: string
    pieces: string
  }
  mobilePlacement: {
    releaseAt: string
    blockedAt: string
  }
  notices: {
    rotatedClockwise: (pieceName: string) => string
    rotatedCounterclockwise: (pieceName: string) => string
    noRoom: (pieceName: string, x: number, y: number) => string
  }
  gameOver: {
    newBestRun: string
    noMoreMoves: string
    newBestCopy: string
    noMoreMovesCopy: string
  }
  board: {
    label: string
    title: string
    clearHint: string
    occupancy: string
    runOver: string
    score: string
    rank: string
    rounds: string
    runItBack: string
    drop: string
    blocked: string
    boardCellAria: (x: number, y: number) => string
  }
  rack: {
    label: string
    mobileTitle: string
    desktopTitle: string
    freshPieces: string
    piecesRemaining: (remaining: number, total: number) => string
    cells: string
    fits: string
    blocked: string
    placed: string
    coarseHint: string
    fineHint: string
  }
  run: {
    label: string
    benchmark: string
    status: string
    lines: string
    failed: string
    live: string
    rounds: string
    combo: string
    efficiency: string
    bestRank: string
    bestScore: string
    bestCombo: string
    emptyRecord: string
  }
  audio: {
    bgm: string
    on: string
    off: string
    muteAria: string
    enableAria: string
  }
  language: {
    label: string
    system: string
    english: string
    chineseSimplified: string
    chineseTraditional: string
    japanese: string
  }
}

function normalizeLanguage(input: string): SupportedLocale {
  const value = input.toLowerCase()

  if (value.startsWith('ja')) {
    return 'ja'
  }

  if (value.startsWith('zh')) {
    const isTraditional =
      value.includes('hant') ||
      value.includes('-tw') ||
      value.includes('-hk') ||
      value.includes('-mo')

    return isTraditional ? 'zh-TW' : 'zh-CN'
  }

  return 'en'
}

export function detectSystemLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') {
    return 'en'
  }

  const candidates = [...navigator.languages, navigator.language].filter(Boolean)

  for (const candidate of candidates) {
    const locale = normalizeLanguage(candidate)

    if (locale) {
      return locale
    }
  }

  return 'en'
}

export function resolveLocale(languageSetting: LanguageSetting): SupportedLocale {
  if (languageSetting === 'system') {
    return detectSystemLocale()
  }

  return languageSetting
}

export function readLanguageSetting(): LanguageSetting {
  if (typeof window === 'undefined') {
    return 'system'
  }

  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)

    if (
      value === 'system' ||
      value === 'en' ||
      value === 'zh-CN' ||
      value === 'zh-TW' ||
      value === 'ja'
    ) {
      return value
    }

    return 'system'
  } catch {
    return 'system'
  }
}

export function saveLanguageSetting(setting: LanguageSetting) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, setting)
}

const messages: Record<SupportedLocale, AppMessages> = {
  en: {
    title: {
      eyebrow: 'Grid Forge',
      desktop: '10x10 Tactical Stack',
      mobile: '10x10 Run',
    },
    metrics: { score: 'Score', rank: 'Rank', lines: 'Lines', pieces: 'Pieces' },
    mobilePlacement: { releaseAt: 'Release at', blockedAt: 'Blocked at' },
    notices: {
      rotatedClockwise: (pieceName) => `${pieceName} rotated clockwise.`,
      rotatedCounterclockwise: (pieceName) => `${pieceName} rotated counterclockwise.`,
      noRoom: (pieceName, x, y) => `No room for ${pieceName.toLowerCase()} at ${x}, ${y}.`,
    },
    gameOver: {
      newBestRun: 'New Best Run',
      noMoreMoves: 'No More Moves',
      newBestCopy: 'You squeezed out your strongest run so far. Reset and see if you can beat the new mark.',
      noMoreMovesCopy: 'None of the remaining draft pieces can fit on the board. Reset to start a fresh run.',
    },
    board: {
      label: 'Board',
      title: 'Placement Arena',
      clearHint: 'Clear full rows or columns.',
      occupancy: 'Occupancy',
      runOver: 'Run Over',
      score: 'Score',
      rank: 'Rank',
      rounds: 'Rounds',
      runItBack: 'Run it back',
      drop: 'Drop',
      blocked: 'Blocked',
      boardCellAria: (x, y) => `Board cell ${x}, ${y}`,
    },
    rack: {
      label: 'Rack',
      mobileTitle: 'Draft Tray',
      desktopTitle: 'Current Draft',
      freshPieces: 'Fresh pieces arrive after this turn resolves.',
      piecesRemaining: (remaining, total) => `${remaining}/${total} pieces remaining`,
      cells: 'cells',
      fits: 'Fits',
      blocked: 'Blocked',
      placed: 'Placed',
      coarseHint:
        'Tap a piece to rotate it clockwise. Long-press a piece to drag it onto the board and release to place it.',
      fineHint:
        'Click a piece to select it, then click a board cell to place it. Press R to rotate clockwise, or long-press to drag and drop.',
    },
    run: {
      label: 'Run',
      benchmark: 'Benchmark',
      status: 'Status',
      lines: 'Lines',
      failed: 'Failed',
      live: 'Live',
      rounds: 'Rounds',
      combo: 'Combo',
      efficiency: 'Efficiency',
      bestRank: 'Best rank',
      bestScore: 'Best score',
      bestCombo: 'Best combo',
      emptyRecord: 'Finish a run to save a local benchmark record in this browser.',
    },
    audio: {
      bgm: 'BGM',
      on: 'On',
      off: 'Off',
      muteAria: 'Mute background music',
      enableAria: 'Enable background music',
    },
    language: {
      label: 'Language',
      system: 'System',
      english: 'English',
      chineseSimplified: '简体中文',
      chineseTraditional: '繁體中文',
      japanese: '日本語',
    },
  },
  'zh-CN': {
    title: { eyebrow: '格阵工坊', desktop: '10x10 战术堆叠', mobile: '10x10 对局' },
    metrics: { score: '分数', rank: '评级', lines: '消行', pieces: '方块' },
    mobilePlacement: { releaseAt: '在此放下', blockedAt: '此处被阻挡' },
    notices: {
      rotatedClockwise: (pieceName) => `${pieceName} 已顺时针旋转。`,
      rotatedCounterclockwise: (pieceName) => `${pieceName} 已逆时针旋转。`,
      noRoom: (pieceName, x, y) => `${x}, ${y} 无法放置 ${pieceName}。`,
    },
    gameOver: {
      newBestRun: '新的最佳成绩',
      noMoreMoves: '无可用落子',
      newBestCopy: '你打出了目前最强的一局。重开试试能不能再破纪录。',
      noMoreMovesCopy: '剩余草稿方块都无法放入棋盘。重开开始新的一局。',
    },
    board: {
      label: '棋盘',
      title: '落子区域',
      clearHint: '填满整行或整列即可清除。',
      occupancy: '占用率',
      runOver: '本局结束',
      score: '分数',
      rank: '评级',
      rounds: '回合',
      runItBack: '再来一局',
      drop: '放下',
      blocked: '阻挡',
      boardCellAria: (x, y) => `棋盘格 ${x}, ${y}`,
    },
    rack: {
      label: '备选区',
      mobileTitle: '草稿托盘',
      desktopTitle: '当前草稿',
      freshPieces: '本回合结束后会补充新方块。',
      piecesRemaining: (remaining, total) => `剩余 ${remaining}/${total} 个方块`,
      cells: '格',
      fits: '可放',
      blocked: '受阻',
      placed: '已放置',
      coarseHint: '轻触方块可顺时针旋转，长按后拖到棋盘并松手放置。',
      fineHint: '点击方块后再点棋盘落子。按 R 顺时针旋转，或长按拖放。',
    },
    run: {
      label: '对局',
      benchmark: '评估',
      status: '状态',
      lines: '消行',
      failed: '失败',
      live: '进行中',
      rounds: '回合',
      combo: '连击',
      efficiency: '效率',
      bestRank: '最佳评级',
      bestScore: '最高分',
      bestCombo: '最高连击',
      emptyRecord: '完成一局后会在此浏览器保存本地记录。',
    },
    audio: {
      bgm: '音乐',
      on: '开',
      off: '关',
      muteAria: '关闭背景音乐',
      enableAria: '开启背景音乐',
    },
    language: {
      label: '语言',
      system: '跟随系统',
      english: 'English',
      chineseSimplified: '简体中文',
      chineseTraditional: '繁體中文',
      japanese: '日本語',
    },
  },
  'zh-TW': {
    title: { eyebrow: '格陣工坊', desktop: '10x10 戰術堆疊', mobile: '10x10 對局' },
    metrics: { score: '分數', rank: '評級', lines: '消行', pieces: '方塊' },
    mobilePlacement: { releaseAt: '在此放下', blockedAt: '此處受阻' },
    notices: {
      rotatedClockwise: (pieceName) => `${pieceName} 已順時針旋轉。`,
      rotatedCounterclockwise: (pieceName) => `${pieceName} 已逆時針旋轉。`,
      noRoom: (pieceName, x, y) => `${x}, ${y} 無法放置 ${pieceName}。`,
    },
    gameOver: {
      newBestRun: '新的最佳成績',
      noMoreMoves: '沒有可下的位置',
      newBestCopy: '你打出了目前最強的一局。重開看看能否再破紀錄。',
      noMoreMovesCopy: '剩餘草稿方塊都無法放入棋盤。重開開始新的一局。',
    },
    board: {
      label: '棋盤',
      title: '落子區域',
      clearHint: '填滿整行或整列即可清除。',
      occupancy: '占用率',
      runOver: '本局結束',
      score: '分數',
      rank: '評級',
      rounds: '回合',
      runItBack: '再來一局',
      drop: '放下',
      blocked: '受阻',
      boardCellAria: (x, y) => `棋盤格 ${x}, ${y}`,
    },
    rack: {
      label: '備選區',
      mobileTitle: '草稿托盤',
      desktopTitle: '目前草稿',
      freshPieces: '本回合結束後會補充新方塊。',
      piecesRemaining: (remaining, total) => `剩餘 ${remaining}/${total} 個方塊`,
      cells: '格',
      fits: '可放',
      blocked: '受阻',
      placed: '已放置',
      coarseHint: '輕觸方塊可順時針旋轉，長按後拖到棋盤並放開放置。',
      fineHint: '點擊方塊後再點棋盤落子。按 R 順時針旋轉，或長按拖放。',
    },
    run: {
      label: '對局',
      benchmark: '評估',
      status: '狀態',
      lines: '消行',
      failed: '失敗',
      live: '進行中',
      rounds: '回合',
      combo: '連擊',
      efficiency: '效率',
      bestRank: '最佳評級',
      bestScore: '最高分',
      bestCombo: '最高連擊',
      emptyRecord: '完成一局後會在此瀏覽器儲存本地紀錄。',
    },
    audio: {
      bgm: '音樂',
      on: '開',
      off: '關',
      muteAria: '關閉背景音樂',
      enableAria: '開啟背景音樂',
    },
    language: {
      label: '語言',
      system: '跟隨系統',
      english: 'English',
      chineseSimplified: '简体中文',
      chineseTraditional: '繁體中文',
      japanese: '日本語',
    },
  },
  ja: {
    title: { eyebrow: 'グリッドフォージ', desktop: '10x10 タクティカルスタック', mobile: '10x10 ラン' },
    metrics: { score: 'スコア', rank: 'ランク', lines: 'ライン', pieces: 'ピース' },
    mobilePlacement: { releaseAt: 'ここで離す', blockedAt: 'ここは置けない' },
    notices: {
      rotatedClockwise: (pieceName) => `${pieceName} を右回転しました。`,
      rotatedCounterclockwise: (pieceName) => `${pieceName} を左回転しました。`,
      noRoom: (pieceName, x, y) => `${x}, ${y} に ${pieceName} は置けません。`,
    },
    gameOver: {
      newBestRun: '自己ベスト更新',
      noMoreMoves: 'これ以上置けません',
      newBestCopy: 'これまでで最も良いランでした。リセットしてさらに記録更新を狙いましょう。',
      noMoreMovesCopy: '残っているドラフトピースはどれも盤面に入りません。リセットして新しいランを開始しましょう。',
    },
    board: {
      label: 'ボード',
      title: '配置エリア',
      clearHint: '行または列をすべて埋めると消去されます。',
      occupancy: '占有率',
      runOver: 'ラン終了',
      score: 'スコア',
      rank: 'ランク',
      rounds: 'ラウンド',
      runItBack: 'もう一回',
      drop: 'ドロップ',
      blocked: '不可',
      boardCellAria: (x, y) => `ボードセル ${x}, ${y}`,
    },
    rack: {
      label: 'ラック',
      mobileTitle: 'ドラフトトレイ',
      desktopTitle: '現在のドラフト',
      freshPieces: 'このターン終了後に新しいピースが補充されます。',
      piecesRemaining: (remaining, total) => `${remaining}/${total} ピース残り`,
      cells: 'マス',
      fits: '配置可',
      blocked: '不可',
      placed: '配置済み',
      coarseHint: 'タップで右回転。長押しでボードへドラッグし、指を離して配置します。',
      fineHint: 'ピースをクリックして選択し、ボードセルをクリックして配置。Rキーで右回転、または長押しドラッグ。',
    },
    run: {
      label: 'ラン',
      benchmark: 'ベンチマーク',
      status: '状態',
      lines: 'ライン',
      failed: '失敗',
      live: '進行中',
      rounds: 'ラウンド',
      combo: 'コンボ',
      efficiency: '効率',
      bestRank: '最高ランク',
      bestScore: '最高スコア',
      bestCombo: '最大コンボ',
      emptyRecord: 'ランを完了すると、このブラウザにローカル記録が保存されます。',
    },
    audio: {
      bgm: 'BGM',
      on: 'オン',
      off: 'オフ',
      muteAria: 'BGMをミュート',
      enableAria: 'BGMを有効化',
    },
    language: {
      label: '言語',
      system: 'システム設定',
      english: 'English',
      chineseSimplified: '简体中文',
      chineseTraditional: '繁體中文',
      japanese: '日本語',
    },
  },
}

export function getMessages(locale: SupportedLocale): AppMessages {
  return messages[locale]
}
