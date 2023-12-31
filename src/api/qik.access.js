


/**
 * Creates a new Access Module instance.
 * This module provides a number of helper functions for managing and understanding permissions of the current
 * application or user
 * @alias access
 * @constructor
 * @hideconstructor
 * @param {QikCore} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */

var QikAccess = function(QikCore) {

    if (!QikCore.auth) {
        throw new Error(`Can't Instantiate QikAccess before QikAccess has been initialized`);
    }

    if (!QikCore.utils) {
        throw new Error(`Can't Instantiate QikAccess before QikCore.utils has been initialized`);
    }

    //////////////////////////////////

    var service = {};

    ///////////////////////////////////////////////

    /**
     * @alias access.isAdministrator
     * @description Check if a user object is an administrator
     * @param  {Object} user The user session to check
     * @example
     * const userIsAnAdministrator = sdk.access.isAdministrator({firstName:'Jeffrey', lastName:'Winger', ...});
     */
    service.isAdministrator = function(user) {
        return user && user.userType == 'administrator';
    }

    ///////////////////////////////////////////////

    /**
     * @alias access.getAllDescendants
     * @description Get all children of a specified scope
     * @param  {Object} scope A scope object with child scopes
     * @example
     * const childScopes = sdk.access.getAllDescendants({title:'Global', children:[{title:'Australia', ...}, {title:'New Zealand', ...}]});
     */
    service.getAllDescendants = function(scope) {

        //Start by including the scope id
        var results = [];

        addScope(scope);

        function addScope(entry) {
            //Add this scope to the results
            var id = QikCore.utils.id(entry);
            results.push(id);

            (entry.children || []).forEach(function(child) {
                addScope(child);
            })
        }
        return results;


    }

    ///////////////////////////////////////////////

    /**
     * @alias access.hashPermissions
     * @description Get a lookup of all permissions a user has been granted
     * @param  {Object} user A user session object
     * @example
     * const permissions = sdk.access.hashPermissions({firstName:'Mighty', lastName:'Mouse', permissionSets:[...], ...});
     */
    service.hashPermissions = function(user) {

        var results = {};

        for (var key in (user.permissions || {})) {

            //Get the permission set
            var permissionSet = user.permissions[key];

            //Get all Scope ids from the permission set
            var allIDs = service.getAllDescendants(permissionSet);

            //For each permission defined in the set
            (permissionSet.permissions || []).forEach(function(permissionString) {
                //Include the top scope
                if (!results[permissionString]) {
                    results[permissionString] = []
                }
                results[permissionString] = [...new Set(results[permissionString].concat(allIDs))]
            });
        }

        ///////////////////////////////////////////////

        return results;

    }


    ///////////////////////////////////////////////

    /**
     * @alias access.allUserScopes
     * @description Return an array of ids of all scopes that a given user has been granted a permission in
     * @param  {Object} user A user session object
     * @example
     * const permissions = sdk.access.allUserScopes({firstName:'Mighty', lastName:'Mouse', permissionSets:[...], ...});
     *
     * // Would result in:
     * ['61eca4746971e75c1fc670cf', '61eca4746971e75c1fc670ca', '77eca4746971e75c1fc670cf'],
     */
    service.allUserScopes = function(user) {

        var collected = {};
        var permissions = user.permissions || {};

        ////////////////////////

        function pluckScope(scopeObject) {

            if (!scopeObject) {
                return;
            }

            var scopeID = QikCore.utils.id(scopeObject);
            if (!scopeID) {
                return;
            }

            //Add to the collection
            collected[scopeID] = 1;

            //If there are children, then recursively pluck the ids
            if (scopeObject.children && scopeObject.children.length) {
                scopeObject.children.forEach(function(scope) {
                    pluckScope(scope);
                })
            }
        }

        ////////////////////////

        for (var scopeID in permissions) {
            pluckScope(permissions[scopeID]);
        }

        ////////////////////////

        return Object.keys(collected);
    }

    ///////////////////////////////////////////////

    /**
     * @alias access.actionableScopes
     * @description Return an array of all scopes that a given user can perform a specified action in
     * @param  {Object} user A user session object
     * @param  {String} action The action
     * @param  {String} definition The defined type of item the action will be performed on
     * @param  {String} type The basic type of item the action will be performed on
     * @param  {Object} options Additional options and parameters
     * @example
     * const user = sdk.auth.getCurrentUser();
     * const canCreateInScopes = sdk.access.actionableScopes(user, 'create', 'car', 'article');
     * const canDeleteInScopes = sdk.access.actionableScopes(user, 'delete', 'profile');
     *
     * // Would result in something like:
     * ['61eca4746971e75c1fc670cf', '61eca4746971e75c1fc670ca', '77eca4746971e75c1fc670cf'],
     */
    service.actionableScopes = function(user, action, definition, type, options) {
        options = options || {}

        /////////////////////////

        var validScopes = [];

        if (user.userType == 'administrator') {
            validScopes = service.allUserScopes(user, options)
        } else {
            var permissionsLookup = service.hashPermissions(user);

            var checkTypeName = definition || type;
            if (!checkTypeName) {
                return validScopes;
            }

            var stringKey = `${checkTypeName}.${action}`;
            validScopes = permissionsLookup[stringKey]
        }

        /////////////////////////

        return validScopes || []
    }


    ///////////////////////////////////////////////

    /**
     * @alias access.isOwner
     * @description Return whether or not a user is considered an Owner of a specified item
     * @param  {Object} user The user to check
     * @param  {Object} item The item
     * @example
     * const user = sdk.auth.getCurrentUser();
     * const item = {title:'A piece of content', meta:{personaAuthor:'61eca4746971e75c1fc670ca'}, ...}
     *
     * // Returns true if the user owns the item
     * const isTheOwner = sdk.access.isOwner(user, item);
     */
    service.isOwner = function(user, item) {
        var userID = QikCore.utils.id(user);
        var personaID = QikCore.utils.id(user.persona);


        var metaObject = item.meta;
        if (!metaObject) {
            return false;
        }

        /////////////////////////////////////////////

        var userOwners = metaObject.userOwners || [];

        var users = QikCore.utils.ids([...userOwners, metaObject.userAuthor]);
        var userHash = QikCore.utils.hash(users);

        if (userHash[userID]) {
            return true;
        }

        /////////////////////////////////////////////

        var personaOwners = metaObject.personaOwners || [];

        var personas = QikCore.utils.ids([...personaOwners, metaObject.personaAuthor]);
        var personaHash = QikCore.utils.hash(personas);
        // console.log('PERSONAS', personas, personaHash, '-', metaObject.personaAuthor, metaObject.personaOwners)

        if (personaHash[personaID]) {
            return true;
        }

    }


    ///////////////////////////////////////////////

    /**
     * @alias access.allPermissions
     * @description Returns an array of all permissions a given user has access to
     * @param  {Object} user The user to check
     * @example
     * const user = sdk.auth.getCurrentUser();
     * const permissions =  sdk.access.allPermissions(user);
     *
     * // Returns
     * ['image.viewany', 'testimonial.viewany', 'testimonial.viewfield.title', ...]
     */
    service.allPermissions = function(user) {

        var allPermissions = Object.values(user.permissions)
            .map(function(permissionScope) {
                return permissionScope.permissions;
            })
            .flat();

        return allPermissions;
    }

    ///////////////////////////////////////////////

    /**
     * @alias access.allPermissionTypes
     * @description Returns an array of content types a given user has permission to interact with
     * @param  {Object} user The user to check
     * @param  {Boolean} asHash Whether to retrieve the result as a keyed object hash, by default
     * the response will be an array
     * @example
     * const user = sdk.auth.getCurrentUser();
     *
     * // Returns ['image', 'testimonial']
     * const types = sdk.access.allPermissionTypes(user);
     *
     * // Returns {image:true, testimonial:true}
     * const types = sdk.access.allPermissionTypes(user, true);
     */
    service.allPermissionTypes = function(user, asHash) {
        if (asHash) {
            return service.allPermissions(user).reduce(function(set, string) {
                var type = string.split('.')[0];
                set[type] = true;
                return set;
            }, {});
        } else {
            return service.allPermissions(user).map(function(string) {
                return string.split('.')[0];
            });
        }

    }

    ///////////////////////////////////////////////

     /**
     * @alias access.canKnowOf
     * @description Checks if a user has any permissions relating to a specified type of content
     * @param  {Object} user The user to check
     * @param  {String} typeKey The type or definition to check
     * @param  {Object} options Additional options and parameters
     * @param  {Object} options.cache Provide an existing object to use as an in memory cache, can be useful to increase performance if running this function in a large for/while loop
     * @example
     * const user = sdk.auth.getCurrentUser();
     * const canAccessImageSection =  sdk.access.canKnowOf(user, 'image');
     * const canAccessCustomerUploadSection =  sdk.access.canKnowOf(user, 'customerUpload');
     */
    service.canKnowOf = function(user, typeKey, options) {
        options = options || {};
        options.cache = options.cache || {};

        //Let us know if there are any permissions for this user
        return service.allPermissionTypes(user)[typeKey];
    }


    ///////////////////////////////////////////////

    /**
     * @alias access.checkActionAccess
     * @description Helpful function for checking whether a given user has access to do a given action on a specified item
     * @param  {Object} user The user to check
     * @param  {Object} item The item to check
     * @param  {String} ANY_ACTION The 'any' action to check
     * @param  {String} OWN_ACTION The 'owned' action to check
     * @param  {Object} options Additional options and parameters
     * @param  {Object} options.cache Provide an existing object to use as an in memory cache, can be useful to increase performance if running this function in a large for/while loop
     * @example
     * const user = sdk.auth.getCurrentUser();
     * const canEditItem =  sdk.access.checkActionAccess(user, {_id:'61eca4746971e75c1fc670ca', meta:{...}}, 'editany', 'editown');
     * const canViewItem =  sdk.access.checkActionAccess(user, {_id:'61eca4746971e75c1fc670ca', meta:{...}}, 'viewany', 'viewown');
     *
     * // Example of looping through a large array of items
     * const largeArrayOfItems = [{_id:'...', title...}, {_id:'...', title...}...]
     *
     * // Create an in memory cache object outside of the loop
     * const cache = {}
     * 
     * const filtered = largeArrayOfItems.filter(function(item) {
     *    return sdk.access.checkActionAccess(user, item, 'editany', 'editown', {cache});
     * })
     */
    service.checkActionAccess = function(user, item, ANY_ACTION, OWN_ACTION, options) {

        options = options || {};
        options.cache = options.cache || {};

        //Allow everything if we're a super user
        if (service.isAdministrator(user)) {
            return true;
        }

        //////////////////////////////////

        var type = item.meta.type;
        var definition = item.meta.definition || type;

        //////////////////////////////////

        var itemScopes = item.meta.scopes || [];

        //////////////////////////////////

        var actionAnyScopesHash;
        var anyCacheKey = `access-${user.cacheKey}-${ANY_ACTION}-${definition}-${type}`

        if (options.cache[anyCacheKey]) {
            actionAnyScopesHash = options.cache[anyCacheKey];

        } else {
            //Check if we can view this type of thing in any scopes 
            var actionAnyScopes = service.actionableScopes(user, ANY_ACTION, definition, type, options);

            //Get a fash hash of the scopes
            actionAnyScopesHash = QikCore.utils.hash(actionAnyScopes);
            options.cache[anyCacheKey] = actionAnyScopesHash;
        }

        //////////////////////////////////

        //If we have data about what they can do
        if (actionAnyScopesHash) {
            //Check if the item is in any of the scopes the user can access
            var isInAnyScopes = itemScopes.some(function(scopeID) {
                return actionAnyScopesHash[scopeID];
            })

            if (isInAnyScopes) {
                return true;
            }
        }

        //////////////////////////////////

        //Check if the user owns this content
        var isOwner = service.isOwner(user, item);

        //If the user is the owner
        if (isOwner) {
            var actionOwnScopesHash;
            var ownCacheKey = `access-${user.cacheKey}-${OWN_ACTION}-${definition}-${type}`

            if (options.cache[ownCacheKey]) {
                actionOwnScopesHash = options.cache[ownCacheKey];
            } else {

                //Check if we can view this type of thing in any scopes 
                var actionOwnScopes = service.actionableScopes(user, OWN_ACTION, definition, type, options);
                //Get a fash hash of the scopes
                actionOwnScopesHash = QikCore.utils.hash(actionOwnScopes);
                options.cache[ownCacheKey] = actionOwnScopesHash;
            }

            //If we have data about what they can do
            if (actionOwnScopesHash) {
                //Check if the item is in any of the scopes the user can access
                var isInOwnScopes = itemScopes.some(function(scopeID) {
                    return actionOwnScopesHash[scopeID];
                })

                if (isInOwnScopes) {
                    return true;
                }
            }
        }

        //////////////////////////////////

        //No access by default
        return false
    }


    ///////////////////////////////////////////////

    /**
     * @alias access.has
     * @description Helpful function for checking whether a given user has a specified permission
     * @param  {Object} user The user to check
     * @param  {String} permission The permission the user may have been granted
     * @example
     * const user = sdk.auth.getCurrentUser();
     * const isAllowedToCreateItems = sdk.access.has(user, 'video.create');
     */
    service.has = function(user, permission) {

        //Allow everything if we're a super user
        if (service.isAdministrator(user)) {
            return true;
        }

        var permissionsLookup = service.hashPermissions(user);
        return permissionsLookup[permission];
    }


    ///////////////////////////////////////////////

    /**
     * @alias access.canCreate
     * @description Helpful function for checking whether a given user can create a specified type of item
     * @param  {Object} user The user to check
     * @param  {String} definition The defined type key
     * @param  {String} type The basic type key
     * @param  {Object} options Additional options and parameters
     * @param  {Object} options.cache Provide an existing object to use as an in memory cache, can be useful to increase performance if running this function in a large for/while loop
     * @example
     * const user = sdk.auth.getCurrentUser();
     * const userCanCreateShortFilms = sdk.access.canCreate(user, 'shortFilm', 'video');
     */
    service.canCreate = function(user, definition, type, options) {

        options = options || {}
        options.cache = options.cache || {}


        //Allow everything if we're a super user
        if (service.isAdministrator(user)) {
            return true;
        }

        var createableScopes = service.actionableScopes(user, 'create', definition, type);
        return createableScopes.length
    }


    ///////////////////////////////////////////////

    /**
     * @alias access.canListItem
     * @description Helpful function for checking whether a given user can list a specified item
     * @param  {Object} user The user to check
     * @param  {Object} item The item to check
     * @param  {Object} options Additional options and parameters
     * @param  {Object} options.cache Provide an existing object to use as an in memory cache, can be useful to increase performance if running this function in a large for/while loop
     * @example
     * const user = sdk.auth.getCurrentUser();
     *
     * // Example of looping through a large array of items
     * const largeArrayOfItems = [{_id:'...', title...}, {_id:'...', title...}...]
     *
     * // Create an in memory cache object outside of the loop
     * const cache = {}
     * 
     * const filtered = largeArrayOfItems.filter(function(item) {
     *    return sdk.access.canListItem(user, item, {cache});
     * })
     */
    service.canListItem = function(user, item, options) {
        options = options || {};
        options.cache = options.cache || {}


        //Check if we can list the item
        var canList = service.checkActionAccess(user, item, 'listany', 'listown', options);


        if (canList) {
            return true;
        }

        //If we can view the item then we should be able to list it also
        var canView = service.canViewItem(user, item, options);
        if (canView) {
            return true;
        }

        return false;

    }


    ///////////////////////////////////////////////

    /**
     * @alias access.canViewItem
     * @description Helpful function for checking whether a given user can view a specified item
     * @param  {Object} user The user to check
     * @param  {Object} item The item to check
     * @param  {Object} options Additional options and parameters
     * @param  {Object} options.cache Provide an existing object to use as an in memory cache, can be useful to increase performance if running this function in a large for/while loop
     * @example
     * const user = sdk.auth.getCurrentUser();
     *
     * // Example of looping through a large array of items
     * const largeArrayOfItems = [{_id:'...', title...}, {_id:'...', title...}...]
     *
     * // Create an in memory cache object outside of the loop
     * const cache = {}
     * 
     * const filtered = largeArrayOfItems.filter(function(item) {
     *    return sdk.access.canViewItem(user, item, {cache});
     * })
     */
    service.canViewItem = function(user, item, options) {

        options = options || {}
        options.cache = options.cache || {}



        //Check if we can view the item
        var canView = service.checkActionAccess(user, item, 'viewany', 'viewOwn', options);
        if (canView) {
            return true;
        }

        //If we can edit the item then we should be able to view it also
        var canEdit = service.canEditItem(user, item, options);
        if (canEdit) {
            return true;
        }

        return false;
    }


    ///////////////////////////////////////////////

    /**
     * @alias access.canEditItem
     * @description Helpful function for checking whether a given user can edit a specified item
     * @param  {Object} user The user to check
     * @param  {Object} item The item to check
     * @param  {Object} options Additional options and parameters
     * @param  {Object} options.cache Provide an existing object to use as an in memory cache, can be useful to increase performance if running this function in a large for/while loop
     * @example
     * const user = sdk.auth.getCurrentUser();
     *
     * // Example of looping through a large array of items
     * const largeArrayOfItems = [{_id:'...', title...}, {_id:'...', title...}...]
     *
     * // Create an in memory cache object outside of the loop
     * const cache = {}
     * 
     * const filtered = largeArrayOfItems.filter(function(item) {
     *    return sdk.access.canEditItem(user, item, {cache});
     * })
     */
    service.canEditItem = function(user, item, options) {
        options = options || {}
        options.cache = options.cache || {}

        var allowed = service.checkActionAccess(user, item, 'editany', 'editown', options);
        return allowed;
    }

    ///////////////////////////////////////////////

    /**
     * @alias access.canDeleteItem
     * @description Helpful function for checking whether a given user can delete a specified item
     * @param  {Object} user The user to check
     * @param  {Object} item The item to check
     * @param  {Object} options Additional options and parameters
     * @param  {Object} options.cache Provide an existing object to use as an in memory cache, can be useful to increase performance if running this function in a large for/while loop
     * @example
     * const user = sdk.auth.getCurrentUser();
     *
     * // Example of looping through a large array of items
     * const largeArrayOfItems = [{_id:'...', title...}, {_id:'...', title...}...]
     *
     * // Create an in memory cache object outside of the loop
     * const cache = {}
     * 
     * const filtered = largeArrayOfItems.filter(function(item) {
     *    return sdk.access.canDeleteItem(user, item, {cache});
     * })
     */
    service.canDeleteItem = function(user, item, options) {
        options = options || {}
        options.cache = options.cache || {}

        return service.checkActionAccess(user, item, 'deleteany', 'deleteown', options);
    }

    ///////////////////////////////////////////////

    /**
     * @alias access.canRestoreItem
     * @description Helpful function for checking whether a given user can restore a specified item
     * @param  {Object} user The user to check
     * @param  {Object} item The item to check
     * @param  {Object} options Additional options and parameters
     * @param  {Object} options.cache Provide an existing object to use as an in memory cache, can be useful to increase performance if running this function in a large for/while loop
     * @example
     * const user = sdk.auth.getCurrentUser();
     *
     * // Example of looping through a large array of items
     * const largeArrayOfItems = [{_id:'...', title...}, {_id:'...', title...}...]
     *
     * // Create an in memory cache object outside of the loop
     * const cache = {}
     * 
     * const filtered = largeArrayOfItems.filter(function(item) {
     *    return sdk.access.canRestoreItem(user, item, {cache});
     * })
     */
    service.canRestoreItem = function(user, item, options) {
        options = options || {}
        options.cache = options.cache || {}

        return service.checkActionAccess(user, item, 'restoreany', 'restoreown', options);
    }

    ///////////////////////////////////////////////

    /**
     * @alias access.canEraseItem
     * @description Helpful function for checking whether a given user can erase a specified item
     * @param  {Object} user The user to check
     * @param  {Object} item The item to check
     * @param  {Object} options Additional options and parameters
     * @param  {Object} options.cache Provide an existing object to use as an in memory cache, can be useful to increase performance if running this function in a large for/while loop
     * @example
     * const user = sdk.auth.getCurrentUser();
     *
     * // Example of looping through a large array of items
     * const largeArrayOfItems = [{_id:'...', title...}, {_id:'...', title...}...]
     *
     * // Create an in memory cache object outside of the loop
     * const cache = {}
     * 
     * const filtered = largeArrayOfItems.filter(function(item) {
     *    return sdk.access.canEraseItem(user, item, {cache});
     * })
     */
    service.canEraseItem = function(user, item, options) {
        options = options || {}
        options.cache = options.cache || {}

        return service.checkActionAccess(user, item, 'eraseany', 'eraseown', options);
    }



    return service;

}

///////////////////////////////////////////////////////////////////////////////



export default QikAccess;