/**
 * Silex, live web creation
 * http://projects.silexlabs.org/?/silex/
 *
 * Copyright (c) 2012 Silex Labs
 * http://www.silexlabs.org/
 *
 * Silex is available under the GPL license
 * http://www.silexlabs.org/silex/silex-licensing/
 */

/**
 * @fileoverview
 * the Silex menu on the left
 * based on closure menu class
 *
 */

import { Config } from '../ClientConfig'
import { Constants } from '../../constants'
import { ElementState, ElementType } from '../element-store/types';
import { FileExplorer } from './dialog/FileExplorer'
import {
  INITIAL_ELEMENT_SIZE,
  getCreationDropZone,
  removeElements
} from '../element-store/utils';
import { Keyboard, Shortcut } from '../utils/Keyboard'
import { SilexNotification } from './Notification';
import {
  addElement,
  moveDown,
  moveToBottom,
  moveToTop,
  moveUp,
  selectBody
} from '../element-store/dispatchers';
import { copySelection, duplicateSelection, pasteClipBoard } from '../copy'
import { createPage, editPage, removePage } from '../page-store/dispatchers'
import {
  deleteElements,
  subscribeElements,
  updateElements
} from '../element-store/index';
import { getBody } from '../element-store/filters';
import { getComponentsDef, prodotypeReady } from '../element-store/component'
import { getDomElement, setImageUrl } from '../element-store/dom';
import { getSite, subscribeSite } from '../site-store/index';
import { getSiteDocument, getSiteIFrame } from './SiteFrame';
import { getStage } from './StageWrapper';
import { getUi, updateUi } from '../ui-store/index'
import { getUiElements } from '../ui-store/UiElements'
import { hasRedo, hasUndo, redo, undo } from '../undo';
import { openCssEditor } from './dialog/CssEditor'
import { openDashboardToLoadAWebsite, openFile, publish, save } from '../file'
import { openHtmlHeadEditor } from './dialog/HtmlEditor'
import { openJsEditor } from './dialog/JsEditor'
import { openSettingsDialog } from './dialog/SettingsDialog'
import { preview, previewResponsize } from '../preview'
import { subscribePages } from '../page-store/index'
import { subscribeUi } from '../ui-store/index'

///////////////////
// API for the outside world
const element = getUiElements().menu
const keyboard = new Keyboard(document)
let initDone = false

export function initMenu() {
  if(!initDone) buildUi()
  initDone = true
  subscribeSite(() => redraw())
  subscribePages(() => redraw())
  subscribeElements(() => redraw())
  subscribeUi(() => redraw())

}

const SUB_MENU_CLASSES = [
  'page-tool-visible', 'about-menu-visible', 'file-menu-visible',
  'code-menu-visible', 'add-menu-visible',
];

export function closeAllSubMenu() {
  SUB_MENU_CLASSES.forEach((className) => {
    document.body.classList.remove(className);
  });
}

function toggleSubMenu(classNameToToggle) {
  SUB_MENU_CLASSES.forEach((className) => {
    if (classNameToToggle === className) {
      document.body.classList.toggle(className);
    } else {
      document.body.classList.remove(className);
    }
  });
}

/**
 * open the page pannel
 */
export function showPages() {
  toggleSubMenu('page-tool-visible');
}

export function keyboardAttach(doc: HTMLDocument) {
  initMenu()
  return keyboard.attach(doc)
}

export function keyboardAddShortcut(s: Shortcut, cbk: (p1: Event) => void) {
  initMenu()
  return keyboard.addShortcut(s, cbk)
}

function elFromCompDef(comp, id) {
  // build the dom elements for each comp by category
  const iconClassName = comp.faIconClass || 'prodotype-icon'
  const baseElementType = comp.baseElement || 'html'
  const el = document.createElement('div')
  el.classList.add('sub-menu-item')
  el.title = `${comp.name}`
  el.setAttribute('data-menu-action', 'insert.' + baseElementType)
  el.setAttribute('data-comp-id', id)
  el.innerHTML = `
  <span class="icon fa-inverse ${iconClassName}"></span>
  ${comp.name}
  `
  return el
}
/**
 * create the menu with closure API
 * called by the app constructor
 */
