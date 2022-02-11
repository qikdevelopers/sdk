// if (process.browser) {

import QikAPI from './qik.api.js';
import QikAuth from './qik.auth.js';
import QikUtils from './qik.utils.js';
import QikCache from './qik.cache.js';
import QikAccess from './qik.access.js';
import { EventDispatcher } from './qik.utils.js';

///////////////////////////////////////

/**
 * Creates a new QikCore instance including all of the default sub modules
 * @alias qik
 * @constructor
 * @param {Object} options 
 * @param {String} options.apiURL    The remote URL of the Qik API you want to connect to. Options are 'staging', 'production' or you may set a specific URL eg. 'https://api.qik.io' (do not include trailing slash). If no value is provided, will default to 'production'.
 * @param {String} options.applicationToken When running as a static application, (for example a website) you may set the application's access token before you initialize the Qik instance here.  
 * @example
 *
 * //Import the Qik package
 * import Qik from '@qikdev/sdk';
 *
 * //Create a new Qik instance
 * var qik = new Qik();
 *
 * //Request the current user session endpoint from the Qik API
 * qik.api.get('/session').then(function(res) {
 *   console.log('User session is ', res.data);
 * })
 * .catch(function(err) {
 *     console.log('There was an error', err);
 * });
 *
 * //Use the QikAsset package to generate an image url
 * var link = qik.asset.imageUrl('5ca3d64dd2bb085eb9d450db', 1920, 1080)
 */

import { version } from '../version.js';

console.log('BEFORE class')

export default function(options) {
    if (!options) {
        options = {
            // apiURL,
            // applicationToken,
            // api:{}
        }
    }

    ///////////////////////////////////////

    if (!options.apiURL || !options.apiURL.length) {
        options.apiURL = 'staging';
    }

    ///////////////////////////////////////

    switch (String(options.apiURL).toLowerCase()) {
        case 'production':
            options.apiURL = 'https://api.qik.dev';
            break;
        case 'staging':
            options.apiURL = 'https://api.staging.qik.dev';
            break;
        case 'local':
            options.apiURL = 'http://localhost:4001';
            break;
    }

    ///////////////////////////////////////

    const core = Object.assign(options, {
        //Other options
        // domain:'',
        version,
    })

    console.log('Instantiate class', core)



    ///////////////////////////////////////

    /**
     * Provides a cache service, used for creating, clearing 
     * and storing API requests and other information in memory
     * @type {QikCache}
     */
    var cache = QikCache;
    Object.defineProperty(core, 'cache', {
        value: cache,
        writable: false,
    });
    ///////////////////////////////////////

    /**
     * Provides helper functions for working
     * with Qik data
     * @type {QikUtils}
     */
    var utils = QikUtils;
    Object.defineProperty(core, 'utils', {
        value: utils,
        writable: false,
    });

    ///////////////////////////////////////

    //Create a new global dispatcher so we can trigger events
    var dispatcher = new EventDispatcher();
    dispatcher.bootstrap(core);

    //Set the function
    core.error = function(err) {
        //Dispatch an error event
        return core.dispatch('error', utils.errorMessage(err));
    }

    //And enable notifications with a short message
    core.notify = function(message, options) {
        return core.dispatch('notification', { message, options });
    }

    ///////////////////////////////////////

    /**
     * The default service for interacting with
     * the Qik REST API, it's a wrapper around the axios library
     * that works in conjunction with the other Qik modules
     * @type {QikAPI}
     */
    var api = new QikAPI(core);
    Object.defineProperty(core, 'api', {
        value: api,
        writable: false,
    });

    /**
     * The default service for managing authentication
     * handles automatic refreshing of access tokens, and provides login, logout
     * and other user/application specific functionality
     * @type {QikAuth}
     */
    var auth = new QikAuth(core);
    Object.defineProperty(core, 'auth', {
        value: auth,
        writable: false,
    });

    ///////////////////////////////////////

    /**
     * A helper service for understanding a user's access permissions
     * @type {QikAccess}
     */
    var access = new QikAccess(core);
    Object.defineProperty(core, 'access', {
        value: access,
        writable: false,
    });

    ///////////////////////////////////////

    return core;

}