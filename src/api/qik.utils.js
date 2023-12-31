import _get from 'lodash/get.js';
import _isDate from 'lodash/isDate.js';
import _startsWith from 'lodash/startsWith.js';
import _isObject from 'lodash/isObject.js';
import _camelCase from 'lodash/camelCase.js';
import axios from 'axios';
import { isBrowser, isNode } from 'browser-or-node';



///////////////////////////////////////////////////////////////////////////////

const service = {};

////////////////////////////////////

const loadedExternalScripts = {}

service.loadExternalScript = function(url) {

    const promise = new Promise(createNewScript);

    function createNewScript(resolve, reject) {

        if (!document) {
            return reject('document is undefined')
        }

        if (loadedExternalScripts[url]) {
            return resolve(url);
        }
        
        // Avoid duplicate scripts
        loadedExternalScripts[url] = true;

        //////////////////////////////////////

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.onload = function() {
            console.log('Loaded external script', url);
            return resolve(url);
        };
        script.src = url;

        // Inject it into the document's <head> tag
        document.getElementsByTagName('head')[0].appendChild(script);

    }

    return promise;
}



///////////////////////////////////////////////////////////////////////////////

service.exists = function(value) {
    var isUndefinedOrNull;

    ////////////////////////

    if (Array.isArray(value)) {
        return true;
    }

    ////////////////////////

    if (value === 0) {
        return true;
    }

    ////////////////////////

    switch (typeof value) {
        case 'undefined':
        case 'null':
            isUndefinedOrNull = true;
            break;
        default:
            var string = String(value).toLowerCase();
            switch (string) {
                case '':
                case 'undefined':
                case 'null':
                    isUndefinedOrNull = true;
                    break;
            }
            break;
    }

    return !!!isUndefinedOrNull;
}

//////////////////////////////////

service.parseDate = function(input) {

    if (!input) {
        return;
    }

    if (_isDate(input)) {
        return input;
    }

    //Attempt to create a date
    var d = new Date(input);
    var isValid = d instanceof Date && !isNaN(d);

    if (isValid) {
        return d;
    }

    return;
}

service.parseURL = function(string) {

    if (!string) {
        return false;
    }

    const relative = _startsWith(string, '/');
    if (relative) {
        return string;
    }

    if (_startsWith(string, '://')) {
        return string;
    }

    if (_startsWith(string, 'mailto:')) {
        return string;
    }

    if (_startsWith(string, 'tel:')) {
        return string;
    }

    if (_startsWith(string, 'sms:')) {
        return string;
    }

    //////////////////////////////////
    //If someone entered an email by accident
    var email = service.parseEmail(string);
    //Convert it to a mailto link
    if (email && email === string) {
        return `mailto:${email}`
    }

    //////////////////////////////////

    const withHttp = string => !/^https?:\/\//i.test(string) ? `http://${string}` : string;
    string = withHttp(string);



    var valid = RegExp('(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+@]*)*(\\?[;&a-z\\d%_.~+=-@]*)?(\\#[-a-z\\d_@]*)?$', 'i').test(string);

    if (!valid) {
        return false;
    }



    ///////////////////////////

    return withHttp(string)
}


///////////////////////////////////////////////

service.parseNumber = function(input, decimalPoints) {
    if (!input) {
        return 0;
    }

    input = Number(input);
    if (isNaN(input)) {
        return 0;
    }

    if (decimalPoints) {
        var str = input.toFixed(decimalPoints);
        input = service.parseNumber(str);
    }

    return input;
}


service.isValidEmailAddress = function(email) {

    var tester = /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

    if (!email) return false;

    var emailParts = email.split('@');

    if (emailParts.length !== 2) return false

    var account = emailParts[0];
    var address = emailParts[1];

    if (account.length > 64) return false

    else if (address.length > 255) return false

    var domainParts = address.split('.');
    if (domainParts.some(function(part) {
            return part.length > 63;
        })) return false;


    if (!tester.test(email)) return false;

    return true;
}


service.parseEmail = function(input) {

    if (!input) {
        return false;
    }

    var lowercase = String(input).toLowerCase();
    var valid = service.isValidEmailAddress(lowercase);

    if (!valid) {
        return false;
    } else {
        return lowercase;
    }
}

