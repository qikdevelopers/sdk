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

service.activeFilterKeys = function(filterConfiguration) {
    var value = service.activeFilters(filterConfiguration)
        .filter(function(entry) {
            //Ignore all the wrapping entries
            return !entry.operator;
        })
        .reduce(function(set, filter) {
            var rootKey = service.cleanKey(filter.key);
            set[rootKey] = true;
            return set;
        }, {})

    return Object.keys(value);
}

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



service.activeFilterValues = function(filterConfiguration, options) {

    options = options || {};

    var activeFilters = service.activeFilters(filterConfiguration);

    var values = activeFilters
        .filter(function(entry) {
            //Ignore all the wrapping entries
            return !entry.operator;
        })
        .reduce(function(set, filter) {
            set = [...set, ...(filter.values || []), filter.value, filter.value2];
            return set;
        }, [])
        .filter(compactFunction);



    return values;
}
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