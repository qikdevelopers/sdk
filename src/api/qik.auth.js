import axios from 'axios';
import { EventDispatcher } from './qik.utils.js';

///////////////////////////////////////////////////

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

    service.set = function(user, parameters, ignoreEvent) {

        store.user = user;
        return dispatch(parameters)
    }


    ///////////////////////////////////////////////////

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

            //If a full fledged user
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

    return service;

}


export default QikAuth;