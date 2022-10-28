///////////////////////////////////////////////////

/**
 * Creates a new QikSystem instance.
 * This module provides a number of helper functions for the system
 * @alias system
 * @constructor
 * @hideconstructor
 * @param {QikCore} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */
export default function(qik) {

    ///////////////////////////////////////////////////

    var service = {}


    ///////////////////////////////////////////////////////////////////////////////

    var inflightCountries;

    /**
     * @alias system.countries
     * @description Helper function for retrieving a full list of all countries, their ISO codes
     * and phone number prefixes. Helpful for populating dropdown lists.
     * @example
     * const countries = await sdk.system.countries()
     */
    service.countries = async function() {

        if (!inflightCountries) {

            inflightCountries = new Promise(async function(resolve, reject) {
                qik.api.get(`/system/countries`)
                    .then(function(res) {
                        return resolve(res.data);
                    })
                    .catch(reject);
            })
        }

        return inflightCountries;
    }

    ///////////////////////////////////////////////////

    return service;

}