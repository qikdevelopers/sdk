import axios from 'axios';
import { EventDispatcher } from './qik.utils.js';

///////////////////////////////////////////////////

/**
 * Creates a new instance of QikAuth a module of the SDK
 * that contains all helper functions to do with authentication and user session management
 * @alias auth
 * @constructor
 * @hideconstructor
 * @param {QikAPI} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */

var QikAuth = function(qik) {

    if (!qik.api) {
        throw new Error(`Please ensure that QikAPI exists before QikAuth`);
    }

    //Keep track of any refresh requests
    var inflightRefreshRequest;

    ///////////////////////////////////////////////////

    var sessionStorage = {};
    var store = sessionStorage;
    const tokenBufferSeconds = 10;

    ///////////////////////////////////////////////////

    const service = {
        debug: false,
    }

    Object.defineProperty(service, 'store', {
        value: store,
        writable: false,
    });

    //Create a new dispatcher
    const dispatcher = new EventDispatcher();
    dispatcher.bootstrap(service);

    ///////////////////////////////////////////////////

    function dispatch(parameters) {

        //Get the current user
        var user = store.user;

        //Dispatch the change to the listeners
        if (service.onChange) {
            service.onChange(user);
        }

        //Dispatch the change event
        dispatcher.dispatch('change', user, parameters);
    }


    ///////////////////////////////////////////////////

    /**
     * @alias auth.set
     * @description Manually set current user session
     * @param  {Object} user The user session object to set as the current user session
     * @param  {Object} parameters Additional parameters to dispatch
     * @param  {Boolean} stopDispatch Whether to supress dispatching a 'change' event.
     * @example
     * 
     * const userSession = {_id:'61eca4746971e75c1fc670cf', firstName:'Daffy', lastName:'Duck' ...};
     * sdk.auth.set(userSession);
     */

    service.set = function(user, parameters, stopDispatch) {

        if (JSON.stringify(store.user) != JSON.stringify(user)) {
            store.user = user;
            if (!stopDispatch) {
                return dispatch(parameters)
            }
        }

    }


    ///////////////////////////////////////////////////

    /**
     * @alias auth.logout
     * @description Clear the current user session from memory and erase all caches
     * @example
     * sdk.auth.logout();
     */

    service.logout = function() {
        delete store.user;
        qik.cache.reset();
        return dispatch()
    }

    ///////////////////////////////////////////////////

    /**
     * @alias auth.changeOrganisation
     * @description Manually set current user session
     * @param  {(String|Object)} organisation The id of the organisation to switch into
     * @param  {Object} options Additional options
     * @param  {Boolean} options.disableAutoAuthentication By default when switching organisation, the current user session
     * will be updated to reflect a session in the new organisation, you can use this option to disable that behavior and instead return the 
     * user session without dispatching any events
     * @example
     *
     * sdk.auth.changeOrganisation('61eca4746971e75c1fc670cf');
     * // Current user session will be automatically updated
     *
     * const newSession = await sdk.auth.changeOrganisation('61eca4746971e75c1fc670cf', {disableAutoAuthentication:true});
     * // Current user session will not be updated
     * sdk.auth.set(newSession);
     */
    service.changeOrganisation = function(organisationID, options) {

        //Ensure we just have the ID
        organisationID = qik.utils.id(organisationID);

        //////////////////////////

        if (!options) {
            options = {};
        }

        //////////////////////////

        //Change the users current tokens straight away
        var autoAuthenticate = true;

        if (options.disableAutoAuthentication) {
            autoAuthenticate = false;
        }

        //////////////////////////

        return new Promise(function(resolve, reject) {


            qik.api.post(`/user/switch/${organisationID}`)
                .then(function(response) {

                    if (autoAuthenticate) {
                        qik.cache.reset();
                        service.set(response.data);
                    }

                    resolve(response.data);
                })
                .catch(reject)

        })
    }

    ///////////////////////////////////////////////////

    /**
     * @alias auth.impersonate
     * @description Impersonate another user within your organisation
     * @param  {(String|Object)} persona The id of the user persona you want to impersonate
     * @param  {Object} options Additional options
     * @param  {Boolean} options.disableAutoAuthentication By default when impersonating a user, the current user session
     * will be updated automatically to reflect the new session, you can use this option to disable that behavior and instead return the 
     * new impersonation user session without dispatching any events
     * @example
     *
     * sdk.auth.impersonate('61eca4746971e75c1fc670cf');
     * // Current user session will be automatically updated
     *
     * const newSession = await sdk.auth.impersonate('61eca4746971e75c1fc670cf', {disableAutoAuthentication:true});
     * // Current user session will not be updated
     * sdk.auth.set(newSession);
     */
    service.impersonate = function(personaID, options) {

        //Ensure we just have the ID
        personaID = qik.utils.id(personaID);

        //////////////////////////

        if (!options) {
            options = {};
        }

        //////////////////////////

        //Change the users current tokens straight away
        var autoAuthenticate = true;

        if (options.disableAutoAuthentication) {
            autoAuthenticate = false;
        }

        //////////////////////////

        var promise = qik.api.post(`/user/impersonate/${personaID}`)

        promise.then(function(res) {

            if (autoAuthenticate) {
                qik.cache.reset();
                service.set(res.data);
            }
        }, function(err) {});


        return promise;

    }

    ///////////////////////////////////////////////////

    /**
     * @alias auth.login
     * @description Login and authenticate as a user
     * @param  {Object} credentials The credentials used to login
     * @param  {String} credentials.email The email address to login to
     * @param  {String} credentials.password The password to login with
     * @param  {String} credentials.mfa The MFA (Multi Factor Authentication) code
     * @param  {Object} options Additional options
     * @param  {Boolean} options.disableAutoAuthentication By default when logging in the current user session
     * will be updated automatically to reflect the new session, you can use this option to disable that behavior and instead return the 
     * session that was logged in to without dispatching any events
     * @example
     *
     * const credentials = {
     *     email:'me@email.com', 
     *     password:'******',
     *     mfa:'1234',
     * }
     * 
     * sdk.auth.login(credentials);
     * // Current user session will be automatically updated
     *
     * const newSession = await sdk.auth.login(credentials, {disableAutoAuthentication:true});
     * // Current user session will not be updated
     * sdk.auth.set(newSession);
     */
    service.login = async function(credentials, options) {

        if (!options) {
            options = {};
        }

        //////////////////////////

        //Change the users current tokens straight away
        var autoAuthenticate = true;

        if (options.disableAutoAuthentication) {
            autoAuthenticate = false;
        }

        //////////////////////////////////////

        var promise = new Promise(loginCheck)

        function loginCheck(resolve, reject) {

            if (!credentials) {
                return reject({
                    message: 'Missing credentials!',
                })
            }

            if (!credentials.email || !credentials.email.length) {
                return reject({
                    message: 'Username was not provided',
                })
            }

            if (!credentials.password || !credentials.password.length) {
                return reject({
                    message: 'Password was not provided',
                })
            }

            /////////////////////////////////////////////

            var postOptions = {
                bypassInterceptor: true
            }

            /////////////////////////////////////////////

            var url = `${qik.apiURL}/user/login`;

            /////////////////////////////////////////////

            //If we have a specified url
            if (options.url) {
                url = options.url;
            }

            /////////////////////////////////////////////

            qik.api.post(url, credentials, postOptions).then(function(res) {

                if (autoAuthenticate) {
                    service.set(res.data);

                }

                resolve(res);
            }, reject);
        }

        //////////////////////////////////////

        return promise;

    }

    ///////////////////////////////////////////////////

    service.signup = async function(credentials, options) {

        if (!options) {
            options = {};
        }


        //////////////////////////

        //Change the users current tokens straight away
        var autoAuthenticate = true;

        if (options.disableAutoAuthentication) {
            autoAuthenticate = false;
        }

        //////////////////////////////////////

        var promise = new Promise(signupCheck)

        function signupCheck(resolve, reject) {

            if (!credentials) {
                return reject({
                    message: 'No details provided',
                })
            }

            if (!credentials.firstName || !credentials.firstName.length) {
                return reject({
                    message: 'First Name was not provided',
                })
            }

            if (!credentials.lastName || !credentials.lastName.length) {
                return reject({
                    message: 'Last Name was not provided',
                })
            }

            if (!credentials.email || !credentials.email.length) {
                return reject({
                    message: 'Email/Username was not provided',
                })
            }


            if (!credentials.password || !credentials.password.length) {
                return reject({
                    message: 'Password was not provided',
                })
            }

            if (!credentials.confirmPassword || !credentials.confirmPassword.length) {
                return reject({
                    message: 'Confirm Password was not provided',
                })
            }

            if (credentials.confirmPassword != credentials.password) {
                return reject({
                    message: 'Your passwords do not match',
                })
            }

            /////////////////////////////////////////////

            var postOptions = {
                bypassInterceptor: true
            }

            /////////////////////////////////////////////

            var url = `${qik.apiURL}/user/signup`;

            /////////////////////////////////////////////

            //If we are authenticating as an application
            if (options.application) {

                //The url is relative to the domain
                url = `${qik.domain || ''}/qik/application/signup`;
            }

            //If we have a specified url
            if (options.url) {
                url = options.url;
            }

            /////////////////////////////////////////////

            qik.api.post(url, credentials, postOptions).then(function(res) {

                if (autoAuthenticate) {
                    service.set(res.data);
                }

                resolve(res);
            }, reject);
        }

        //////////////////////////////////////

        return promise;

    }


    ///////////////////////////////////////////////////

    /**
     * @alias auth.retrieveUserFromResetToken
     * @description Retrieve user session through use of a valid reset token, 
     * Reset tokens are short lived tokens that can be generated when a user has forgotten their password or their
     * password has been reset by an administrator
     * @param  {String} resetToken The token to use to authenticate
     * @param  {Object} options Additional options for the request
     * @example
     *
     * const resetToken = 'XXX-324623-$$...';
     *
     * // Retrieve the user session by providing a reset token
     * const user = await sdk.auth.retrieveUserFromResetToken(resetToken);
     */
    service.retrieveUserFromResetToken = async function(resetToken, options) {

        if (!options) {
            options = {};
        }

        var postOptions = {
                bypassInterceptor: true
            }

        return new Promise(function(resolve, reject) {
            qik.api.get(options.url || `${qik.apiURL}/user/reset/${resetToken}`, postOptions).then(function(res) {
                return resolve(res.data);
            }, reject);
        });

    }

    ///////////////////////////////////////////////////

    /**
     * @alias auth.updateUserWithToken
     * @description Update a user's credentials through use of a reset token
     * @param  {String} resetToken The token to use to authenticate
     * @param  {Object} body Updates to be made to the user
     * @param  {Object} options Additional options for the request
     * @param  {Boolean} options.disableAutoAuthentication By default the current user session
     * will be updated automatically to reflect the new updated session, you can use this option to disable that behavior 
     * and instead return the result without dispatching any events
     * @example
     *
     * const resetToken = 'XXX-324623-$$...';
     *
     * // Retrieve the user session by providing a reset token
     * const user = await sdk.auth.retrieveUserFromResetToken(resetToken);
     */
    service.updateUserWithToken = async function(resetToken, body, options) {

        if (!options) {
            options = {};
        }

        //////////////////////////

        //Change the users current tokens straight away
        var autoAuthenticate = true;

        if (options.disableAutoAuthentication) {
            autoAuthenticate = false;
        }

        //////////////////////////////////////

        return new Promise(function(resolve, reject) {

            var postOptions = {
                bypassInterceptor: true
            }

            qik.api.post(options.url || `${qik.apiURL}/user/reset/${resetToken}`, body, postOptions)
            .then(function(res) {

                //If we should automatically authenticate
                //once the request is successful
                //Then clear caches and update the session
                if (autoAuthenticate) {
                    qik.cache.reset();
                    service.set(res.data);
                }

                return resolve(res.data);
            }, reject);
        });

    }

    /**
     * @alias auth.sendResetPasswordRequest
     * @description This function allows a reset token to be generated and emailed to the requesting user
     * allowing them to modify their user details
     * @param  {Object} body Details for the reset request
     * @param  {String} body.email The email of the user to generate a token for
     * @example
     *
     * const resetToken = 'XXX-324623-$$...';
     *
     * // Retrieve the user session by providing a reset token
     * const user = await sdk.auth.retrieveUserFromResetToken(resetToken);
     */
    service.sendResetPasswordRequest = function(details, options) {

        if (!options) {
            options = {};
        }

        if (!details) {
            return Promise.reject({
                message: 'No details were provided for password reset request',
            })
        }

        if (!details.email || !details.email.length) {
            return Promise.reject({
                message: 'Email is required but was not provided',
            })
        }

        return new Promise(function(resolve, reject) {

            var postOptions = {
                bypassInterceptor: true
            }

            qik.api.post(options.url || `${qik.apiURL}/user/forgot`, details, postOptions).then(resolve, reject);
        })
    }


    ///////////////////////////////////////////////////

    /**
     * @alias auth.ensureValidToken
     * @description This function forces a check to ensure that the current access token has not expired.
     * If the token has expired, the user session will be refreshed with a new token.
     * @param  {Boolean} forceRefresh Whether to force the current token to be refreshed, even if it has not yet expired.
     * @example
     *
     * // Check to ensure that the current access token is valid
     * sdk.auth.ensureValidToken();
     *
     * // Force the token to be refreshed, even if the current token in use has not yet expired.
     * sdk.auth.ensureValidToken(true);
     */
    service.ensureValidToken = async function(forceRefresh) {

        var currentUser = service.getCurrentUser();
        if (!currentUser) {

            return Promise.reject('No user');
        }

        var { token } = currentUser;
        if (!token) {

            return Promise.reject('No token');
        }

        /////////////////////////////////////////////////////

        //Check our date
        var now = new Date();

        //Give us a bit of buffer so that the backend doesn't beat us to
        //retiring the token
        now.setSeconds(now.getSeconds() + tokenBufferSeconds);

        /////////////////////////////////////////////////////

        var expires = new Date(token.expires);

        if (forceRefresh) {
            console.log('force refresh valid token', token.refreshToken)
            return await service.refreshAccessToken(token.refreshToken);
        }

        //If the token is still fresh
        if (now < expires) {

            return token;
        } else {

            return await service.refreshAccessToken(token.refreshToken);
        }


    }

    ///////////////////////////////////////////////////

    const refreshContext = {};

    service.refreshAccessToken = async function(refreshToken) {

        // /////////////////////////////////////////////

        // if (appContext) {

        // } else {

        // }

        // /////////////////////////////////////////////

        //If there is already a request in progress
        if (refreshContext.inflightRefreshRequest) {

            return refreshContext.inflightRefreshRequest;
        }

        /////////////////////////////////////////////////////

        //Create an refresh request

        refreshContext.inflightRefreshRequest = new Promise(function(resolve, reject) {

            //Bypass the interceptor on all token refresh calls
            //Because we don't need to add the access token etc onto it

            qik.api.post(`/user/refresh`, {
                    refreshToken: refreshToken
                }, {
                    bypassInterceptor: true,
                    withoutToken: true,
                })
                .then(function tokenRefreshComplete(res) {

                    //Update the user with any changes 
                    //returned back from the refresh request
                    if (!res) {

                        refreshContext.inflightRefreshRequest = null;
                        return reject();

                    } else {
                        //Update with our new session
                        service.set(res.data);


                        dispatch();
                    }

                    //Resolve with the new token
                    resolve(res.data.token);

                    //Remove the inflight request
                    setTimeout(function() {
                        refreshContext.inflightRefreshRequest = null;
                    })


                })
                .catch(function(err) {


                    //TODO Check if invalid_refresh_token



                    setTimeout(function() {
                        refreshContext.inflightRefreshRequest = null;
                    });
                    reject(err);



                });
        });

        //Return the refresh request
        return refreshContext.inflightRefreshRequest;
    }

    ///////////////////////////////////////////////////

    var retryCount = 0;

    /**
     * @alias auth.sync
     * @description A useful function to sync the current user session with the server.
     * @example
     *
     * // Makes request to the API and updates the current user session to match the response
     * sdk.auth.sync();
     */
    service.sync = function() {

        return qik.api.get('/user')
            .then(function(res) {


                if (res.data) {
                    if (store.user) {
                        Object.assign(store.user.session, res.data);
                    }
                } else {
                    service.set(null);
                }


                retryCount = 0;

                dispatch();
            })
            .catch(function(err) {

                // if (retryCount > 2) {
                service.set(null);
                retryCount = 0;
                dispatch();
                // } else {

                // retryCount++;
                // service.sync();
                // }


            });
    }

    /////////////////////////////////////////////////////

    /**
     * @alias auth.getCurrentUser
     * @description Retrieves the current user session
     * @example
     *
     * const me = sdk.auth.getCurrentUser();
     */
    service.getCurrentUser = function() {
        return store.user;
    }


    /**
     * @alias auth.getCurrentToken
     * @description Retrieves the current access token. If the user is authenticated
     * the response will be the current user's access token, otherwise will fall back to the 
     * applications token.
     * @example
     * const currentAccessToken = sdk.auth.getCurrentToken();
     */
    service.getCurrentToken = function() {


        var user = service.getCurrentUser();

        //User is not logged in
        if (!user) {

            //But there is an application token
            if (qik.applicationToken) {
                //use that instead
                return qik.applicationToken;
            }

            //No token
            return;
        }

        var { token } = user;
        if (!token) {
            return;
        }

        return token.accessToken;

    }

    /////////////////////////////////////////////////////

    qik.api.interceptors.request.use(async function(config) {

            //If we want to bypass the interceptor
            //then just return the request
            if (config.bypassInterceptor) {
                return config;
            }

            //////////////////////////////

            //Get the original request
            var originalRequest = config;

            //////////////////////////////

            var userDetails = await service.getCurrentUser();
            var accessToken;
            var refreshToken;
            var expiryDate;

            if (userDetails) {
                var { token } = userDetails;
                if (token) {
                    accessToken = token.accessToken;
                    refreshToken = token.refreshToken;
                    expiryDate = token.expires;
                }
            }

            //////////////////////////////

            //If there is a user token
            if (accessToken) {
                //Set the token of the request as the user's access token
                originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;


            } else {
                //Return the original request without a token

                return originalRequest;
            }

            /////////////////////////////////////////////////////

            //If no refresh token
            if (!refreshToken) {


                //Continue with the original request
                return originalRequest;
            }

            /////////////////////////////////////////////////////

            //We have a refresh token so we need to check
            //whether our access token is stale and needs to be refreshed
            var now = new Date();

            //Give us a bit of buffer so that the backend doesn't beat us to
            //retiring the token
            now.setSeconds(now.getSeconds() + tokenBufferSeconds);

            /////////////////////////////////////////////////////

            var expires = new Date(expiryDate);

            //If the token is still fresh
            if (now < expires) {
                //Return the original request
                return originalRequest;
            }

            /////////////////////////////////////////////////////

            return new Promise(async function(resolve, reject) {

                //Refresh the token
                await service.refreshAccessToken(refreshToken)
                    .then(function(newToken) {

                        //Update the original request with our new token
                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                        //And continue onward
                        return resolve(originalRequest);
                    })
                    .catch(function(err) {

                        return reject(err);
                    });
            });


        },
        function(error) {
            return Promise.reject(error);
        })



    /////////////////////////////////////////////////////

    qik.api.interceptors.response.use(function(response) {
        return response;
    }, function(err) {

        //////////////////////////////

        //Get the response status
        var status = (err && err.response && err.response.status) || err.status;


        switch (status) {
            case 401:
                service.logout();
                break;
            default:
                //Some other error
                break;
        }

        /////////////////////////////////////////////////////

        return Promise.reject(err);
    })

    return service;

}


export default QikAuth;