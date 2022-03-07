///////////////////////////////////////////////////

/**
 * Creates a new QikSystem instance.
 * This module provides a number of helper functions for the system
 * @alias content
 * @constructor
 * @hideconstructor
 * @param {QikCore} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */
export default function(qik) {

    ///////////////////////////////////////////////////

    var service = {}


    ///////////////////////////////////////////////////////////////////////////////

    var inflightCountries;

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