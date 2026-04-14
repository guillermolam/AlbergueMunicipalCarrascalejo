
            import * as _w_c_main_0_ from './main.main.es.compiled.js'
import * as _w_c_main_1_ from './main.main.en.compiled.js'
import * as _w_c_main_2_ from './main.main.zh.compiled.js'
import * as _w_c_main_3_ from './main.main.hi.compiled.js'
import * as _w_c_main_4_ from './main.main.ar.compiled.js'
import * as _w_c_main_5_ from './main.main.pt.compiled.js'
import * as _w_c_main_6_ from './main.main.ru.compiled.js'
import * as _w_c_main_7_ from './main.main.ja.compiled.js'
import * as _w_c_main_8_ from './main.main.de.compiled.js'
import * as _w_c_main_9_ from './main.main.fr.compiled.js'
import * as _w_c_main_10_ from './main.main.it.compiled.js'
import * as _w_c_main_11_ from './main.main.ko.compiled.js'
import * as _w_c_main_12_ from './main.main.id.compiled.js'
import * as _w_c_main_13_ from './main.main.tr.compiled.js'
import * as _w_c_main_14_ from './main.main.vi.compiled.js'
import * as _w_c_main_15_ from './main.main.ca.compiled.js'
import * as _w_c_main_16_ from './main.main.eu.compiled.js'
import * as _w_c_main_17_ from './main.main.gl.compiled.js'
import * as _w_c_main_18_ from './main.main.ast.compiled.js'
            /** @typedef {import("wuchale/runtime").CatalogModule} CatalogMod */
            /** @typedef {{[locale: string]: CatalogMod}} KeyCatalogs */
            /** @type {{[loadID: string]: KeyCatalogs}} */
            const catalogs = {main: {es: _w_c_main_0_,en: _w_c_main_1_,zh: _w_c_main_2_,hi: _w_c_main_3_,ar: _w_c_main_4_,pt: _w_c_main_5_,ru: _w_c_main_6_,ja: _w_c_main_7_,de: _w_c_main_8_,fr: _w_c_main_9_,it: _w_c_main_10_,ko: _w_c_main_11_,id: _w_c_main_12_,tr: _w_c_main_13_,vi: _w_c_main_14_,ca: _w_c_main_15_,eu: _w_c_main_16_,gl: _w_c_main_17_,ast: _w_c_main_18_}}
            export const loadCatalog = (/** @type {string} */ loadID, /** @type {string} */ locale) => {
                return /** @type {CatalogMod} */ (/** @type {KeyCatalogs} */ (catalogs[loadID])[locale])
            }
            export const loadIDs = ['main']
        