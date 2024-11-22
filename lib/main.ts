import { debounce } from 'lodash-es'
export type Language = 'en-US' | 'zh-CN'
export type GetTranslation = (arg: {
  text: string[]
  defaultLanguage: Language
  targetLanguage: Language
}) => Promise<Record<string, string>>
export default class I18nObserver {
  constructor(arg: {
    defaultLanguage: Language
    localStorageKey?: string
    targetLanguage?: Language
    getTranslation: GetTranslation
  }) {
    const { defaultLanguage, localStorageKey, targetLanguage, getTranslation } = arg
    this.defaultLanguage = defaultLanguage
    this.localStorageKey = localStorageKey || 'initI18nTargetLanguage'
    this.targetLanguage =
      targetLanguage ||
      ((localStorage.getItem(this.localStorageKey) || navigator.language) as Language)
    this.getTranslation = getTranslation
  }
  /** 网页默认显示的语言类型 */
  defaultLanguage: Language
  /** 翻译目标语言 */
  targetLanguage: Language
  localStorageKey: string

  /** 需要发起请求获取翻译的text dom，可能存在翻译到一半，一部分是英文，一部分是中文的场景 */
  textNodes = new Set<Node>()
  /**
   * 正在获取翻译的文本
   *  */
  gettingText = new Set<string>()

  getTranslation: GetTranslation

  /** 已经翻译的字典 */
  translateMap = new Map<string, string>()

  /** 获取文本的翻译 */
  translationText = debounce(async () => {
    const noGetText: string[] = []

    this.textNodes.forEach((node) => {
      const textContent = node.textContent
      if (textContent && !this.gettingText.has(textContent)) {
        noGetText.push(textContent)
      }
    })
    if (!noGetText.length) return
    noGetText.forEach((text) => this.gettingText.add(text))
    const textMap = await this.getTranslation({
      defaultLanguage: this.defaultLanguage,
      targetLanguage: this.targetLanguage,
      text: noGetText,
    })
    Object.entries(textMap).forEach(([key, value]) => {
      this.translateMap.set(key, value)
    })
    this.textNodes.forEach((node) => {
      const translationText = this.translateMap.get(node.textContent!)
      if (node.textContent && translationText) {
        node.textContent = translationText
        this.textNodes.delete(node)
      }
    })
    this.gettingText.forEach((text) => {
      if (this.translateMap.get(text)) {
        this.gettingText.delete(text)
      }
    })
  }, 400)

  /** 设置翻译目标语言 */
  setTargetLanguage(language: Language) {
    if (language !== this.targetLanguage) {
      localStorage.setItem(this.localStorageKey, language)
      location.reload()
    }
  }
  /** textNodes中包含了改dom */
  textNodesHasItem(item: Node) {
    return false
    return this.textNodes.has(item)
  }
  /** 遍历dom树把需要翻译的text类型的dom加入textNodes */
  addTextNode(addedNodes: Node[]) {
    const allTranslate = [...this.translateMap.values()]
    addedNodes.forEach((node) => {
      const textContent = node.textContent
      if (!textContent) return
      const alreadyTranslate = this.translateMap.get(textContent)
      if (alreadyTranslate) {
        // 已经有翻译的直接翻译
        node.textContent = alreadyTranslate
      } else {
        if (
          node.nodeType === Node.TEXT_NODE &&
          textContent &&
          !this.textNodesHasItem(node) &&
          // 已经翻译过的node不包括
          !allTranslate.includes(textContent)
        ) {
          this.textNodes.add(node)
        }
      }
      if (node.childNodes.length) {
        this.addTextNode([...node.childNodes])
      }
    })
  }
  /** dom监听对象 */
  mutationObserver: MutationObserver | undefined
  /** 监听改变的dom */
  observeTarget: Node = document.body
  /** 开始监听目标dom */
  observe(target?: Node) {
    this.mutationObserver = new MutationObserver((mutationList) => {
      mutationList.forEach((c) => {
        const addedNodes: Node[] = c.type === 'childList' ? [...c.addedNodes] : [c.target]
        this.addTextNode(addedNodes)
      })
      this.translationText()
    })
    const observeTarget = target || document.body
    this.observeTarget = observeTarget
    this.mutationObserver.observe(observeTarget, {
      subtree: true,
      childList: true,
      attributes: false,
      characterData: true,
    })
    // 第一次翻译
    this.addTextNode([observeTarget])
    this.translationText()
  }
}
