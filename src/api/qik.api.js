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

var QikAPI = function(qik) {

    var defaultCache;

    if (typeof window !== 'undefined') {
        defaultCache = qik.cache.get('api');
    }

    const defaultAdapter = axios.defaults.adapter

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

    let cacheAdapter = function(config) {

        return new Promise(function(resolve, reject) {


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

                    //Generate the cache key from the request
                    var cacheKey = getRequestCacheKey(config);

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
                    resolve(res);
                }, function(err) {
                    reject(err);
                });

        })
    }




    //////////////////////////////////////////////////////////////////////////////

    const service = createNewAxios(cacheAdapter);

    //////////////////////////////////////////////////////////////////////////////

    service.generateEndpointURL = function(endpoint, params, options) {
        options = options || {}
        params = params || {};

        //Append the access token to the url
        if(!options.withoutToken) {
            params.access_token = qik.auth.getCurrentToken();
        }

        var stripLeadingTag = endpoint[0] == '/' ? endpoint.slice(1) : endpoint;
        var parameterString = qik.utils.mapParameters(params);
        parameterString = parameterString ? `?${parameterString}` : '';
        return `${qik.apiURL}${endpoint}${parameterString}`
    }

    //////////////////////////////////////////////////////////////////////////////

    service.wasCancelled = function(err) {
        return axios.isCancel(err);
    }

    //////////////////////////////////////////////////////////////////////////////

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

    /////////////////////////////////////////////////////

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