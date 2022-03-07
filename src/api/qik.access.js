var QikAccess = function(QikCore) {


    if (!QikCore.auth) {
        throw new Error(`Can't Instantiate QikAccess before QikAccess has been initialized`);
    }

    if (!QikCore.utils) {
        throw new Error(`Can't Instantiate QikAccess before QikUtils has been initialized`);
    }

    //////////////////////////////////

    var service = {};

    ///////////////////////////////////////////////

    service.isAdministrator = function(user) {
        return user && user.userType == 'administrator';
    }

    ///////////////////////////////////////////////

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

    service.allUserScopes = function(user) {

        var collected = {};
        var permissions = user.permissions || {};

        ////////////////////////

        function pluckScope(scopeObject) {

            if (!scopeObject) {
                return;
            }

            var scopeID = QikUtils.id(scopeObject);
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

    service.isOwner = function(user, item) {
        var userID = QikUtils.id(user);
        var personaID = QikUtils.id(user.persona);


        var metaObject = item.meta;
        if (!metaObject) {
            return false;
        }

        /////////////////////////////////////////////

        var users = QikUtils.ids([...metaObject.userOwners, metaObject.userAuthor]);
        var userHash = helpers.hash(users);
        // console.log('USERS', users, userHash, '-', metaObject.userAuthor, metaObject.userOwners);

        if (userHash[userID]) {
            return true;
        }

        /////////////////////////////////////////////

        var personas = QikUtils.ids([...metaObject.personaOwners, metaObject.personaAuthor]);
        var personaHash = helpers.hash(personas);
        // console.log('PERSONAS', personas, personaHash, '-', metaObject.personaAuthor, metaObject.personaOwners)

        if (personaHash[personaID]) {
            return true;
        }

    }


    ///////////////////////////////////////////////

    service.allPermissions = function(user) {

        var allPermissions = Object.values(user.permissions)
            .map(function(permissionScope) {
                return permissionScope.permissions;
            })
            .flat();

        return allPermissions;
    }

    ///////////////////////////////////////////////

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

    service.canKnowOf = function(user, typeKey, options) {
        options = options || {};
        options.cache = options.cache || {};

        //Let us know if there are any permissions for this user
        return service.allPermissionTypes(user)[typeKey];
    }


    ///////////////////////////////////////////////

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
            actionAnyScopesHash = helpers.hash(actionAnyScopes);
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
                actionOwnScopesHash = helpers.hash(actionOwnScopes);
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

    service.has = function(user, permission) {

        //Allow everything if we're a super user
        if (service.isAdministrator(user)) {
            return true;
        }

        var permissionsLookup = service.hashPermissions(user);
        return permissionsLookup[permission];
    }


    ///////////////////////////////////////////////

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

    service.canEditItem = function(user, item, options) {
        options = options || {}
        options.cache = options.cache || {}

        var allowed = service.checkActionAccess(user, item, 'editany', 'editown', options);
        return allowed;
    }

    ///////////////////////////////////////////////

    service.canDeleteItem = function(user, item, options) {
        options = options || {}
        options.cache = options.cache || {}

        return service.checkActionAccess(user, item, 'deleteany', 'deleteown', options);
    }

    ///////////////////////////////////////////////

    service.canRestoreItem = function(user, item, options) {
        options = options || {}
        options.cache = options.cache || {}

        return service.checkActionAccess(user, item, 'restoreany', 'restoreown', options);
    }

    ///////////////////////////////////////////////

    service.canEraseItem = function(user, item, options) {
        options = options || {}
        options.cache = options.cache || {}

        return service.checkActionAccess(user, item, 'eraseany', 'eraseown', options);
    }



    return service;

}

///////////////////////////////////////////////////////////////////////////////



export default QikAccess;