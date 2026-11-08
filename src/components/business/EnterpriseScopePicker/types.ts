export type EnterpriseScopeOption = {
  value: string
  label: string
  /** 供搜索匹配的小写关键词 */
  keywords: string
}

export type EnterpriseScopeSection = {
  id: string
  heading: string
  options: EnterpriseScopeOption[]
  /**
   * 可选：点击分组标题时选中（资产页选整组）。
   * 不传则标题仅用于展开/折叠。
   */
  selectOption?: EnterpriseScopeOption
}
