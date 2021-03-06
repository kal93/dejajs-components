/*
 *  @license
 *  Copyright Hôpitaux Universitaires de Genève. All Rights Reserved.
 *
 *  Use of this source code is governed by an Apache-2.0 license that can be
 *  found in the LICENSE file at https://github.com/DSI-HUG/dejajs-components/blob/master/LICENSE
 */

import { Injectable } from '@angular/core';

/**
 * Monaco Editor Service
 *
 * Service used by Monaco Editor Component to load only once instance of the Monaco Editor Library
 */
@Injectable()
export class DejaEditorService {

    private _loading: boolean;
    private _loader: Promise<any>;

    /**
     * Constructor
     */
    constructor() {
        // (<any>window).CKEDITOR_BASEPATH = '/assets/ckeditor/';
    }

    /**
     * Load the Monaco Editor Library
     *
     * @return Resolved promise when the library is loaded
     */
    public initDejaEditorLib(): Promise<any> {
        if (!this._loading) {
            this.init();
        }

        return this._loader;
    }

    private init() {
        this._loader = new Promise((resolve) => {
            this._loading = true;

            // Load AMD loader if necessary
            if (!(<any>window).ckeditor) {
                const loaderScript = document.createElement('script');
                document.head.appendChild(loaderScript);
                loaderScript.type = 'text/javascript';
                loaderScript.src = 'assets/ckeditor/ckeditor.js';
                loaderScript.addEventListener('load', resolve);
            }
        });
    }
}