function buildUi() {
  // Shortcuts
  Config.shortcuts.forEach((shortcut) => {
    keyboard.addShortcut(shortcut, (e) => onMenuEvent(shortcut.id))
  })

  // components
  prodotypeReady(() => {
    // **
    const list = element.querySelector('.add-menu-container')
    const componentsDef = getComponentsDef(Constants.COMPONENT_TYPE)

    // build a list of component categories
    const elements = {}
    for (const id in componentsDef) {
      const comp = componentsDef[id]
      if (comp.isPrivate !== true) {
        if (!elements[comp.category]) {
          elements[comp.category] = [elFromCompDef(comp, id)]
        } else {
          elements[comp.category].push(elFromCompDef(comp, id))
        }
      }
    }
    for (const id in elements) {
      // create a label for the category
      const label = document.createElement('div')
      label.classList.add('label')
      label.innerHTML = id
      list.appendChild(label)

      // attach each comp's element
      elements[id].forEach((el) => list.appendChild(el))
    }
  })

  // event handling
  element.onclick = (e) => {
    const action = (e.target as HTMLElement).getAttribute('data-menu-action') ||
    (e.target as HTMLElement).parentElement.getAttribute('data-menu-action')
    const componentId = (e.target as HTMLElement).getAttribute('data-comp-id') ||
    (e.target as HTMLElement).parentElement.getAttribute('data-comp-id')
    onMenuEvent(action, componentId)
    if ((e.target as HTMLElement).parentElement &&
    !(e.target as HTMLElement).parentElement.classList.contains('menu-container') &&
    !(e.target as HTMLElement).parentElement.classList.contains('silex-menu')) {
      // not a first level menu => close sub menus
      closeAllSubMenu()
    }
  }
}

/**
 * compute the desired state chages to add an element centered in the container which is in the middle of the screen
 */
export async function addElementCentered(type: ElementType, componentName: string): Promise<[ElementState, ElementState]> {
  if (type === ElementType.SECTION) {
    const [el, updatedParentData] = await addElement({
      type,
      parent: getBody(),
      componentName,
      style: {
        mobile: {},
        desktop: {},
      },
    })

    return [el, updatedParentData]
  } else {
    const stageEl = getSiteIFrame()
    const parent = getCreationDropZone(false, stageEl)
    const parentState = getStage().getState(getDomElement(stageEl.contentDocument, parent))
    const parentRect = parentState.metrics.computedStyleRect

    const [el, updatedParentData] = await addElement({
      type,
      parent,
      componentName,
      style: {
        mobile: {},
        desktop: {
          top: Math.round((parentRect.height / 2) - (INITIAL_ELEMENT_SIZE / 2)) + 'px',
          left: Math.round((parentRect.width / 2) - (INITIAL_ELEMENT_SIZE / 2)) + 'px',
        },
      },
    })

    return [el, updatedParentData]
  }
}

/**
 * open file explorer, choose an image and add it to the stage
 */
export async function browseAndAddImage(componentName: string) {
  try {
    const fileInfo = await FileExplorer.getInstance().openFile(FileExplorer.IMAGE_EXTENSIONS)
    if (fileInfo) {

      // create the element
      const [imgData] = await addElementCentered(ElementType.IMAGE, componentName)
      const img = getDomElement(getSiteDocument(), imgData)

      // load the image
      setImageUrl(img, fileInfo.absPath,
        (naturalWidth: number, naturalHeight: number) => {
          // this.tracker.trackAction('controller-events', 'success', 'insert.image', 1)
          updateElements([{
            ...imgData,
            style: {
              ...imgData.style,
              desktop: {
                ...imgData.style.desktop,
                width: naturalWidth + 'px',
                height: naturalHeight + 'px',
              },
            },
          }])
        },
        (element: HTMLElement, message: string) => {
          SilexNotification.notifyError('Error: I did not manage to load the image. \n' + message)
          deleteElements([imgData])
          // this.tracker.trackAction('controller-events', 'error', 'insert.image', -1)
        },
      )
    }
  } catch(error) {
    SilexNotification.notifyError('Error: I did not manage to load the image. \n' + (error.message || ''))
  }
}

/**
 * redraw the menu
 */
function redraw() {
  if (hasUndo()) {
    element.querySelector('.undo').classList.remove('off')
  } else {
    element.querySelector('.undo').classList.add('off')
  }
  if (hasRedo()) {
    element.querySelector('.redo').classList.remove('off')
  } else {
    element.querySelector('.redo').classList.add('off')
  }
}

/**
 * handles click events
 * calls onStatus to notify the controller
 * @param componentName the component type if it is a component
 */
