// GM_* API 类型声明
declare function GM_setValue<T>(name: string, value: T): void
declare function GM_getValue<T>(name: string, defaultValue?: T): T
declare function GM_addStyle(css: string): void
