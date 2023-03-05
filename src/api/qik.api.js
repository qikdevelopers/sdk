import axios from 'axios';
import qs from 'qs';
import { version } from '../version.js';

import {
    cacheAdapterEnhancer,
    throttleAdapterEnhancer,
    Cache,
} from 'axios-extensions';


function isString(value) {
    const type = typeof value
    return type === 'string' || (type === 'object' && value != null && !Array.isArray(value) && getTag(value) == '[object String]')
}


/**
 * Creates a new instance of Axios, with automatic authentication and token refreshing functionality.
 * This module provides all the underlying functions for making http requests and interacting with the REST API.
 * It is a wrapper around the axios library, a popular promise based javascript request package. The api module is used by most other modules in the SDK and will handle authentication, token refreshing and other headers automatically.
 * @alias api
 * @constructor
 * @hideconstructor
 * @param {QikAPI} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */


const CancelToken = axios.CancelToken;

///////////////////////////////////////



var QikAPI = function(qik) {

    var defaultCache;

    if (typeof window !== 'undefined') {
        defaultCache = qik.cache.get('api');
    }

    const defaultAdapter = axios.defaults.adapter

    /////////////////////////////////////////////////////

    function getRequestCacheKey(config) {
        var key = [
            config.method,
            config.url,
            config.headers?.Authorization,
            config.headers.Accept,
            JSON.stringify({
                params: config.params,
                data: config.data,
            }),

        ].filter(Boolean).join('-')

        return key;
    }

    ///////////////////////////////////////

    const inflightRequests = {};

    let cacheAdapter = function(config) {

        var cacheKey = getRequestCacheKey(config);

        // If there is already an identical request being made 
        if (!inflightRequests[cacheKey]) {

            // Be more efficient and wait for the existing request
            inflightRequests[cacheKey] = new Promise(function(resolve, reject) {
                var useCache;
                var cachedResponse;

                ///////////////////////////////////////

                switch (String(config.method).toLowerCase()) {
                    case 'post':
                    case 'patch':
                    case 'put':
                    case 'delete':
                        //Unless we've specified we want a cache
                        if (!config.cache) {
                            //Don't use the cache
                            config.cache = false;
                        }
                        break;
                }

                ///////////////////////////////////////

                if (config.cache === false) {
                    //No cache so make new request
                } else {

                    //Use the cache specified or the default cache
                    useCache = config.cache || defaultCache;

                    //If there is a cache
                    if (useCache) {
                        //If we have the cachedResponse version
                        cachedResponse = useCache.get(cacheKey);
                    }
                }

                ///////////////////////////////////////

                if (cachedResponse) {
                    return resolve(cachedResponse);
                }

                var copy = Object.assign(config, { adapter: defaultAdapter });

                return axios.request(config)
                    .then(function(res) {

                        delete inflightRequests[cacheKey];
                        resolve(res);
                    }, function(err) {

                        delete inflightRequests[cacheKey];
                        reject(err);
                    });

            })

        }
        return inflightRequests[cacheKey];
    }




    //////////////////////////////////////////////////////////////////////////////

    const service = createNewAxios(cacheAdapter);

    //////////////////////////////////////////////////////////////////////////////

    /**
     * 
     * Generate an Endpoint URL, complete with authentication.
     * this function is helpful for generating authenticated links for the user to open in another window
     * @alias api.generateEndpointURL
     * @param  {String} endpoint The endpoint to generate a url for
     * @param  {Object} params Extra parameters for the url
     * @param  {Object} options Additional request configuration
     * @param  {Object} options.withoutToken Don't append the current user's access token to the url
     * @param  {Object} options.file Whether the response for this request is expected to be a binary file type
     * @example
     * 
     * 
     * const result = sdk.api.generateEndpointURL('/image/61eca4746971e75c1fc670cf', {
     *     w:100,
     *     h:50,
     *     }, {file:true})
     *
     * // Would return something similar to:
     * // https://api.qik.dev/image/61eca4746971e75c1fc670cf?w=100&h=50&access_token=XXXX...
     */
    service.generateEndpointURL = function(endpoint, params, options) {
        options = options || {}
        params = params || {};

        var token;
        const apiURL = options.file ? qik.fileAPI || qik.apiURL : qik.apiURL;

        //Append the access token to the url
        if (!options.withoutToken) {
            delete params.access_token;
            token = qik.auth.getCurrentToken();
        }

        var stripLeadingTag = endpoint[0] == '/' ? endpoint.slice(1) : endpoint;
        var parameterString = qik.utils.mapParameters(params);

        if (token) {
            parameterString = parameterString ? `?access_token=${token}&${parameterString}` : `?access_token=${token}`;
        } else {
            parameterString = parameterString ? `?${parameterString}` : '';
        }

        var url = `${apiURL}${endpoint}${parameterString}`

        return url;
    }

    //////////////////////////////////////////////////////////////////////////////

    service.wasCancelled = function(err) {
        return axios.isCancel(err);
    }

    //////////////////////////////////////////////////////////////////////////////


    /**
     * 
     * Make a GET request to the API
     * @alias api.get
     * @param  {Object} endpoint The endpoint to request
     * @param  {Object} options The options to pass to axios for making the request
     * @example
     * 
     * const result = await sdk.api.get('/user');
     */
    var f = function() {}

    /**
     * 
     * 
     * @alias api.post
     * @description Make a POST request to the API
     * @param  {Object} endpoint The endpoint to request
     * @param  {Object} body The post body to send with the request
     * @param  {Object} options The options to pass to axios for making the request
     * @example
     * 
     * const result = await sdk.api.post('/login', {username:'', password:''});
     */
    var f = function() {}

    /**
     * 
     * Make a PUT request to the API
     * @alias api.put
     * @param  {Object} endpoint The endpoint to request
     * @param  {Object} body The post body to send with the request
     * @param  {Object} options The options to pass to axios for making the request
     * @example
     * 
     * const result = await sdk.api.put('/content/61eca4746971e75c1fc670cf', {title:'A new title'});
     */
    var f = function() {}

    /**
     * 
     * Make a PATCH request to the API
     * @alias api.patch
     * @param  {Object} endpoint The endpoint to request
     * @param  {Object} body The post body to send with the request
     * @param  {Object} options The options to pass to axios for making the request
     * @example
     * 
     * const result = await sdk.api.patch('/content/61eca4746971e75c1fc670cf', {title:'A new title'});
     */
    var f = function() {}

    /**
     * 
     * Make a DELETE request to the API
     * @alias api.delete
     * @param  {Object} endpoint The endpoint to request
     * @param  {Object} body The post body to send with the request
     * @param  {Object} options The options to pass to axios for making the request
     * @example
     * 
     * const result = await sdk.api.delete('/content/61eca4746971e75c1fc670cf');
     */
    var f = function() {}




    function createNewAxios(adapter) {

        var instance = axios.create({
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
            adapter,
        });

        ///////////////////////////////////////

        instance.defaults.baseURL = qik.apiURL;
        instance.defaults.headers.common.Accept = 'application/json';

        /////////////////////////////////////////////////////

        // Add relative date and timezone to every request
        instance.interceptors.request.use(function(config) {

            const inflightKey = getRequestCacheKey(config);

            if (config.withoutToken) {
                return config;
            }

            config.headers['qik-request-date'] = new Date().getTime();
            if (Intl) {
                config.headers['qik-request-timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
            }

            config.headers['qik-api-version'] = version;


            var token = qik.auth.getCurrentToken();

            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;

                if (config.params && config.params.access_token) {
                    delete config.params.access_token;
                }
            }

            return config;
        });

        /////////////////////////////////////////////////////

        let retryCount = 0;

        instance.interceptors.response.use(function(response) {
            var config = response.config

            //Get the response status
            var status = err?.response?.status || err.status;
            switch (status) {
                case 204:
                    console.log('retry 204')
                    // No content give it another try
                    if (retryCount < 5) {
                        retryCount++;
                        // Wait a second and try again
                        return new Promise(function(resolve, reject) {
                            setTimeout(function() {
                                return instance.request(config).then(resolve, reject);
                            }, 800);
                        })
                    } else {
                        console.log('Failed after 5 retries')
                        retryCount = 0;
                    }
                    break;
            }

            return response;
        }, function(err) {

            if (axios.isCancel(err)) {
                return Promise.reject(err);
            }

            //Get the response status
            var status = err?.response?.status || err.status;

            //Check the status
            switch (status) {
                case 401:
                    //Ignore let QikAuth handle it
                    break;

                case 502:
                case 504:

                    if (retryCount < 5) {
                        retryCount++;
                        // Wait a second and try again
                        return new Promise(function(resolve, reject) {
                            setTimeout(function() {
                                return instance.request(err.config).then(resolve, reject);
                            }, 800);
                        })
                    } else {
                        console.log('Failed after 5 retries')
                        retryCount = 0;
                    }
                    break;
                case 404:
                    //Not found
                    break;
                default:
                    //Some other error, likely a problem connecting to the server
                    // console.log('qik.api > connection error', status, err);
                    break;
            }

            /////////////////////////////////////////////////////

            return Promise.reject(err);
        })

        return instance;
    }

    /////////////////////////////////////////////////////

    function retrieveIDs(data) {

        var dataString;

        if (_isString(data)) {
            dataString = data;
        } else {
            dataString = JSON.stringify(data);
        }

        //Find all mongo ids included in the object
        var myregexp = /[0-9a-fA-F]{24}/g;
        var matches = dataString.match(myregexp);

        //Make sure the matches are unique
        return [...new Set(matches)];
    }

    ///////////////////////////////////////

    /**
     * 
     * Reference to the underlying axios package (https://www.npmjs.com/package/axios)
     * Useful for creating new instances of axios if you want to create http requests to
     * external APIs and not send tokens etc..
     * @name api.axios
     * @example
     * const newRequest = await sdk.api.axios.get('https://otherapi.com/content/61eca4746971e75c1fc670cf');
     */

    service.CancelToken = CancelToken;
    service.axios = axios;

    ///////////////////////////////////////

    return service;
}




///////////////////////////////////////
///////////////////////////////////////
///////////////////////////////////////

export { CancelToken as CancelToken };
export default QikAPI;