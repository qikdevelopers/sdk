

/**
 * @name filter
 * @classdesc Provides functions helpful for interacting with the filtering system
 * @class
 */



///////////////////////

var service = {};


///////////////////////


function isEmpty(value) {
    if(value === 0) {
        return false;
    }

    var empty = typeof value === 'undefined' || value === null || String(value).trim() === '';

    if (empty) {
        return true;
    }

    //If it's a string of undefined or null then treat it as empty also
    if (value === 'undefined' || value === 'null') {
        return true;
    }

    return false;
}

function compactFunction(val) {
    return !isEmpty(val)
}


///////////////////////

service.cleanKey = function(key) {
    key = String(key).split('|')[0];

    if (key[0] == '.') {
        key = key.slice(1);
    }

    return key;
}

///////////////////////

/**
 * @description Check if an object is a valid filter
 * @alias filter.isValidFilter
 * @param  {Object} filter The filter block to check
 * @example
 * // Missing a 'key'
 * const invalidFilter = sdk.filter.isValidFilter({comparator:'in', values:['Red', 'Green', 'Blue']})
 * // returns false
 * 
 * const validFilter = sdk.filter.isValidFilter({key:'favoriteColor', comparator:'in', values:['Red', 'Green', 'Blue']})
 * // returns true
 */
service.isValidFilter = function(filter) {
    if (!filter) {
        return false;
    }

    ///////////////////////////

    //If the filter has nested filters consider it valid
    //if it has valid child filters
    if (filter.operator) {
        if (!filter.filters || !filter.filters.length) {
            return false;
        }

        return filter.filters.some(service.isValidFilter);
    }

    // ///////////////////////////

    // //Get the comparator for the filter
    // var comparator = hash[filter.comparator];
    // if (!comparator) {
    //     //No comparator was specified for the filter
    //     return false;
    // }

    ///////////////////////////

    var key = service.cleanKey(filter.key);
    if (!key) {
        //No key has been specified for the filter
        return false;
    }

    if(filter.comparator == 'empty' || filter.comparator == 'notempty') {
        return true;
    }


    var multiValues = (filter.values || []).filter(compactFunction);



    return !isEmpty(filter.value) || !isEmpty(filter.value2) || multiValues.length;
    // ///////////////////////////

    // switch (filter.inputType) {
    //     case 'none':
    //         //If we are checking empty/notempty
    //         //the filter is always valid without any extra parameters
    //         return true;
    //         break;
    //     case 'range':
    //         //If we are filtering a number range
    //         //we need the start and end of the range
    //         if (!filter.value || isNaN(filter.value)) {
    //             return false;
    //         }

    //         if (!filter.value2 || isNaN(filter.value2)) {
    //             return false;
    //         }
    //         break;
    //     case 'daterange':
    //         if (!filter.value || !parseDate(filter.value)) {
    //             return false;
    //         }

    //         if (!filter.value2 || !parseDate(filter.value2)) {
    //             return false;
    //         }
    //         break;
    //     case 'array':
    //         if (!filter.values || !filter.values.length) {
    //             return false;
    //         }
    //         break;
    //     default:
    //         // if (filter.dataType == 'boolean') {
    //         //     //Check if they provided a valid boolean value to the filter
    //         //     return validBooleans[String(filter.value).toLowerCase()];
    //         // } else {
    //         //     //The filter has not been provided with a value
    //         if (isEmpty(filter.value)) {
    //             return false;
    //         }
    //         // }
    //         break;
    // }

    ///////////////////////////

    //If we got this far then the information
    //provided to the filter is enough to run it
    return true;

}

////////////////////////////////////////////////

