import axios from 'axios';
import _ from 'lodash';

///////////////////////////////////////////////////

/**
 * Creates a new QikContent instance.
 * This module provides a number of helper functions for creating, reading, updating and deleting content
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

    ///////////////////////////////////////////////////

    /**
     * 
     * Retrieves the glossary of content types available to the user
     * @alias content.list
     * @param  {String} type The type or definition of records we want to retrieve
     * @example
     * 
     * QikContent.glossary()
     */

    const glossary = {}

    let inflightGlossaryRequest;

    service.glossary = async function(options) {
        options = options || {};

        var reload = options.refresh || options.reload || !glossary.data;


        if (reload) {

            if(!inflightGlossaryRequest) {
                inflightGlossaryRequest = qik.api.get(`/glossary`);
                inflightGlossaryRequest.then(resolveRequest, resolveRequest);
                function resolveRequest() {
                    inflightGlossaryRequest = null;
                }
            } else {
                console.log('request inflight')
            }
            
            const { data } = await inflightGlossaryRequest
            glossary.data = data;
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

    /**
     * 
     * Retrieves all available filter comparators for the various field types
     * @alias content.comparators
     * @example
     * 
     * QikContent.comparators()
     */

    const comparators = {}

    service.comparators = async function(options) {
        options = options || {};

        var reload = options.refresh || !comparators.data;

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
            if (fieldDefinition.validation) {
                var additionalValidationError = service.meetsValidationRequirements(input, fieldType, fieldDefinition.validation)
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




    // service.validateFieldValue = function(value, field, errorLog, options) {
    //     options = options || {};
    //     errorLog = errorLog || [];


    //     ///////////////////////////////////////////

    //     let { key, type } = field;
    //     let { minimum, maximum } = = getLimits(field);
    //     let existingValue = value;

    //     let isLayout = field.type == 'group' && !field.asObject;

    //     if (isLayout) {
    //         var subFields = service.mapFields(field.fields, { depth: 1 });
    //         subFields.forEach(function(subField) {
    //             service.validateFieldValue(input, subField, errorLog, options);
    //         })
    //     } else {
    //         //If it's a group of fields
    //         if (isGroup && asObject) {
    //             //Get all the fields
    //             var subFields = service.mapFields(field.fields, { depth: 1 });

    //             //If the group is a single object
    //             if (maximum === 1) {
    //                 var groupObjectInput = existingValue;

    //                 //Loop through each field
    //                 subFields.forEach(function(subField) {
    //                     //Update the entry data
    //                     service.validateFieldValue(groupObjectInput, subField, errorLog, options);
    //                 })
    //             } else {

    //                 //Generate a new array
    //                 (existingValue || []).forEach(function(entry) {
    //                     //Loop through each field
    //                     subFields.forEach(function(subField) {
    //                         //Update the entry data
    //                         service.validateFieldValue(entry, subField, errorLog, options);
    //                     })
    //                 });
    //             }
    //         } else {
    //             //We're a standard field so just wash and set and move on
    //             var { valid, message } = service.validate(existingValue, field, options)

    //             if (!valid) {
    //                 errorLog.push({
    //                     field,
    //                     message,
    //                 })
    //             }
    //         }
    //     }
    // }



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
     * QikContent.list('profile', {
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
     * @param  {Object} data The data for our new record
     * @example
     * 
     * 
     * QikContent.create('profile', {
     *     firstName:'Michael',
     *     lastName:'Jordan',
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

    service.update = async function(id, input) {
        id = qik.utils.id(id);
        const { data } = await qik.api.put(`/content/${id}`, input);
        return data;
    }

    service.patch = async function(id, input) {
        id = qik.utils.id(id);
        const { data } = await qik.api.patch(`/content/${id}`, input);
        return data;
    }

    service.get = async function(id) {
        id = qik.utils.id(id);
        const { data } = await qik.api.get(`/content/${id}`);
        return data;
    }

    service.getFromID = async function(id) {
        console.log('getFromID is deprecated')
        return service.get(id);
    }

    service.delete = async function(id, input) {
        id = qik.utils.id(id);
        const { data } = await qik.api.delete(`/content/${id}`, input);
        return data;
    }

    service.restore = async function(id, input) {
        id = qik.utils.id(id);
        const { data } = await qik.api.get(`/content/${id}/restore`, input);
        return data;
    }



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