//////////////////////////////////

service.parseInt = function(input) {
    if (!input) {
        return 0;
    }

    input = parseInt(input);
    if (isNaN(input)) {
        return 0;
    }

    return input;
}



service.cleanValue = function(data, type, options) {

    if (!options) {
        options = {};
    }

    ////////////////////////

    var noInputValue = service.exists(data);
    if (options.strict && noInputValue && type != 'boolean') {
        return data;
    }

    ////////////////////////

    switch (type) {
        case 'reference':
            return service.id(data, true);
            break;
        case 'boolean':
            return service.parseBoolean(data);
            break;
        case 'url':
            return service.parseURL(data);
            break;
        case 'key':
            return service.machineName(data);
            break;
        case 'email':
            return service.parseEmail(data);
            break;
        case 'date':
            var parsed = service.parseDate(data, options);

            if (parsed === undefined) {
                return;
            } else {
                return parsed;
            }
            break;
        case 'number':
        case 'decimal':
        case 'float':
            var val = service.parseNumber(data);
            if (String(val) == String(Number(data))) {
                return val;
            }
            return;
            break;
        case 'integer':
            var val = service.parseInt(data);
            if (String(val) == String(parseInt(data))) {
                return val;
            }
            return;
            break;
        case 'group':
            return data;
            break;
        case 'object':
            if (_isObject(data) && !Array.isArray(data)) {
                return data
            }

            return;
            break;
        case 'string':
            if (service.exists(data)) {
                var stringed = String(data);
                if (stringed == '[object Object]') {
                    return;
                }

                return stringed
            } else {
                return;
            }

            // if(!data) {
            //     return '';
            // }

            // if(Array.isArray(data)) {
            //      return JSON.stringify(data);
            // }

            // if(Object.isObject(data)) {
            //     return JSON.stringify(data);
            // }

            // return String(data);

            // break;
        default:
            return String(data)
            break;
    }
}



service.isValidValue = function(value, dataType, strict) {

    var isValue = service.exists(value);
    var valueIsNumber = (typeof value == 'number')

    ////////////////////////

    var isValidEntry = false;

    if (!isValue) {
        return false;
    }

    ////////////////////////

    switch (dataType) {

        case 'url':
            if (strict) {
                isValidEntry = _startsWith(value, '/') || _startsWith(value, '://') || _startsWith(value, 'http://') || _startsWith(value, 'https://');
            } else {
                isValidEntry = String(value) === service.parseURL(value);
            }
            break;
        case 'key':
            isValidEntry = String(value) === service.machineName(value);
            break;
        case 'date':

            //If we are being strict
            if (strict) {
                //And the input is not a javascript date object
                if (typeof value != 'object' || !_isDate(value)) {
                    return false;
                }
            }

            ///////////////////////////////
            var parsed = service.parseDate(value);
            return parsed !== undefined;
            break;
        case 'email':

            if (strict) {
                isValidEntry = value === service.parseEmail(value);
            } else {
                isValidEntry = String(value).toLowerCase() === service.parseEmail(value);
            }

            break;
        case 'number':
        case 'decimal':
        case 'float':
            if (strict) {
                isValidEntry = valueIsNumber && (Number(value) === service.parseNumber(value));
            } else {
                isValidEntry = Number(value) === service.parseNumber(value);
            }
            break;
        case 'integer':
            if (strict) {
                isValidEntry = valueIsNumber && (Number(value) === service.parseInt(value));
            } else {
                isValidEntry = Number(value) === service.parseInt(value);
            }
            break;
        case 'boolean':

            var parsed = service.parseBoolean(value);

            //Only accept true booleans
            if (strict) {
                if (value === true || value === false) {
                    isValidEntry = value === parsed;
                }
            } else {
                isValidEntry = parsed === true || parsed === false;
            }
            break;
        case 'reference':
            if (strict) {
                isValidEntry = String(value) === service.id(value);
            } else {
                isValidEntry = !!service.id(value);
            }
            break;
        case 'string':
            var checkString = String(value);
            if (strict) {
                if (typeof value != 'string') {
                    return false;
                }
            }

            if (checkString == '[object Object]') {
                return false;
            }

            isValidEntry = true;
            break;
            // case 'group':
            //     isValidEntry = _isObject(value);
            //     break;
        case 'object':


            isValidEntry = _isObject(value) && !Array.isArray(value);
            break;
        case 'array':
            isValidEntry = Array.isArray(value);
            break;
    }

    ////////////////////////

    return isValidEntry
}

