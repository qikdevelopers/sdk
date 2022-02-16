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
     * Retrieves a list of records matching the provided criteria
     * @alias content.list
     * @param  {String} type The type or definition of records we want to retrieve
     * @param  {Object} options The options for our query
     * @param  {Object} options.search Freeform text keywords
     * @param  {Object} options.sort How to sort the results
     * @param  {Object} options.filter How to filter the results
     * @example
     * 
     * 
     * QikContent.list('profile', {
     *     search:'Jim',
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

    service.list = async function(type, options) {

        console.log('Get the things', type, options);
        return qik.api.post(`/content/${type}/list`, options);
        
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

    service.create = async function(type, data) {
        return qik.api.post(`/content/${type}/create`, data);
        
    }


    return service;

}