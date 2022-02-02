import _ from 'lodash';
import axios from 'axios';
import { isBrowser, isNode } from 'browser-or-node';


///////////////////////////////////////////////////////////////////////////////

/**
 * @classdesc A static service that provides useful helper functions and tools for other Qik services
 * @alias utils
 * @class
 * @hideconstructor
 */
var QikUtils = {};

///////////////////////////////////////////////////////////////////////////////

/**
 * A helpful function that can take a keyed object literal and map it to url query string parameters
 * @alias utils.mapParameters
 * @param  {Object} parameters The object you want to transalte
 * @return {String}            The query string
 * @example 
 * //Returns &this=that&hello=world
 * qik.utils.mapParameters({"this":"that", "hello":"world"})
 */
QikUtils.mapParameters = function(parameters) {
    return _.chain(parameters)
        .reduce(function(set, v, k) {
            if (v === undefined || v === null || v === false) {
                return set;
            }

            if (_.isArray(v)) {
                _.each(v, function(value) {
                    set.push(`${k}=${encodeURIComponent(value)}`);
                })

            } else {
                set.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
            }

            return set;
        }, [])
        .compact()
        .value()
        .join('&');
}

///////////////////////////////////////////////////////////////////////////////

/**
 * A function that will take an integer and a currency string and return a formatted numeric amount rounded to 2 decimal places
 * @alias utils.formatCurrency
 * @param  {Integer} value The amount in cents
 * @param  {String} currency The currency to format
 * @return {String}            The formatted value
 * @example 
 * 
 * //Returns £10.00
 * qik.utils.formatCurrency(1000, 'gbp');
 * 
 * //Returns $10.00
 * qik.utils.formatCurrency(1000, 'usd');
 * 
 */
QikUtils.formatCurrency = function(value, currency) {

    if (!value || isNaN(value)) {
        value = 0;
    }

    var currencyPrefix = QikUtils.currencySymbol(currency);
    return `${currencyPrefix}${parseFloat(parseInt(value) / 100).toFixed(2)}`;

}


/**
 * A function that will take a currency string and return the symbol
 * @alias utils.currencySymbol
 * @param  {String} currency The currency
 * @return {String}            The symbol
 * @example 
 * 
 * //Returns £
 * qik.utils.currencySymbol('gbp');
 * 
 * //Returns $
 * qik.utils.currencySymbol('usd');
 * 
 */
QikUtils.currencySymbol = function(currency) {
    //Ensure lowercase currency
    currency = String(currency).toLowerCase();

    switch (String(currency).toLowerCase()) {
        case 'gbp':
            return '£';
            break;
        case 'eur':
            return '€';
            break;
        default:
            return '$';
            break;
    }
}