service.parseBoolean = function(value) {
    switch (String(value).toLowerCase()) {
        case 'true':
        case 'y':
        case 'yes':
        case '1':
        case 't':
            value = true;
            break;
        case 'false':
        case 'n':
        case 'no':
        case '0':
        case 'f':
        case 'undefined':
        case 'null':
        case '':
        case '-1':
            value = false;
            break;
    }

    return !!value;
}




///////////////////////////////////////////////////////////////////////////////

service.clone = function(input) {
    return JSON.parse(JSON.stringify(input));
}

///////////////////////////////////////////////////////////////////////////////

service.mapFields = function(fields, options) {

    if (!options) {
        options = {};
    }

    //////////////////////////////

    var output = [];
    var trail = [];
    var titles = [];
    var currentDepth = 1;
    var depthLimit = options.depth;
    var delimiter = options.arrayDelimeter || '[]';


    //Loop through each field
    fields.forEach(mapField);

    //////////////////////////////

    //Recursively map the fields
    function mapField(field, i) {
        var fieldKey = field.key;
        var isGroup = field.type == 'group';
        var singleValue = (field.minimum === field.maximum) && field.minimum === 1;
        var asObject = field.asObject; // || (isGroup && singleValue);
        var isLayout = isGroup && !asObject;

        //////////////////////////////////

        // Whether to clone the field or use the existing reference
        var mapped = options.original ? field : service.clone(field);

        mapped.trail = trail.slice();
        mapped.trail.push(fieldKey)
        
        mapped.path = mapped.trail.join('.');
        mapped.titles = titles.slice();
        mapped.titles.push(field.title || fieldKey)

        
        const isNotLayoutOrIsAllowed = (!isLayout || options.includeLayout);
        
        //If its an actual element or we've asked to include
        //layout only elements
        if (isNotLayoutOrIsAllowed) {
            //Add it to the mix
            output.push(mapped);
        }

        //////////////////////////////////

        //Now see if there are child fields and should we go further
        var limitHit = depthLimit && (currentDepth >= depthLimit);

        //If there are child fields for this field
        if (field.fields && field.fields.length) {
            //If it's just a group with no extra key
            if (isLayout) {
                //Loop through fields as if they are at the same depth
                field.fields.forEach(mapField)
            } else {

                //We don't need to traverse any further
                //because we hit the limit
                if (limitHit) {
                    return;
                }

                //Move down a level and add to the object
                //Include the key in the path trail
                currentDepth++;

                let injectKey = fieldKey;
                if(options.includeArrayDelimeter) {
                    if(!singleValue) {
                        injectKey = `${fieldKey}${delimiter}`
                    }
                }
                trail.push(injectKey)
                titles.push(field.title || fieldKey);

                //Loop through each field
                field.fields.forEach(mapField)

                //Move back up a level before we go to the next field
                currentDepth--;
                trail.pop();
                titles.pop();
            }

        }

    }

    return output;
}

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
service.mapParameters = function(parameters) {

    var array = [];

    for (var key in parameters) {

        var value = parameters[key];

        if (value === undefined || value === null || value == false) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(function(v) {
                array.push(`${key}=${encodeURIComponent(v)}`);
            })
        } else {
            array.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
    }

    return array.join('&');

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
service.formatCurrency = function(value, currency) {

    if (!value || isNaN(value)) {
        value = 0;
    }

    var currencyPrefix = service.currencySymbol(currency);
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
service.currencySymbol = function(currency) {
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



service.getAvailableCurrencies = function(DefaultCountryID) {


    var array = [];

    array.push({
        name: `USD (${service.currencySymbol("usd")})`,
        value: "usd",
        countryCode: { 'US': true },
    });

    array.push({
        name: `GBP (${service.currencySymbol("gbp")})`,
        value: "gbp",
        countryCode: { 'GB': true, 'UK': true },
    });

    array.push({
        name: `CAD (${service.currencySymbol("cad")})`,
        value: "cad",
        countryCode: { 'CA': true },
    });

    array.push({
        name: `AUD (${service.currencySymbol("aud")})`,
        value: "aud",
        countryCode: { 'AU': true },
    });


    array.push({
        name: `NZD (${service.currencySymbol("nzd")})`,
        value: "nzd",
        countryCode: { 'NZ': true },
    });

    array.push({
        name: `SGD (${service.currencySymbol("sgd")})`,
        value: "sgd",
        countryCode: { 'SG': true },
    });


    if (DefaultCountryID) {

        var findMatch = array.findIndex(function(currency) {
            return currency.countryCode[DefaultCountryID];
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
 * Creates a fast keyed hash object from an array of items
 * @alias utils.hash
 * @param  {Array} array The array of items to convert into a hash
 * @param  {String} key The key or path to the property on each item to use as the hashed key
 * @return {Object} A key/value paired object
 * @example 
 * //Returns { jimbo:{id:'jimbo', title:'Jim Jones'}, {id:'roger', title:'Roger Fellow'} }
 * qik.utils.hash([{id:'jimbo', title:'Jim Jones'}, {id:'roger', title:'Roger Fellow'}], 'id');
 * 
 */
service.hash = function(items, key) {
    items = !Array.isArray(items) ? [] : items;
    return items.reduce(function(memo, item) {
        const k = _get(item, key);
        memo[k] = item;
        return memo;
    }, {});
}




//////////////////////////////////////////////////

/**
 * Returns a subset of values in an array that match a provided rule
 * @alias utils.extractFromArray
 * @param  {Array} array The array you want to extract values from
 * @param  {String} key The path to the child property you want to extract
 * @param  {Boolean} sum Whether to sum the extracted values together in total
 * @param  {Boolean} flatten Whether to flatten nested child arrays
 * @param  {Boolean} unique Whether to only return unique values
 * @param  {Boolean} exclude Whether to exclude null or undefined values
 * @param  {Object} options Pass through extra options for how to extract the values
 * @return {Array} An array of all values retrieved from the array, unless provided arguments require otherwise
 * @example 
 * //Returns [12, 45] as all the values
 * qik.utils.extractFromArray([{name:'Wendy', age:12}, {name:'Roger', age:45}], 'age');
 * 
 * //Returns 32
 * qik.utils.extractFromArray([{name:'Wendy', age:12}, {name:'Roger', age:20}], 'age', {sum:true});
 * 
 */
service.extractFromArray = function(array, key, sum, flatten, unique, exclude, options) {

    options = options || {}

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
    var extractedValues = array.reduce(function(set, entry) {
        //Get the value from the object
        var retrievedValue = _get(entry, key);

        var isNull = (!retrievedValue && (retrievedValue !== false && retrievedValue !== 0));
        if (options.excludeNull && isNull) {
            return set;
        }

        set.push(retrievedValue);
        return set;
    }, [])

    if (options.flatten) {
        extractedValues = _.flatten(extractedValues);
    }

    if (options.unique) {
        extractedValues = _.uniq(extractedValues);
    }

    if (options.sum) {
        extractedValues = extractedValues.reduce(function(a, b) {
            return a + b;
        }, 0);
    }

    return extractedValues;
}


//////////////////////////////////////////////////////

/**
 * A function that can return a selection of values that were found in an array that match a specific rule,
 * This is often used to evaluate expressions within form fields
 * @alias utils.matchInArray
 * @param  {Array} array The array to check
 * @param  {String} key The javascript dot notation path to extract
 * @param  {String} value The value to compare against
 * @param  {String} comparator The logical operator to use to compare the extracted value with the provided value ('>', '<', '>=', '<=', 'in', '==') Defaults to '==' (Is equal to)
 * @return {Array} Returns an array of matching values
 * @example 
 * //Returns [{name:'Michael', age:45}] as that is only item in the array that matches the criteria
 * qik.utils.matchInArray([{name:'Wendy', age:12}, {name:'Michael', age:45}], 'age', 45, '>=');
 * 
 */
service.matchInArray = function(array, key, v, comparator) {

    //Filter the array options by a certain v and comparator
    var matches = array.filter(function(entry) {
        //Get the v from the object
        var extracted = _get(entry, key);
        var found;

        switch (comparator) {
            case 'in':
                found = extracted.includes(v);
                break;
            case '>=':
                found = (extracted >= v);
                break;
            case '<=':
                found = (extracted <= v);
                break;
            case '<':
                found = (extracted < v);
                break;
            case '>':
                found = (extracted > v);
                break;
            case '==':
            default:
                if (v === undefined) {
                    found = extracted;
                } else {
                    found = (extracted == v);
                }
                break;
        }

        return found;
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
service.comma = function(array, path, limit) {

    if (limit) {
        array = array.slice(0, limit);
    }

    return _.chain(array)
        .compact()
        .map(function(item) {
            if (path && path.length) {
                return _get(item, path);
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
 * typeof service.id({_id:'5cb3d8b3a2219970e6f86927', title, ...}) == 'string';

 * //Returns true
 * typeof service.id({_id:'5cb3d8b3a2219970e6f86927'}, true) == 'object';
 */
service.id = function(source) {

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

service.ids = function(array) {

    if (!array) {
        return [];
    }

    /////////////////////////////////

    var ids = Object.keys(array.reduce(function(set, entry) {

        if (!entry) {
            return set;
        }

        var cleaned = service.id(entry)

        if (cleaned) {
            set[cleaned] = 1;
        }

        return set;
    }, {}))

    ///////////////////////////////

    return ids;
}


///////////////////////////////////////////////////////////////////////////////

service.isValidID = function(input) {
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
service.errorMessage = function(err) {

    if (!err) {
        return;
    }


    if (Array.isArray(err)) {
        err = err[0];
    }

    ////////////////////////////////////


    var candidates = [
        'response.data.message',
        'response.data',
        'message',
    ]

    var message;

    candidates.forEach(function(path) {
        if (message) {
            return;
        }

        var m = _get(err, path);
        if (m) {
            message = m;
        }
    })

    if (Array.isArray(message)) {
        message = message[0];
    }

    ////////////////////////////////////

    message = message || JSON.stringify(err);

    ////////////////////////////////////

    return message;
}

////////////////////////////////////

/**
 * Generates a globally unique ID, helpful for adding unique keys for iterable loops
 * @alias utils.guid
 * @return {String}            The new globally unique identifier
 * @example 
 * //Returns 4323a78br-z16h-289j-zwl1-938lda334asd
 * qik.utils.guid()
 */
service.guid = function() {
    var u = (new Date()).getTime().toString(16) + Math.random().toString(16).substring(2) + "0".repeat(16);
    return u.substr(0, 8) + '-' + u.substr(8, 4) + '-4000-8' + u.substr(12, 3) + '-' + u.substr(15, 12);
}




////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

/**
 * Helper function for cleaning strings to use as database ids
 * @alias utils.machineName
 * @param  {String} string The string to clean eg. (Awesome Event!)
 * @return {String}     A cleaned and formatted string eg. (awesomeEvent)
 */
service.machineName = function(string) {
    if (!string || !string.length) {
        return;
    }

    var regexp = /[^a-zA-Z0-9-_]+/g;
    var cleaned = String(string).replace(regexp, ' ');
    return _camelCase(cleaned);
}

/////////////////////////////////////////////
/////////////////////////////////////////////
/////////////////////////////////////////////


export default service;


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
            //For each listener
            listeners[event].forEach(function(callback) {
                return callback(details);
            });
        }
    }

    /////////////////////////////////////////////

    dispatcher.addEventListener = function(event, callback) {

        if (!listeners[event]) {
            listeners[event] = [];
        }

        const type = typeof callback;
        if(type !== 'function') {
            throw new Error(`addEventListener() requires a function but ${type} was added`);
        } else {
            if (listeners[event].indexOf(callback) == -1) {
                //Add to the listeners
                listeners[event].push(callback)
            } else {
                //A
                //lready listening
            }
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