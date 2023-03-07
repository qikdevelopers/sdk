import axios from 'axios';
import _ from 'lodash';

///////////////////////////////////////////////////

/**
 * Creates a new QikContent instance.
 * This module provides a number of helper functions for creating and modifying content via the REST API
 * @alias content
 * @constructor
 * @hideconstructor
 * @param {QikCore} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */
export default function(qik) {

    if (!qik.api) {
        throw new Error(`Can't Instantiate QikContent before QikAPI exists`);
    }

    ///////////////////////////////////////////////////

    var service = {
        debug: false,
    }


    ///////////////////////////////////////////////////////////////////////////////

    const variables = {}
    let inflightVariablesRequest;


    /**
     * 
     * Retrieves all global variables for the current user. This is often used when running custom code in an action.
     * @alias content.variables
     * @param  {Array} keys Provide specific keys of variables you want to retrieve
     * @param  {Object} options Additional options when making the request
     * @param  {Boolean} options.reload Force variables to reload and not be cached. If false will retrieve any variables that are already known from the in memory cache.
     * @example
     * 
     * const { OAUTH_CLIENT_ID, OAUTH_KEY } = await sdk.content.variables();
     */

    service.variables = async function(keys, options) {
        options = options || {};
        keys = keys || [];

        var reload = options.refresh || options.reload || !variables.data;
        if (reload) {
            if(!inflightVariablesRequest) {
                inflightVariablesRequest = qik.api.post(`/variables`, {keys});
                inflightVariablesRequest.then(resolveRequest, resolveRequest);
                function resolveRequest() {
                    inflightVariablesRequest = null;
                }
            }
            
            const { data } = await inflightVariablesRequest
            variables.data = data;
        }

        return variables.data;
    }

    ///////////////////////////////////////////////////

    

    const glossary = {}

    let inflightGlossaryRequest;

     /**
     * 
     * Retrieves the glossary of all content types visible to the requesting user. 
     By default this will include all fields, validation, expressions and other configuration
     * @alias content.glossary
     * @param  {Object} options Additional options
     * @param  {Boolean} options.hash Whether to return the data as a keyed object 
     allowing for fast selection of specific content types, by default will return as an array
     * @param  {Boolean} options.reload Force glossary to reload and not be cached.
      If false will retrieve content type data from the in memory cache
     * @example
     * 
     * const { article, profile } = await sdk.content.glossary({hash:true});
     */

    service.glossary = async function(options) {
        options = options || {};

        var reload = options.refresh || options.reload || !glossary.data;

        if (reload) {

            if(!inflightGlossaryRequest) {
                inflightGlossaryRequest = qik.api.get(`/glossary`, {cache:false});
                inflightGlossaryRequest.then(resolveRequest, resolveRequest);
                function resolveRequest() {
                    inflightGlossaryRequest = null;
                }
            }
            
            const { data } = await inflightGlossaryRequest
            glossary.data = data;
            qik.dispatch('glossary', data)
        }

        if (options.hash) {
            var result = qik.utils.hash(glossary.data, 'key');
            return result;
        }

        if (options.hex) {
            var result = qik.utils.hash(glossary.data, 'hex');
            return result;
        }

        return glossary.data;
    }



    ///////////////////////////////////////////////////

    

    const scopeGlossary = {}

    let inflightScopeGlossaryRequest;

     /**
     * 
     * Retrieves the scope glossary of all scopes the user can know about. This helps to convert a scope id into a human readable title.
     * @alias content.scopeGlossary
     * @param  {Object} options Additional options
     * @param  {Boolean} options.hash Whether to return the data as a keyed object with each scopes _id as the key
     allowing for fast selection of specific scopes, by default will return a structured tree
     * @param  {Boolean} options.reload Force the glossary to reload and not be cached.
      If false will retrieve content type data from the in memory cache
     * @example
     * 
     * const scopes = await sdk.content.scopeGlossary();
     */

    service.scopeGlossary = async function(options) {
        options = options || {};

        var reload = options.refresh || options.reload || !scopeGlossary.data;


        if (reload) {

            if(!inflightScopeGlossaryRequest) {
                inflightScopeGlossaryRequest = qik.api.get(`/scope/glossary`, {cache:false});
                inflightScopeGlossaryRequest.then(resolveRequest, resolveRequest);
                function resolveRequest() {
                    inflightScopeGlossaryRequest = null;
                }
            }
            
            const { data } = await inflightScopeGlossaryRequest
            scopeGlossary.data = data;
        }

        if (options.hash) {
            var result = qik.utils.hash(scopeGlossary.data, '_id');
            return result;
        }

        return scopeGlossary.data;
    }




    ///////////////////////////////////////////////////

    /**
     * 
     * Retrieves all available filter comparators for each data type
     * @alias content.comparators
     * @param  {Object} options Additional options
     * @param  {Boolean} options.reload Ignore any locally cached data
     * @example
     * const {hash, available, types} = await sdk.content.comparators();
     * console.log(available) // {boolean:[{title:'Is equal to', operator:'equal'...}]}
     * console.log(hash) // {equal:[{title:'Is equal to', operator:'equal'...}]}
     */


    const comparators = {}

    service.comparators = async function(options) {
        options = options || {};

        var reload = options.reload || options.refresh || !comparators.data;

        if (reload) {
            const { data } = await qik.api.get(`/system/comparators`);


            /////////////////////////////

            data.available = {};

            Object.entries(data.types).forEach(([key, value]) => {
                data.available[key] = value.map(function(comparatorKey) {
                    return data.hash[comparatorKey];
                })
            });


            /////////////////////////////

            comparators.data = data;
        }



        // if (options.hash) {
        //     var result = qik.utils.hash(comparators.data, 'key');
        //     return result;
        // }

        return comparators.data;
    }

    ///////////////////////////////////////////////////


    function getLimits(fieldDefinition) {

        var { minimum, maximum } = fieldDefinition;
        minimum = qik.utils.parseInt(minimum);
        minimum = Math.max(minimum, 0);

        maximum = qik.utils.parseInt(maximum);
        maximum = Math.max(maximum, 0); // cant be less than 0
        if (maximum == 0) {
            //Unlimited maximum
        } else {
            maximum = Math.max(maximum, minimum); // cant be less than the minimum
        }
        return { minimum, maximum };
    }


    

    service.meetsValidationRequirements = function(input, fieldType, validationCriteria) {

        if (validationCriteria.minLength) {
            var stringLength = String(input).length;
            if (stringLength < validationCriteria.minLength) {
                return `must be at least ${validationCriteria.minLength} characters`;

            }
        }

        if (validationCriteria.maxLength) {
            var stringLength = String(input).length;
            if (stringLength > validationCriteria.maxLength) {
                return `must be less than ${validationCriteria.maxLength} characters`;

            }
        }

        if (validationCriteria.minValue) {
            var number = Number(input);
            if (number < validationCriteria.minValue) {
                return `must be greater than ${validationCriteria.minValue}`;

            }
        }

        if (validationCriteria.maxValue) {
            var number = Number(input);
            if (number > validationCriteria.maxValue) {
                return `must be less than ${validationCriteria.maxValue}`;

            }
        }
    }

    /**
     * Checks if a certain input validates against a field definition
     * @alias content.validateField
     * @param  {Any} input The input to validate
     * @param  {Object} fieldDefinition The field to validate against
     * @param  {Object} options Additional options when calling the function
     * @example
     * const validationResult = await sdk.content.validateField('Johnny Bobbins', {title:'Name', key:'firstName', type:'string', minimum:1, maximum:1, ...});
     * console.log(validationResult) 
     * // Results in { valid:true }
     *
     * const validationResult = await sdk.content.validateField('Johnny Bobbins', {title:'Number', key:'number', type:'integer', minimum:1, maximum:1, ...});
     * console.log(validationResult) 
     * // Results in { valid:false, status:400, message:'Invalid number input for field' }
     */

    service.validateField = function(input, fieldDefinition, options) {
        options = options || {}

        var fieldType = fieldDefinition.type || 'string';
        var { minimum, maximum } = getLimits(fieldDefinition);

        var isObject = (fieldDefinition.type == 'group' && fieldDefinition.asObject);
        var singleValue = isObject ? minimum === maximum && maximum === 1 : maximum === 1;
        var multiValue = !singleValue;

        //////////////////

        var isNumeric;
        switch (fieldType) {
            case 'integer':
            case 'decimal':
            case 'number':
            case 'float':
                isNumeric = true;
                break;
        }

        //////////////////

        var inputWasProvided = qik.utils.exists(input);

        //If an answer is required 
        if (minimum) {
            //but none was provided
            if (!inputWasProvided) {
                //Throw an error
                return {
                    valid: false,
                    message: `${fieldDefinition.title} is a required field`,
                    status: 400,
                }
            }
        } else {
            //No answer is needed and none was provided
            if (!inputWasProvided) {
                return {
                    valid: true,
                }
            }
        }

        //////////////////


        //If we are requiring multiple values
        if (multiValue) {

            //But the input is not an array
            if (!Array.isArray(input)) {

                if (minimum) {
                    return {
                        valid: false,
                        message: `${fieldDefinition.title} requires at least ${minimum} values`,
                        status: 400,
                    }
                } else {

                    console.log('NOT PROVIDED AS ARRAY', fieldDefinition.title, input)
                    return {
                        valid: false,
                        message: `${fieldDefinition.title} must be provided as an array`,
                        status: 400,
                    }
                }
            }



            ////////////////////////////

            var compacted = input;

            compacted = compacted.filter(function(v) {
                //Check if we care about this value
                var empty = v === undefined || v === null || v === '';
                return !empty;
            })


            // console.log('COMPACTED', input.length, compacted.length);

            ////////////////////////////

            //We need an exact number of answers
            if (minimum == maximum) {

                //But we don't have the number of answers needed
                if (minimum && (compacted.length != minimum)) {
                    return {
                        valid: false,
                        message: `${fieldDefinition.title} requires exactly ${maximum} values`,
                        status: 400,
                    }
                }
            }

            //We have too many answers
            if (maximum && (compacted.length > maximum)) {

                return {
                    valid: false,
                    message: `${fieldDefinition.title} requires less than ${maximum+1} values`,
                    status: 400,
                }
            }

            //We don't have enough answers
            if (compacted.length < minimum) {

                // console.log(fieldDefinition.title, 'INPUT', input.length, minimum, input, compacted)

                return {
                    valid: false,
                    message: `${fieldDefinition.title} requires at least ${minimum} values`,
                    status: 400,
                }
            }

            ////////////////////////////

            var foundBadEntry;

            //Find any bad values
            var badEntry = compacted.find(function(val) {
                var valueFieldType = fieldType;

                if (fieldDefinition.type === 'group') {
                    valueFieldType = 'object';
                }

                if (fieldDefinition.type === 'reference' && fieldDefinition.widget === 'form') {
                    valueFieldType = 'object';
                }

                var isValid = qik.utils.isValidValue(val, valueFieldType, options.strict);

                ////////////////////////////

                if (!isValid) {
                    foundBadEntry = true;
                    return true;
                }

                ////////////////////////////

                //Is there additional validation requirements
                if (fieldDefinition.validation) {
                    var additionalValidationErrors = service.meetsValidationRequirements(val, fieldType, fieldDefinition.validation)
                    if (additionalValidationErrors) {
                        foundBadEntry = true;
                        return true;
                    }
                }
            })

            if (foundBadEntry) {
                let badValueMessage = `Invalid input for ${fieldDefinition.title}`;
                return {
                    valid: false,
                    message: badValueMessage,
                    status: 400,
                }
            }

        } else {

            var dataType = fieldType;
            var widgetType = fieldDefinition.widget;
            if (dataType === 'group') {
                dataType = 'object';
            }

            if (dataType === 'reference' && widgetType === 'form') {
                dataType = 'object';
            }


            //////////////////

            var cleanedValue = service.getCleanedValue(input, dataType, options);

           
            //////////////////

            var isValidValue = qik.utils.isValidValue(cleanedValue, dataType, options.strict);

            //////////////////

            //Invalid input
            if (!isValidValue) {
                return {
                    valid: false,
                    message: `Single value '${input}' is not a valid ${dataType} for ${fieldDefinition.title}`,
                    criteria: {
                        isValidValue,
                        cleanedValue,
                        fieldType,
                        options,
                    },
                    status: 400,
                }
            }

            //Is there additional validation requirements
            let hasAdditionalValidation = false;

            const validation = {}
            if(String(fieldDefinition.minValue)) { validation.minValue = parseInt(fieldDefinition.minValue); hasAdditionalValidation = true }
            if(String(fieldDefinition.maxValue)) { validation.maxValue = parseInt(fieldDefinition.maxValue); hasAdditionalValidation = true }
            if(String(fieldDefinition.minLength)) { validation.minLength = parseInt(fieldDefinition.minLength); hasAdditionalValidation = true }
            if(String(fieldDefinition.maxLength)) { validation.maxLength = parseInt(fieldDefinition.maxLength); hasAdditionalValidation = true }


            if (hasAdditionalValidation) {
                const validationCriteria = Object.assign({}, validation, fieldDefinition.validation || {});
                var additionalValidationError = service.meetsValidationRequirements(input, fieldType, validationCriteria)
                if (additionalValidationError) {
                    return {
                        valid: false,
                        message: additionalValidationError,
                        status: 400,
                    };
                }
            }
        }

        //////////////////

        return {
            valid: true,
        }

    }

    service.getCleanedValue = function(input, dataType, options) {
        switch (dataType) {
            case 'number':
            case 'float':
            case 'decimal':
                if (!qik.utils.exists(input)) {
                    return undefined;
                } else {
                    return Number(input);
                }
                break;
            case 'integer':
                if (!qik.utils.exists(input)) {
                    return undefined;
                } else {
                    return parseInt(input);
                }
                break;
            case 'boolean':
                if (!qik.utils.exists(input)) {
                    return undefined;
                }
                return qik.utils.parseBoolean(input);
                break;
            case 'email':
                return options.strict ? input : String(input).toLowerCase();
                break;
            case 'reference':
                return options.strict ? input : qik.utils.id(input);
                break;
            default:
                return options.strict ? input : qik.utils.cleanValue(input, dataType, options);
                break
        }

        return input;
    }

    ///////////////////////////////////////////////////

    /**
     * 
     * Retrieves a list of records matching the provided criteria
     * @alias content.list
     * @param  {String} type The type or definition of records we want to retrieve
     * @param  {Object} options The options for our query
     * @param  {String} options.search Freeform text keywords
     * @param  {Object} options.sort How to sort the results
     * @param  {String} options.sort.key Which key to sort on
     * @param  {String} options.sort.direction Which direction to sort on
     * @param  {Object} options.sort.type What type of data is being sorted
     * @param  {Object} options.page Page configuration
     * @param  {Number} options.page.size Page size
     * @param  {Number} options.page.index Page index
     * @param  {Object} options.filter How to filter the results
     * @example
     * 
     * 
     * sdk.content.list('profile', {
     *     search:'Jim',
     *     page:{
     *         size:50,
     *         index:2,
     *     },
     *     sort:{
     *         key:'age',
     *         direction:'asc',
     *         type:'integer',
     *     },
     *     filter:{
     *         operator:'and',
     *         filters:[{
     *             key:'age',
     *             comparator:'>',
     *             value:5,
     *         }],
     *     },
     * })
     */

    service.list = async function(type, options, advanced) {


        if (!advanced) {
            advanced = {};
        }

        if (advanced.cancellable) {

            if (!advanced.config) {
                advanced.config = {}
            }

            //Create a cancel token
            const CancelToken = qik.api.CancelToken;
            const source = CancelToken.source();
            advanced.config.cancelToken = source.token;

            const promise = qik.api.post(`/content/${type}/list`, options, advanced.config);
            return {
                promise,
                cancel(message) {
                    source.cancel(message || 'Operation canceled by the user.');
                },
            }

        } else {
            const { data } = await qik.api.post(`/content/${type}/list`, options, advanced.config);
            return data;
        }





    }

    ///////////////////////////////////////////////////

    /**
     * 
     * Create an item
     * @alias content.create
     * @param  {String} type The type or definition of the record we want to create
     * @param  {Object} input The data for our new record
     * @example
     * 
     * 
     * const result = await sdk.content.create('profile', {
     *     firstName:'Mickey',
     *     lastName:'Mouse',
     *     gender:'male',
     *     meta:{
     *       scopes:['61eca4746971e75c1fc670cf'],
     *     }
     * })
     */

    service.create = async function(type, input) {
        const { data } = await qik.api.post(`/content/${type}/create`, input);
        return data;
    }

    /**
     * 
     * Update an item, Only fields the user has permission to view will be returned
     * @alias content.update
     * @param  {String} id The id of the record we want to update
     * @param  {Object} input The data to update
     * @example
     * 
     * const result = await sdk.content.update('61eca4746971e75c1fc670cd', {
     *     firstName:'Minnie',
     *     lastName:'Mouse',
     *     gender:'female',
     *     meta:{
     *       scopes:['61eca4746971e75c1fc670cd'],
     *     }
     * })
     */
    service.update = async function(id, input) {
        id = qik.utils.id(id);
        const { data } = await qik.api.put(`/content/${id}`, input);
        return data;
    }

    /**
     * 
     * Partially update and patch an item, Only fields the user has permission to edit will be updated
     * @alias content.patch
     * @param  {String} id The id of the record we want to update
     * @param  {Object} input The data to update, this will be merged with existing data
     * @example
     * 
     * const result = await sdk.content.patch('61eca4746971e75c1fc670cd', {
     *     firstName:'Mickey',
     *     gender:'male',
     * })
     */
    service.patch = async function(id, input) {
        id = qik.utils.id(id);
        const { data } = await qik.api.patch(`/content/${id}`, input);
        return data;
    }

    /**
     * 
     * Get an item from the database, Only fields the user has permission to view will be returned
     * @alias content.get
     * @param  {String} id The id of the record we want to update
     * @example
     * 
     * const result = await sdk.content.get('61eca4746971e75c1fc670cd')
     */
    service.get = async function(id) {
        id = qik.utils.id(id);
        const { data } = await qik.api.get(`/content/${id}`);
        return data;
    }

    service.getFromID = async function(id) {
        return service.get(id);
    }

    /**
     * 
     * Delete an item from the database
     * @alias content.delete
     * @param  {String} id The id of the record we want to delete
     * @example
     * const result = await sdk.content.delete('61eca4746971e75c1fc670cd')
     */
    service.delete = async function(id, input) {
        id = qik.utils.id(id);
        const { data } = await qik.api.delete(`/content/${id}`, input);
        return data;
    }

    /**
     * 
     * Restore a deleted item from the database
     * @alias content.restore
     * @param  {String} id The id of the record we want to restore
     * @example
     * const result = await sdk.content.restore('61eca4746971e75c1fc670cd')
     */
    service.restore = async function(id, input) {
        id = qik.utils.id(id);
        const { data } = await qik.api.get(`/content/${id}/restore`, input);
        return data;
    }


    /**
     * 
     * Retrieve an item from the database by providing it's 'slug'
     * @alias content.getFromSlug
     * @param  {String} slug The slug id of the record we want to retrieve
     * it must be provided as either `(type):(slug)`` or `(definition):(slug)` 
     * (if unsure use the `meta.abs` absolute slug property of the item you are wanting to retrieve).
     * @example
     * const result = await sdk.content.getFromSlug('article:how-to-get-started')
     * const result = await sdk.content.getFromSlug('car:toyota-landcruiser')
     * const result = await sdk.content.getFromSlug('article:toyota-landcruiser')
     */
    service.getFromSlug = async function(slug) {
        const { data } = await qik.api.get(`/content/slug/${slug}`);
        return data;
    }

    // service.getFromSlug = async function(type, slug) {
    //     const { data } = await qik.api.get(`/content/${type}/slug/${slug}`);
    //     return data;
    // }

    // service.getFromExternalID = async function(type, externalID) {
    //     const { data } = await qik.api.get(`/content/${type}/external/${externalID}`);
    //     return data;
    // }


    return service;

}