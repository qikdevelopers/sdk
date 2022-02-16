import axios from 'axios';
import _ from 'lodash';
import qs from 'qs';
import { version } from '../version.js';




import {
    cacheAdapterEnhancer,
    throttleAdapterEnhancer,
    Cache,
} from 'axios-extensions';


const CancelToken = axios.CancelToken;

///////////////////////////////////////


/**
 * Creates a new QikAPI instance.
 * This module is a wrapper around the <a href="https://www.npmjs.com/package/axios">axios</a> package. It aims to make it easier for you to connect with and consume endpoints from the Qik REST API for more information about the available endpoints see <a href="https://developer.qik.io">Qik REST API Documentation</a>
 * @alias api
 * @constructor
 * @param {QikCore} qik A reference to the parent instance of the QikCore module. The QikAPI module is usually created by a QikCore instance that passes itself in as the first argument.
 */


var QikAPI = function(qik) {

    ///////////////////////////////////////

    // //Cache Defaults
    // var FIVE_MINUTES = 1000 * 60 * 5;
    // var CAPACITY = 100;
    // { maxAge: FIVE_MINUTES, max: 100 }


    /**
     * The default cache to use when requests are made from this instance
     * @type {LRUCache}
     * @access private
     */
    var defaultCache;

    if (typeof window !== 'undefined') {
        defaultCache = qik.cache.get('api');
    }

    ///////////////////////////////////////

    //Get the default adapter
    const defaultAdapter = axios.defaults.adapter
    // console.log('DEFAULT ADAPTER', defaultAdapter)

    /////////////////////////////////////////////////////

    function getRequestCacheKey(config) {

        var key = _.compact([
            config.method,
            config.url,
            JSON.stringify({ user: qik.auth.getCurrentUser(), params: config.params, data: config.data }),
        ]).join('-')

        return key;
    }

    ///////////////////////////////////////

    //Add our own adapter to the service
    let cacheAdapter = function(config) {

        return new Promise(function(resolve, reject) {


            var useCache;
            var cachedResponse;

            ///////////////////////////////////////

            //Don't cache action methods
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
            ///////////////////////////////////////

            if (config.cache === false) {
                //No cache so make new request
            } else {

                //Use the cache specified or the default cache
                useCache = config.cache || defaultCache;

                //If there is a cache
                if (useCache) {

                    //Generate the cache key from the request
                    var cacheKey = getRequestCacheKey(config);

                    //If we have the cachedResponse version
                    cachedResponse = useCache.get(cacheKey);
                }
            }

            ///////////////////////////////////////
            ///////////////////////////////////////

            if (cachedResponse) {
                // console.log('FROM CACHE', config.url, cachedResponse);
                return resolve(cachedResponse);
            }



            // const axiosWithoutAdapter = createNewAxios();


            var copy = Object.assign(config, { adapter: defaultAdapter });


            // console.log('NEW ADAPTER THING', copy)
            // const axiosWithoutAdapter = axios(copy);


            return axios.request(config)
                .then(function(res) {

                    // console.log('RESPONSE', res)
                    resolve(res);
                }, function(err) {

                    // console.log('ERROR', err)
                    reject(err);
                });

        })
    }




    //////////////////////////////////////////////////////////////////////////////

    const service = createNewAxios(cacheAdapter);

    //////////////////////////////////////////////////////////////////////////////

    function createNewAxios(adapter) {

        var instance = axios.create({
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
            adapter,
            // adapter: throttleAdapterEnhancer(cacheAdapterEnhancer(axios.defaults.adapter, { defaultCache: defaultCache }))
            // adapter: throttleAdapterEnhancer(cacheAdapterEnhancer(axios.defaults.adapter, { defaultCache: defaultCache }))
        });

        ///////////////////////////////////////

        instance.defaults.baseURL = qik.apiURL;
        instance.defaults.headers.common.Accept = 'application/json';

        /////////////////////////////////////////////////////

        // Add relative date and timezone to every request
        instance.interceptors.request.use(function(config) {

            if(config.withoutToken) {
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

        instance.interceptors.response.use(function(response) {
            var config = response.config
            return response;
        }, function(err) {

            if (axios.isCancel(err)) {
                return Promise.reject(err);
            }

            //Get the response status
            var status = _.get(err, 'response.status') || err.status;

            //Check the status
            switch (status) {
                case 401:
                    //Ignore let QikAuth handle it
                    break;
                case 502:
                case 504:
                    //Retry until it works
                    // console.log(`qik.api > ${status} connection error retrying`)
                    return instance.request(err.config);
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

    ///////////////////////////////////////


    /**
     * @name api.get
     * @description Makes a get http request to the Qik REST API
     * @function
     * @param {String} path The Qik API endpoint to request
     * @param {Object} config Optional parameters for the request
     * @example
     * //Make a request to get the current user session
     * qik.api.get('/content/article', {
     *   params:{
     *     select:'title created',
     *     limit:10,
     *     simple:true,
     *   }
     * })
     * .then(function (response) {
     *   console.log(response);
     * })
     * .catch(function (error) {
     *   console.log(error);
     * });
     */


    /**
     * @name api.post
     * @description Makes a post http request to the Qik REST API
     * @function
     * @param {String} path The Qik API endpoint to request
     * @param {Object} config Optional parameters for the request
     * @example
     * 
     * qik.api.post('/content/article', {title:'my new article', ...}, {
     *   //headers and other things
     * })
     * .then(function (response) {
     *   console.log(response);
     * })
     * .catch(function (error) {
     *   console.log(error);
     * });
     */

    /**
     * @name api.put
     * @description Makes a put http request to the Qik REST API
     * @function
     * @param {String} path The Qik API endpoint to request
     * @param {Object} config Optional parameters for the request
     * @example
     * 
     * qik.api.put('/content/article/5ca3d64dd2bb085eb9d450db', {title:'my new article', ...}, {
     *   //headers and other things
     * })
     * .then(function (response) {
     *   console.log(response);
     * })
     * .catch(function (error) {
     *   console.log(error);
     * });
     */

    /**
     * @name api.delete
     * @description Makes a delete http request to the Qik REST API
     * @function
     * @param {String} path The Qik API endpoint to request
     * @param {Object} config Optional parameters for the request
     * @example
     * 
     * qik.api.delete('/content/article/5ca3d64dd2bb085eb9d450db')
     * .then(function (response) {
     *   console.log(response);
     * })
     * .catch(function (error) {
     *   console.log(error);
     * });
     */



    ///////////////////////////////////////////////////

    /**
     * A helper function for generating an authenticated url for the current user
     * @param  {string} endpoint The id of the asset, or the asset object you want to download
     * @alias api.generateEndpointURL
     * @param  {object} params   
     * @return {string}          A full URL with relevant parameters included
     * @example
     * // returns 'https://api.qik.io/something?access_token=2352345...'
     * qik.api.generateEndpointURL('/something');
     */

    service.generateEndpointURL = function(path, params) {

        if (!path || !String(path).length) {
            return;
        }

        if (!params) {
            params = {};
        }

        var url = `${qik.apiURL}${path}`;

        ////////////////////////////////////////

        url = parameterDefaults(url, params);

        ////////////////////////////////////////

        //Map the parameters to a query string
        var queryParameters = qik.utils.mapParameters(params);

        if (queryParameters.length) {
            url += `?${queryParameters}`;
        }

        return url;

    }

    ///////////////////////////////////////////////////////

    function parameterDefaults(url, params) {

        //If we haven't requested without token
        if (!params.withoutToken) {
            //Get the current token from QikAuth
            var CurrentQikToken = qik.auth.getCurrentToken();


            //Check to see if we have a token and none has been explicity set
            if (!params['access_token'] && CurrentQikToken) {
                //Use the current token by default
                params['access_token'] = CurrentQikToken;
            }
        }

        return url;
    }


    /////////////////////////////////////////////////////

    //Get all mongo ids from a string
    function retrieveIDs(data) {

        var dataString;

        if (_.isString(data)) {
            dataString = data;
        } else {
            dataString = JSON.stringify(data);
        }

        //Find all mongo ids included in the object
        var myregexp = /[0-9a-fA-F]{24}/g;
        var matches = dataString.match(myregexp);

        //Make sure the matches are unique
        return _.uniq(matches);
    }

    ///////////////////////////////////////


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