/**
 * 
 * @description Returns an array of all active filters
 * @alias filter.activeFilters
 * @param  {Object} filterConfiguration A filter configuration object
 * @example
 * 
 * const filterConfiguration =  {
 *     "operator": "and",
 *     "filters": [
 *       {
 *         "operator": "and",
 *         "filters": [
 *           {
 *             "key": "formData.person.firstName",
 *             "comparator": "startswith",
 *             "value": "c"
 *           },
 *           {
 *             "key": "invalid no comparator",
 *             "value": "e"
 *           }
 *           {
 *             "key": "formData.person.lastName",
 *             "comparator": "endswith",
 *             "value": "e"
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * const activeFilters = sdk.filter.activeFilters(filterConfiguration);
 * 
 * const returns = [
 *           {
 *             "key": "formData.person.firstName",
 *             "comparator": "startswith",
 *             "value": "c"
 *           }, 
 *           {
 *             "key": "formData.person.lastName",
 *             "comparator": "endswith",
 *             "value": "e"
 *           }]
 * 
 */
service.activeFilters = function(filterConfiguration) {
    var memo = [];

    retrieveActiveFilter(filterConfiguration, memo);

    return memo;

    ////////////////////////////

    function retrieveActiveFilter(filterBlock, memo) {
        if (!filterBlock) {
            return;
        }

        var isValid = service.isValidFilter(filterBlock);

        if (isValid) {
            memo.push(filterBlock);
        }

        if (filterBlock.filters && filterBlock.filters.length) {
            filterBlock.filters.forEach(function(b) {
                retrieveActiveFilter(b, memo);
            })
        }
    }
}

////////////////////////////////////////////////


/**
 * 
 * @description Returns an array of all keys that are being actively filtered on
 * @alias filter.activeFilterKeys
 * @param  {Object} filterConfiguration A filter configuration object
 * @example
 * 
 * const filterConfiguration =  {
 *     "operator": "and",
 *     "filters": [
 *       {
 *         "operator": "and",
 *         "filters": [
 *           {
 *             "key": "formData.person.firstName",
 *             "comparator": "startswith",
 *             "value": "c"
 *           },
 *           {
 *             "key": "invalid no comparator",
 *             "value": "e"
 *           }
 *           {
 *             "key": "formData.person.lastName",
 *             "comparator": "endswith",
 *             "value": "e"
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * const activeFilters = sdk.filter.activeFilterKeys(filterConfiguration);
 * // Returns ['formData.person.firstName', 'formData.person.lastName']
 * 
 */
service.activeFilterKeys = function(filterConfiguration, options) {
    options = options || {}

    var activeFilters = service.activeFilters(filterConfiguration);
    var value = activeFilters
        .filter(function(entry) {
            //Ignore all the wrapping entries
            return !entry.operator;
        })
        .reduce(function(set, filter) {
            var rootKey = service.cleanKey(filter.key);
            if(options.trimArrayDelimeters !== false) {
                rootKey = rootKey.split('[]').join('');
            }
            set[rootKey] = true;
            return set;
        }, {});

    var keys = Object.keys(value);

    return keys;
};


/**
 * 
 * @description Returns an array of all comparators that are being actively filtered
 * @alias filter.activeFilterKeys
 * @param  {Object} filterConfiguration A filter configuration object
 * @example
 * 
 * const filterConfiguration =  {
 *     "operator": "and",
 *     "filters": [
 *       {
 *         "operator": "and",
 *         "filters": [
 *           {
 *             "key": "formData.person.firstName",
 *             "comparator": "startswith",
 *             "value": "c"
 *           },
 *           {
 *             "key": "invalid no comparator",
 *             "value": "e"
 *           }
 *           {
 *             "key": "formData.person.lastName",
 *             "comparator": "endswith",
 *             "value": "e"
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * const activeFilters = sdk.filter.activeFilterKeys(filterConfiguration);
 * // Returns ['startswith', 'endswith']
 * 
 */
service.activeFilterComparators = function(filterConfiguration) {
    var comparators = service.activeFilters(filterConfiguration)
        .filter(function(entry) {
            //Ignore all the wrapping entries
            return !entry.operator;
        })
        .reduce(function(set, filter) {
            set[filter.comparator] = true;
            return set;
        }, {})

    return Object.keys(comparators);
}

