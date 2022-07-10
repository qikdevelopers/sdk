import axios from 'axios';
import { EventDispatcher } from './qik.utils.js';

///////////////////////////////////////////////////

/**
 * Creates a new QikAuth instance.
 * This module provides a number of helper functions for authentication, logging in, signing up, generating and refreshing tokens
 * @alias auth
 * @constructor
 * @hideconstructor
 * @param {QikCore} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */
var QikAuth = function(qik) {

    if (!qik.api) {
        throw new Error(`Can't Instantiate QikAuth before QikAPI exists`);
    }

    //Keep track of any refresh requests
    var inflightRefreshRequest;

    ///////////////////////////////////////////////////

    var defaultStore = {};
    var store = defaultStore;
    const tokenBufferSeconds = 10;

    ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////

    var service = {
        debug: false,
    }

    Object.defineProperty(service, 'store', {
        value: store,
        writable: false,
    });


    //Create a new dispatcher
    var dispatcher = new EventDispatcher();
    dispatcher.bootstrap(service);


    ///////////////////////////////////////////////////
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
     * 
     * Sets the current user data, often from localStorage or after new session data
     * has been generated from the server after signing in
     * @alias auth.set
     * @param  {Object} user The user session object
     * @example
     * QikAsset.set({firstName:'Jeff', lastName:'Andrews', ...})
     */

    service.set = function(user, parameters, ignoreEvent) {

        store.user = user;

        
        return dispatch(parameters)
    }


    ///////////////////////////////////////////////////

    /**
     * 
     * Deletes the user session object, clears all Qik caches and tokens
     * from memory
     * @alias auth.logout
     * @example
     * qik.auth.logout()
     */

    service.logout = function() {
        //Unauthenticated
        // delete store.token;

        delete store.user;
        qik.cache.reset();
        // delete store.refreshToken;
        // delete store.expires;



        


        if (qik.withCredentials) {

            //Logout of the current application
            window.location.href = '/qik/logout';


        }


        // if(window && window.localStorage) {
        //    window.localStorage.removeItem('qik.user');
        // }

        return dispatch()

    }

    ///////////////////////////////////////////////////

    /**
     * 
     * Retrieves a new session object for a Qik global user for a specified organisation
     * This will only work if the user has a persona in that organisation
     * @alias auth.changeOrganisation
     * @param  {String} organisationID The _id of the organisation you wish to log in to
     * @param  {Object} options      
     * @param  {Object} options.disableAutoAuthentication By default this function will set the current user session 
     * to organisation you are changing in to. 
     * If you want to generate the session without affecting your current session you can set disableAutoAuthentication to true    
     * @return {Promise} Resolves to the user session object, or rejects with the responding error
     * @example
     * qik.auth.changeOrganisation('5be504eabf33991239599d63').then(function(userSession) {
     *     //New user session will be set automatically
     *     var newUserSession = qik.auth.getCurrentUser();
     * })
     * qik.auth.changeOrganisation('5be504eabf33991239599d63', {disableAutoAuthentication:true}).then(function(userSession) {
     *     //Set the session manually
     *     qik.auth.set(userSession)
     * })
     */

    service.changeOrganisation = function(organisationID, options) {

        //Ensure we just have the ID
        organisationID = qik.utils.getStringID(organisationID);

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

        var promise = qik.api.post(`/user/switch/${organisationID}`)

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
     * 
     * Impersonates a persona and sets the current session to match the specified persona's context
     * @alias auth.impersonate
     * @param  {String} personaID The _id of the persona you wish to impersonate
     * @param  {Object} options      
     * @return {Promise} Resolves to the user session object, or rejects with the responding error
     * @example
     * qik.auth.impersonate('5be504eabf33991239599d63')
     * .then(function(userSession) {
     *     //New user session will be set automatically
     *     var newUserSession = qik.auth.getCurrentUser();
     * })
     */

    service.impersonate = function(personaID, options) {

        //Ensure we just have the ID
        personaID = qik.utils.getStringID(personaID);

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
     * Logs the user in to Qik and returns a new user session
     * @alias auth.login
     * @param  {Object} credentials 
     * @param  {String} credentials.email The email address of the user to login as
     * @param  {String} credentials.password The password for the user
     * @param  {Object} options     Extra options and configuration for the request
     * @param  {Object} options.disableAutoAuthentication Disable automatic authentication, if true, will not set the current user session
     * @return {Promise}             Returns a promise that either resolves with the logged in user session, or rejects with the responding error from the server
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
                    store.user = res.data;
                    
                    dispatch();
                    // if (service.onChange) {
                    //     service.onChange(store.user);
                    // }
                }

                resolve(res);
            }, reject);
        }

        //////////////////////////////////////

        return promise;

    }

    ///////////////////////////////////////////////////

    /**
     * Signs up a new user to the current application, this will create a new managed user persona
     * and automatically log in as that persona in the current application context. This function will
     * only work when called in context of an application with the 'Application Token' authentication style.
     * It will create a new user persona in the organisation of the application and return a session with all of the application's
     * permissions and application's logged in user permissions
     * @alias auth.signup      
     * @param  {Object} credentials
     * @param  {String} credentials.firstName The first name for the new user persona
     * @param  {String} credentials.lastName The last name for the new user persona
     * @param  {String} credentials.email The email address for the new persona
     * @param  {String} credentials.password The password to set for the new persona
     * @param  {String} credentials.confirmPassword A double check to confirm the new password for the persona
     * @param  {Object} options     Extra options and configuration for the request
     * @return {Promise}            Returns a promise that either resolves to the new authenticated session, or rejects with the responding error from the server
     */
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
                    store.user = res.data;
                    dispatch();
                }

                resolve(res);
            }, reject);
        }

        //////////////////////////////////////

        return promise;

    }


    ///////////////////////////////////////////////////

    /**
     * Retrieves a user's details by providing a password reset token 
     * @alias auth.retrieveUserFromResetToken      
     * @param  {String} token The password reset token that was sent to the user's email address
     * @param  {Object} options other options for the request
     * @param  {Boolean} options.application     If true will retrieve in the context of a managed persona in the same organisation as the current application.
     * If not specified or false, will assume it's a Qik global user that is resetting their password.
     * @return {Promise}            Returns a promise that resolves with the reset session details
     */
    service.retrieveUserFromResetToken = async function(resetToken, options) {

        if (!options) {
            options = {};
        }

        //////////////////////////////////////

        return new Promise(function(resolve, reject) {

            var postOptions = {
                bypassInterceptor: true
            }

            /////////////////////////////////////////////

            //If a full fledged Qik User
            //then send directly to the API auth endpoint
            var url = `${qik.apiURL}/user/reset/${resetToken}`;

            /////////////////////////////////////////////

            //If we have a specified url
            if (options.url) {
                url = options.url;
            }

            /////////////////////////////////////////////

            qik.api.get(url, postOptions).then(function(res) {
                return resolve(res.data);
            }, reject);
        });

    }


    ///////////////////////////////////////////////////

    /**
     * Updates a user's details including password by providing a password reset token
     * @alias auth.updateUserWithToken      
     * @param  {String} token The password reset token that was sent to the user's email address
     * @param  {Object} body The details to change for the user
     * @param  {Object} options other options for the request
     * @return {Promise}            Returns a promise that resolves with the reset session details
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

            /////////////////////////////////////////////

            //If a full fledged Qik User
            //then send directly to the API auth endpoint
            var url = `${qik.apiURL}/user/reset/${resetToken}`;

            /////////////////////////////////////////////

            //If we have a specified url
            if (options.url) {
                url = options.url;
            }

            /////////////////////////////////////////////

            qik.api.post(url, body, postOptions).then(function(res) {

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


    ///////////////////////////////////////////////////

    /**
     * Triggers a new Reset Password email request to the specified user. 
     * @alias auth.sendResetPasswordRequest      
     * @param  {Object} body
     * @param  {String} body.email The email address of the user to reset the password for
     * @param  {String} body.redirect If the request is in the context of a managed user persona authenticated with an application, then you need to provide the url to direct the user to when they click the reset password link
     * This is usually something like '/reset' for the current application, when the user clicks the link the reset token will be appended with ?token=RESET_TOKEN and your application should
     * be ready on that url to handle the token and allow the user to use the token to reset their password
     * @param  {Object} options     Extra options and configuration for the request
     * @param  {Boolean} options.application     If true will send a reset email from the context of a managed persona in the same organisation as the current application.
     * If not specified or false, will send a password reset request for a global Qik user organisation.
     * @return {Promise}            Returns a promise that either resolves if the password request was sent, or rejects if an error occurred
     */
    service.sendResetPasswordRequest = function(body, options) {

        if (!options) {
            options = {};
        }

        //////////////////////////////////////

        var promise = new Promise(signupCheck)

        function signupCheck(resolve, reject) {

            if (!body) {
                return reject({
                    message: 'No details provided',
                })
            }

            if (!body.email || !body.email.length) {
                return reject({
                    message: 'Email was not provided',
                })
            }

            //Set email as the email address
            body.email = body.email;

            /////////////////////////////////////////////

            var postOptions = {
                bypassInterceptor: true
            }

            /////////////////////////////////////////////

            //If a full fledged Qik User
            //then send directly to the API
            var url = `${qik.apiURL}/user/forgot`;

            /////////////////////////////////////////////

            //If we have a specified url
            if (options.url) {
                url = options.url;
            }

            /////////////////////////////////////////////

            qik.api.post(url, body, postOptions).then(resolve, reject);
        }

        //////////////////////////////////////

        return promise;
    }


    ///////////////////////////////////////////////////

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

            if(forceRefresh) {
                console.log('force refresh valid token')
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

    /**
     * Helper function to refresh an access token for an authenticated user session. This is usually handled automatically
     * from the QikAuth service itself
     * @alias auth.refreshAccessToken
     * @param  {String}  refreshToken  The refresh token to reactivate
     * @param  {Boolean} isManagedSession Whether or not the refresh token is for a managed persona session or a global Qik user session
     * @return {Promise}                A promise that either resolves with the refreshed token details or rejects with the responding error from the server
     */

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
                        store.user = res.data;
                        

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



    /**
     * Helper function to resync the user's session from the server. This is often used when first loading a webpage or app
     * just to see if the user's permissions have changed since the user first logged in
     * from the QikAuth service itself
     * @alias auth.sync
     * @return {Promise}    A promise that either resolves with the user session 
     */

    var retryCount = 0;

    service.sync = function() {

        return qik.api.get('/user')
            .then(function(res) {


                if (res.data) {
                    if (store.user) {
                        Object.assign(store.user.session, res.data);
                    }
                } else {
                    store.user = null;
                }

                
                retryCount = 0;

                dispatch();
            })
            .catch(function(err) {

                // if (retryCount > 2) {
                store.user = null;
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
     * Returns the current user's session data
     * @alias auth.getCurrentUser
     * @return {Object} The current user session
     */
    service.getCurrentUser = function() {
        return store.user;
    }


    service.getCurrentToken = function() {


        var user = service.getCurrentUser();

        //User is not logged in
        if (!user) {

            //But there is an application token
            if(qik.applicationToken) {
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
            //////////////////////////////
            //////////////////////////////
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


    /**
     * @name auth.addEventListener
     * @description Adds a callback that will be triggered whenever the specified event occurs
     * @function
     * @param {String} event The event to listen for
     * @param {Function} callback The function to fire when this event is triggered
     * @example
     * //Listen for when the user session changes
     * qik.auth.addEventListener('change', function(userSession) {})
     */

    /**
     * @name auth.removeEventListener
     * @description Removes all a callback from the listener list
     * @function
     * @param {String} event The event to stop listening for
     * @param {Function} callback The function to remove from the listener list
     * @example
     * //Stop listening for the change event
     * qik.auth.removeEventListener('change', myFunction)
     */

    /**
     * @name auth.removeAllListeners
     * @description Removes all listening callbacks for all events
     * @function
     * @example
     * qik.auth.removeAllListeners()
     */

    return service;

}


export default QikAuth;