function onMenuEvent(type: string, componentName?: string) {
  switch (type) {
    case 'show.pages':
      toggleSubMenu('page-tool-visible')
      break
    case 'show.about.menu':
      toggleSubMenu('about-menu-visible')
      break
    case 'show.file.menu':
      toggleSubMenu('file-menu-visible')
      break
    case 'show.code.menu':
      toggleSubMenu('code-menu-visible')
      break
    case 'show.add.menu':
      toggleSubMenu('add-menu-visible')
      break
    case 'file.new':
      openDashboardToLoadAWebsite()
      break
    case 'file.saveas':
      save()
      break
    case 'file.publish.settings':
      openSettingsDialog()
      break
    case 'file.fonts':
      openSettingsDialog(null, 'fonts-pane')
      break
    case 'file.publish':
      publish()
      break
    case 'file.save':
      save(getSite().file)
      break
    case 'file.open':
      openFile()
      break
    case 'view.file':
      preview()
      break
    case 'view.file.responsize':
      previewResponsize()
      break
    case 'view.open.fileExplorer':
      FileExplorer.getInstance().openFile()
      break
    case 'view.open.cssEditor':
      openCssEditor()
      break
    case 'view.open.jsEditor':
      openJsEditor()
      break
    case 'view.open.htmlHeadEditor':
      openHtmlHeadEditor()
      break
    case 'tools.mobile.mode':
      const ui = getUi()
      updateUi({
        ...ui,
        mobileEditor: !ui.mobileEditor,
      })
      break
    case 'tools.mobile.mode.on':
      updateUi({
        ...getUi(),
        mobileEditor: true,
      })
      break
    case 'tools.mobile.mode.off':
      updateUi({
        ...getUi(),
        mobileEditor: false,
      })
      break
    case 'insert.page':
      createPage()
      break
    case 'insert.text': {
      addElementCentered(ElementType.TEXT, componentName)
      break
    }
    case 'insert.section': {
      addElementCentered(ElementType.SECTION, componentName)
      break
    }
    case 'insert.html': {
      addElementCentered(ElementType.HTML, componentName)
      break
    }
    case 'insert.image': {
      browseAndAddImage(componentName)
      break
    }
    case 'insert.container': {
      addElementCentered(ElementType.CONTAINER, componentName)
      break
    }
    case 'edit.delete.selection':
      removeElements()
      break
    case 'edit.empty.selection':
      // select body
      selectBody()
      break
    case 'edit.copy.selection':
      copySelection()
      break
    case 'edit.paste.selection':
      pasteClipBoard()
      break
    case 'edit.duplicate.selection':
      duplicateSelection()
      break
    case 'edit.undo':
      undo()
      break
    case 'edit.redo':
      redo()
      break
    case 'edit.move.up':
      console.log('edit.move.up')
      moveUp()
      break
    case 'edit.move.down':
      moveDown()
      break
    case 'edit.move.to.top':
      moveToTop()
      break
    case 'edit.move.to.bottom':
      moveToBottom()
      break
    case 'edit.delete.page':
      removePage()
      break
    case 'edit.rename.page':
      editPage()
      break
    // Help menu
    case 'help.wiki':
      window.open(Config.WIKI_SILEX)
      break
    case 'help.crowdfunding':
      window.open(Config.CROWD_FUNDING)
      break
    case 'help.issues':
      window.open(Config.ISSUES_SILEX)
      break
    case 'help.downloads.widget':
      window.open(Config.DOWNLOADS_WIDGET_SILEX)
      break
    case 'help.downloads.template':
      window.open(Config.DOWNLOADS_TEMPLATE_SILEX)
      break
    case 'help.aboutSilexLabs':
      window.open(Config.ABOUT_SILEX_LABS)
      break
    case 'help.newsLetter':
      window.open(Config.SUBSCRIBE_SILEX_LABS)
      break
    case 'help.diaspora':
      window.open(Config.SOCIAL_DIASPORA)
      break
    case 'help.twitter':
      window.open(Config.SOCIAL_TWITTER)
      break
    case 'help.facebook':
      window.open(Config.SOCIAL_FB)
      break
    case 'help.forkMe':
      window.open(Config.FORK_CODE)
      break
    case 'help.contribute':
      window.open(Config.CONTRIBUTE)
      break
      default:
      console.warn('menu type not found', type)
  }
}