/**
 * 
 * @description Returns an array of all comparators that are being actively filtered
 * @alias filter.activeFilterOperators
 * @param  {Object} filterConfiguration A filter configuration object
 * @example
 * 
 * const filterConfiguration =  {
 *     "operator": "and",
 *     "filters": [
 *       {
 *         "operator": "nor",
 *         "filters": [
 *           {
 *             "key": "formData.person.firstName",
 *             "comparator": "startswith",
 *             "value": "c"
 *           },
 *           {
 *             "key": "invalid no comparator",
 *             "value": "e"
 *           }
 *           {
 *             "key": "formData.person.lastName",
 *             "comparator": "endswith",
 *             "value": "e"
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * const activeFilterOperators = sdk.filter.activeFilterOperators(filterConfiguration);
 * // Returns ['and', 'nor']
 * 
 */
service.activeFilterOperators = function(filterConfiguration) {
    var operators = service.activeFilters(filterConfiguration)
        .filter(function(entry) {
            return entry.operator;
        })
        .reduce(function(set, filter) {
            set[filter.operator] = true;
            return set;
        }, {})

    return Object.keys(operators);
}


/**
 * 
 * @description Returns an array of all values that are being actively used by a filter
 * @alias filter.activeFilterValues
 * @param  {Object} filterConfiguration A filter configuration object
 * @example
 * 
 * const filterConfiguration =  {
 *     "operator": "and",
 *     "filters": [
 *       {
 *         "operator": "nor",
 *         "filters": [
 *           {
 *             "key": "formData.person.firstName",
 *             "comparator": "startswith",
 *             "value": "c"
 *           },
 *           {
 *             "key": "invalid no comparator",
 *             "value": "e"
 *           }
 *           {
 *             "key": "formData.person.lastName",
 *             "comparator": "endswith",
 *             "value": "a"
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * const activeFilterValues = sdk.filter.activeFilterValues(filterConfiguration);
 * // Returns ['c', 'a']
 * 
 */
service.activeFilterValues = function(filterConfiguration, options) {

    options = options || {};

    var activeFilters = service.activeFilters(filterConfiguration);

    function mapValue(v) {
        if(!v) {
            return;
        }

        return v._id || v.id || v.title || v.name || v;
    }

    var values = activeFilters
        .filter(function(entry) {
            //Ignore all the wrapping entries
            return !entry.operator;
        })
        .reduce(function(set, filter) {
            set = [...set, ...(filter.values || []).map(mapValue), mapValue(filter.value), mapValue(filter.value2)];
            return set;
        }, [])
        .filter(compactFunction);



    return values;
}


/**
 * 
 * @description Returns an string representation of a filter configuration. 
 * Often used to check if a user has changed the filter in any way, the string only takes into consideration active valid filters
 * @alias filter.filterChangeString
 * @param  {Object} filterConfiguration A filter configuration object
 * @example
 * 
 * const filterConfiguration =  {
 *     "operator": "and",
 *     "filters": [
 *       {
 *         "operator": "nor",
 *         "filters": [
 *           {
 *             "key": "formData.person.firstName",
 *             "comparator": "startswith",
 *             "value": "c"
 *           },
 *           {
 *             "key": "invalid no comparator",
 *             "value": "e"
 *           }
 *           {
 *             "key": "formData.person.lastName",
 *             "comparator": "endswith",
 *             "value": "a"
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * // Watch this string for changes
 * const changeString = sdk.filter.filterChangeString(filterConfiguration); 
 */
service.filterChangeString = function(config) {
    var string = [
        service.activeFilterKeys(config).join(', '),
        service.activeFilterValues(config).join(', '),
        service.activeFilterComparators(config).join(', '),
        service.activeFilterOperators(config).join(', '),
    ]
    return string.filter(compactFunction).join(', ');
};

///////////////////////

export default service;