QikUtils.getAvailableCurrencies = function(defaultCountryCode) {


    var array = [];

    array.push({
        name: `USD (${QikUtils.currencySymbol("usd")})`,
        value: "usd",
        countryCode: { 'US': true },
    });

    array.push({
        name: `GBP (${QikUtils.currencySymbol("gbp")})`,
        value: "gbp",
        countryCode: { 'GB': true, 'UK': true },
    });

    array.push({
        name: `CAD (${QikUtils.currencySymbol("cad")})`,
        value: "cad",
        countryCode: { 'CA': true },
    });

    array.push({
        name: `AUD (${QikUtils.currencySymbol("aud")})`,
        value: "aud",
        countryCode: { 'AU': true },
    });


    array.push({
        name: `NZD (${QikUtils.currencySymbol("nzd")})`,
        value: "nzd",
        countryCode: { 'NZ': true },
    });

    array.push({
        name: `SGD (${QikUtils.currencySymbol("sgd")})`,
        value: "sgd",
        countryCode: { 'SG': true },
    });


    if (defaultCountryCode) {

        var findMatch = array.findIndex(function(currency) {
            return currency.countryCode[defaultCountryCode];
        })

        const moveArrayItem = (array, fromIndex, toIndex) => {
            const arr = [...array];
            arr.splice(toIndex, 0, ...arr.splice(fromIndex, 1));
            return arr;
        }

        if (findMatch != -1) {
            array = moveArrayItem(array, findMatch, 0)
        }
    }

    return array;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * A helpful function for creating a fast hash object that can be used for more efficient loops
 * @alias utils.hash
 * @param  {Array} array The array to reduce
 * @param  {String} key The key or path to the property to group by
 * @return {Object}            A hash object literal
 * @example 
 * //Returns {something:[{title:'test', definition:'something'}]}
 * qik.utils.mapReduce([{title:'test', definition:'something'}], 'definition');
 * 
 */
QikUtils.hash = function(array, key) {
    if (!Array.isArray(array)) {
        array = [];
    }
    return array.reduce(function(set, item) {
        var key = _.get(item, key);
        set[key] = item;
        return set;
    }, {});
}



///////////////////////////////////////////////////////////////////////////////

/**
 * A helpful function that can create a globally unique id
 * @alias utils.guid
 * @return {String}            The new guid
 * @example 
 * //Returns 20354d7a-e4fe-47af-8ff6-187bca92f3f9
 * qik.utils.guid()
 */
QikUtils.guid = function() {
    var u = (new Date()).getTime().toString(16) +
        Math.random().toString(16).substring(2) + "0".repeat(16);
    var guid = u.substr(0, 8) + '-' + u.substr(8, 4) + '-4000-8' +
        u.substr(12, 3) + '-' + u.substr(15, 12);

    return guid;
}

//////////////////////////////////////////////////

/**
 * A helpful function that can return a subset of an array compared to specified criteria, This is usually used
 * to evaluate expressions on Qik forms
 * @alias utils.extractFromArray
 * @param  {Array} array The array you want to filter
 * @param  {String} path The path to the property you want to compare on each item in the array
 * @param  {Boolean} sum Whether to sum the resulting values together as a number
 * @param  {Boolean} flatten Whether to flatten nested arrays
 * @param  {Boolean} unique Whether to only return unique values
 * @param  {Boolean} exclude Whether to exclude null or undefined values
 * @param  {Object} options Pass through extra options for how to extract the values
 * @return {Array}           An array of all values retrieved from the array, unless options specifies otherwise
 * @example 
 * //Returns [26, 19] as all the values
 * qik.utils.extractFromArray([{name:'Jerry', age:26}, {name:'Susan', age:19}], 'age');
 * 
 * //Returns 45
 * qik.utils.extractFromArray([{name:'Jerry', age:26}, {name:'Susan', age:19}], 'age', {sum:true});
 * 
 */
QikUtils.extractFromArray = function(array, key, sum, flatten, unique, exclude, options) {

    if (!options) {
        options = {}
    }

    if (sum) {
        options.sum = sum;
    }

    if (flatten) {
        options.flatten = true;
    }

    if (unique) {
        options.unique = true;
    }

    if (exclude) {
        options.excludeNull = true;
    }

    /////////////////

    //Filter the array options by a certain value and operator
    var matches = _.reduce(array, function(set, entry) {
        //Get the value from the object
        var retrievedValue = _.get(entry, key);

        ///////////////////////

        var isNull = (!retrievedValue && (retrievedValue !== false && retrievedValue !== 0));
        if (options.excludeNull && isNull) {
            return set;
        }

        set.push(retrievedValue);
        return set;
    }, [])

    /////////////////

    if (options.flatten) {
        matches = _.flatten(matches);
    }

    /////////////////

    if (options.unique) {
        matches = _.uniq(matches);
    }

    /////////////////

    if (options.sum) {
        matches = matches.reduce(function(a, b) {
            return a + b;
        }, 0);
    }



    /////////////////

    return matches;
}


//////////////////////////////////////////////////////

/**
 * A helpful function that can return a subset of an array compared to specified criteria, This is usually used
 * to evaluate expressions on Qik forms
 * @alias utils.matchInArray
 * @param  {Array} array The array you want to filter
 * @param  {String} path The path to the property you want to compare on each item in the array
 * @param  {String} value The value to compare with
 * @param  {String} operator Can be Possible options are ('>', '<', '>=', '<=', 'in', '==') Defaults to '==' (Is equal to)
 * @return {Array}           An array that contains all items that matched
 * @example 
 * //Returns [{name:'Jerry', age:26}] as that is only item in the array that matches the criteria
 * qik.utils.matchInArray([{name:'Jerry', age:26}, {name:'Susan', age:19}], 'age', 26, '>=');
 * 
 */
QikUtils.matchInArray = function(array, key, value, operator) {

    //Filter the array options by a certain value and operator
    var matches = _.filter(array, function(entry) {
        //Get the value from the object
        var retrievedValue = _.get(entry, key);
        var isMatch;

        ///////////////////////

        //Check how to operate
        switch (operator) {
            case '>':
                isMatch = (retrievedValue > value);
                break;
            case '<':
                isMatch = (retrievedValue < value);
                break;
            case '>=':
                isMatch = (retrievedValue >= value);
                break;
            case '<=':
                isMatch = (retrievedValue <= value);
                break;
            case 'in':
                isMatch = _.includes(retrievedValue, value);
                break;
            default:
                //operator is strict equals
                if (value === undefined) {
                    isMatch = retrievedValue;
                } else {
                    isMatch = (retrievedValue == value);
                }
                break;
        }

        ///////////////////////

        // console.log('MATCH IN ARRAY', isMatch, key, value, retrievedValue,operator)
        return isMatch;
    })

    return matches;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * A helpful class that can take an array of values and return them as a comma seperated
 * string, If the values are objects, then a property to use as the string representation can be specified
 * @alias utils.comma
 * @param  {Array} array The array of values to translate
 * @param  {String} path  An optional property key to use for each value
 * @return {String}       The resulting comma seperated string
 * @example
 * //Returns 'cat, dog, bird'
 * qik.utils.comma(['cat', 'dog', 'bird']);
 * 
 * //Returns 'cat, dog, bird'
 * qik.utils.comma([{title:'cat'}, {title:'dog'}, {title:'bird'}], 'title');
 */
QikUtils.comma = function(array, path, limit) {

    if (limit) {
        array = array.slice(0, limit);
    }

    return _.chain(array)
        .compact()
        .map(function(item) {
            if (path && path.length) {
                return _.get(item, path);
            }

            return item;
        })
        .value()
        .join(', ');

}

///////////////////////////////////////////////////////////////////////////////

//Helper function to get an id of an object

/**
 * Returns a specified _id for an object
 * @alias utils.id
 * @param  {Object} input      An object that is or has an _id property
 * @param  {Boolean} asObjectID Whether to convert to a Mongo ObjectId
 * @return {String}            Will return either a string or a Mongo ObjectId
 *
 * @example
 *
 * //Returns '5cb3d8b3a2219970e6f86927'
 * qik.utils.id('5cb3d8b3a2219970e6f86927')
 *
 * //Returns true
 * typeof QikUtils.id({_id:'5cb3d8b3a2219970e6f86927', title, ...}) == 'string';

 * //Returns true
 * typeof QikUtils.id({_id:'5cb3d8b3a2219970e6f86927'}, true) == 'object';
 */
QikUtils.id = function(source) {

    if (!source) {
        return;
    }

    /////////////////////////////////

    var output;

    if (source._id) {
        output = String(source._id);
    } else {
        output = String(source);
    }


    var isValid = service.isValidID(output);
    if (!isValid) {
        return;
    }

    return output;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Cleans and maps an array of objects to an array of IDs  
 * @alias utils.ids      
 * @param  {Array} array      An array of objects or object ids
 * @param  {Boolean} asObjectID Whether or not to map the ids as Mongo ObjectIds
 * @return {Array}            An array of Ids
 *
 * @example
 * //Returns ['5cb3d8b3a2219970e6f86927', '5cb3d8b3a2219970e6f86927', '5cb3d8b3a2219970e6f86927']
 * qik.utils.ids([{_id:'5cb3d8b3a2219970e6f86927'}, {_id:'5cb3d8b3a2219970e6f86927'}, null, '5cb3d8b3a2219970e6f86927'])
 */
QikUtils.ids = function(array) {
    return _.chain(array)
        .reduce(function(set, entry) {

            if (!entry) {
                return set;
            }

            var cleaned = service.id(entry)

            if (cleaned) {
                set[cleaned] = 1;
            }

            return set;
        }, {})
        .keys()
        .value();
}

///////////////////////////////////////////////////////////////////////////////

QikUtils.isValidID = function(input) {
    var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$")
    return checkForHexRegExp.test(String(input));

}

///////////////////////////////////////////////////////////////////////////////

/**
 * Helper function for retrieving a human readable error message from server error response objects
 * @alias utils.errorMessage
 * @param  {Object} error The error object to translate    
 * @return {String}     The resulting human readable error message
 */
QikUtils.errorMessage = function(err) {


    if (_.isArray(err)) {
        err = _.first(err);
    }

    ////////////////////////////////////

    var candidates = [
        'response.data.message',
        'response.data',
        'message',
    ]

    ////////////////////////////////////

    var message = _.chain(candidates)
        .map(function(path) {
            return _.get(err, path);
        })
        .compact()
        .first()
        .value();

    ////////////////////////////////////

    if (Array.isArray(message)) {
        message = message[0];
    }

    ////////////////////////////////////

    if (!message || !message.length) {
        return String(err);
    }

    ////////////////////////////////////

    return message;
}


/////////////////////////////////////////////
/////////////////////////////////////////////



////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

/**
 * Helper function for cleaning strings to use as database ids
 * @alias utils.machineName
 * @param  {String} string The string to clean eg. (Awesome Event!)
 * @return {String}     A cleaned and formatted string eg. (awesomeEvent)
 */

QikUtils.machineName = function(string) {

    if (!string || !string.length) {
        return;
    }

    var regexp = /[^a-zA-Z0-9-_]+/g;
    return string.replace(regexp, '');
}

/////////////////////////////////////////////
/////////////////////////////////////////////
/////////////////////////////////////////////


export default QikUtils;


/////////////////////////////////////////////

//Export the event dispatcher
export function EventDispatcher() {

    var listeners = {};

    /////////////////////////////////////////////

    var dispatcher = {}

    /////////////////////////////////////////////

    //Remove all listeners
    dispatcher.removeAllListeners = function() {
        listeners = {};
    }

    /////////////////////////////////////////////

    dispatcher.dispatch = function(event, details) {

        if (listeners[event]) {

            // console.log('Listeners', event, listeners[event]);
            //For each listener
            listeners[event].forEach(function(callback) {
                //Fire the callback
                // console.log('Fire listener', event, details);
                return callback(details);
            });
        }
    }

    /////////////////////////////////////////////

    dispatcher.addEventListener = function(event, callback) {

        if (!listeners[event]) {
            listeners[event] = [];
        }

        if (listeners[event].indexOf(callback) == -1) {
            //Add to the listeners
            listeners[event].push(callback)
        } else {
            //Already listening
        }
    }

    /////////////////////////////////////////////

    dispatcher.removeEventListener = function(event, callback) {

        if (!listeners[event]) {
            listeners[event] = [];
        }

        //Get the index of the listener
        var index = listeners[event].indexOf(callback);

        if (index != -1) {
            //Remove from the listeners
            listeners[event].splice(index, 1);
        }
    }


    /////////////////////////////////////////////

    //Wrap the event listener functionality
    dispatcher.bootstrap = function(service) {
        if (!service) {
            // console.log('No service to bootstrap to')
            return;
        }

        service.dispatch = dispatcher.dispatch;
        service.addEventListener = dispatcher.addEventListener;
        service.removeEventListener = dispatcher.removeEventListener;
        service.removeAllListeners = dispatcher.removeAllListeners;
    }

    /////////////////////////////////////////////

    return dispatcher;
}