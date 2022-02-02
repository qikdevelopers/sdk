import _ from 'lodash';
import { EventDispatcher } from './qik.utils.js';


///////////////////////////////////////////////////////////////////////////////

/**
 * Creates a new QikAccess service
 * This module provides helpful functions and tools for managing and understanding a user's permissions and access control
 * 
 * @alias access
 * @constructor
 * @hideconstructor
 * @param {QikCore} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */
var QikAccess = function(QikCore) {


    if (!QikCore.auth) {
        throw new Error(`Can't Instantiate QikAccess before QikAccess has been initialized`);
    }

    //////////////////////////////////

    var store = {};
    var service = {};

    //Create a new dispatcher
    var dispatcher = new EventDispatcher();
    dispatcher.bootstrap(service);


    ///////////////////////////////////////////////////////////////////////////////

    /**
     * Check whether a user has a specific permission, useful for checking custom permissions
     * or simply whether or not a user has a permission in any realm
     * @param  {String}  permission The permission to check
     * @return {Boolean}            
     * @alias access.has  
     * @example
     *
     * //Returns true or false if the user has the permission 
     * var hasPermission = qik.access.has('create photo');
     */
    service.has = function(permission, webMode) {

        //Get the current acting user session
        var user = service.retrieveCurrentSession(webMode);

        if (!user) {
            return false;
        }

        if (service.isQikAdmin() && !webMode) {
            return true;
        }

        ///////////////////////////////////////////////////////////////////////////////

        var permissionSets = user.permissionSets;

        //Get all of the possible permissions
        var permissions = _.chain(permissionSets)
            .reduce(function(results, set, key) {

                results.push(set.permissions);

                return results;
            }, [])
            // .map(retrieveSubRealms)
            .flattenDeep()
            .compact()
            .uniq()
            .value();

        //Check if any of the users permissions include the one
        //we are looking for
        return _.includes(permissions, permission);
    }

    //////////////////////////////////

    return service;

}

///////////////////////////////////////////////////////////////////////////////



export default QikAccess;