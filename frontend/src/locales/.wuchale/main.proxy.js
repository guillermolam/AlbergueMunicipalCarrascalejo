
            
            /** @typedef {() => Promise<import("wuchale/runtime").CatalogModule>} CatalogMod */
            /** @typedef {{[locale: string]: CatalogMod}} KeyCatalogs */
            /** @type {{[loadID: string]: KeyCatalogs}} */
            const catalogs = {main: {es: () => import('./main.main.es.compiled.js'),en: () => import('./main.main.en.compiled.js'),zh: () => import('./main.main.zh.compiled.js'),hi: () => import('./main.main.hi.compiled.js'),ar: () => import('./main.main.ar.compiled.js'),pt: () => import('./main.main.pt.compiled.js'),ru: () => import('./main.main.ru.compiled.js'),ja: () => import('./main.main.ja.compiled.js'),de: () => import('./main.main.de.compiled.js'),fr: () => import('./main.main.fr.compiled.js'),it: () => import('./main.main.it.compiled.js'),ko: () => import('./main.main.ko.compiled.js'),id: () => import('./main.main.id.compiled.js'),tr: () => import('./main.main.tr.compiled.js'),vi: () => import('./main.main.vi.compiled.js'),ca: () => import('./main.main.ca.compiled.js'),eu: () => import('./main.main.eu.compiled.js'),gl: () => import('./main.main.gl.compiled.js'),ast: () => import('./main.main.ast.compiled.js')}}
            export const loadCatalog = (/** @type {string} */ loadID, /** @type {string} */ locale) => {
                return /** @type {CatalogMod} */ (/** @type {KeyCatalogs} */ (catalogs[loadID])[locale])()
            }
            export const loadIDs = ['main']
        