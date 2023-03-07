/**
 * @fileoverview define types for Silex client and server
 */

export const WEBSITE_CONTEXT_RUNTIME_CLASS_NAME = 'silex-runtime'
export const WEBSITE_CONTEXT_EDITOR_CLASS_NAME = 'silex-editor'

// Note: paths begin and end **without** slash
export const defaultSettings: PublicationSettings = {
  path: 'publication',
  assets: { path: 'assets', url: '/assets' },
  html: { path: '', url: '' },
  css: { path: 'css', url: '/css' },
  prefix: '', // for images src: src="${settings.prefix}${settings.assets.path}/image.jpg"
  autoHomePage: true,
}

export const defaultSite: WebsiteData = {
  pages: [],
  assets: [],
  styles: [],
  name: 'New website',
  settings: {
    description: '',
    title: '',
    head: '',
    lang: 'en',
    favicon: 'https://editor.silex.me/assets/favicon.png',
    'og:title': '',
    'og:description': '',
    'og:image': '',
  },
  fonts: [
    { name: 'Arial', value: 'Arial, Helvetica, sans-serif', variants: [] },
    { name: 'Times New Roman', value: '"Times New Roman", Times, serif', variants: [] },
  ],
  symbols: [],
  publication: defaultSettings,
}

export interface WebsiteSettings {
  description: string,
  title: string,
  lang: string,
  head: string,
  favicon: string,
  'og:title': string,
  'og:description': string,
  'og:image': string,
}

export interface WebsiteData {
  pages: Page[],
  assets: Asset[],
  styles: Style[],
  name: string,
  settings: WebsiteSettings,
  fonts: Font[],
  symbols: symbol[],
  publication: PublicationSettings,
}

export interface Font {
  name: string,
  value: string,
  variants: string[],
}
export interface PublicationSettings {
  path?: string,
  assets?: {
    path?: string,
    url?: string,
  },
  html?: {
    path?: string,
    url?: string,
    ext?: string,
  },
  css?: {
    path?: string,
    url?: string,
    ext?: string,
  },
  prefix?: string,
  autoHomePage?: boolean,
}

export interface File {
  html: string,
  css: string,
  htmlPath: string,
  cssPath: string,
}

export interface Page {
  name?: string,
  id: string,
  type?: string,
  frames: Frame[],
  settings?: WebsiteSettings,
  cssExt?: string,
  htmlExt?: string,
}

export interface Frame {
  component: { type: string, stylable: string[] },
  components: Component[],
}

export interface Component {
  type: string,
  content?: string,
  attributes: { [key: string]: string },
  conponents: Component[],
}

export enum Unit {
  PX = 'px',
}

export interface Asset     {
  type: string,
  src: string,
  unitDim: Unit,
  height: number,
  width: number,
  name: string,
}

export interface Style {
  selectors: Selector[],
  style: { [key: string]: string },
}

export type Selector = string | {
  name: string,
  type: number,
}

