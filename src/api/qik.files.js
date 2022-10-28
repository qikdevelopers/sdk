
/**
 * Creates a new Files Module instance.
 * This module provides a number of helper functions for interacting with binary file and media content via the REST API
 * @alias files
 * @constructor
 * @hideconstructor
 * @param {QikCore} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */
export default function(qik) {


    ///////////////////////

    var service = {};

    ///////////////////////

    /**
     * 
     * Get a valid download url for a specified record
     * @alias files.downloadUrl
     * @param  {String} type The type or definition of the item we want to generate the url for
     * @param  {(Object|String)} id The id or object with an _id property that we want to generate the url for
     * @param  {Object} params Additional parameters and options for the url
     * @example
     * const url = sdk.files.downloadUrl('image', '61eca4746971e75c1fc670cf', {w:100, h:100});
     * // https://api.qik.dev/image/61eca4746971e75c1fc670cf?w=100&h=100&download=true
     * 
     * const url = sdk.files.downloadUrl('image', {_id:'61eca4746971e75c1fc670cf'...}, {f:'png'});
     * // https://api.qik.dev/image/61eca4746971e75c1fc670cf?w=100&h=100&download=true
     */
    service.downloadUrl = function(type, id, params, options) {
        options = options || {}
        params = params || {}
        params.download = true;
        id = qik.utils.id(id);
        return qik.api.generateEndpointURL(`/${type}/${id}`, params, options);
    }

    /**
     * 
     * Get a valid media url for a specified image, video or audio item
     * @alias files.mediaUrl
     * @param  {String} type The type or definition of the item we want to generate the url for
     * @param  {(Object|String)} id The id or object with an _id property that we want to generate the url for
     * @param  {Object} params Additional parameters and options for the url
     * @example
     * const url = sdk.files.mediaUrl('image', '61eca4746971e75c1fc670cf', {w:100, h:100});
     * // https://api.qik.dev/image/61eca4746971e75c1fc670cf?w=100&h=100&download=true
     * 
     * const url = sdk.files.mediaUrl('image', {_id:'61eca4746971e75c1fc670cf'...}, {f:'png'});
     * // https://api.qik.dev/image/61eca4746971e75c1fc670cf?w=100&h=100&download=true
     */
    service.mediaUrl = function(type, id, params, options) {
        options = options || {}
        params = params || {}
        id = qik.utils.id(id);
        return qik.api.generateEndpointURL(`/${type}/${id}`, params, options);
    }

    ///////////////////////

    /**
     * 
     * Convert bytes to a human readable file size
     * @alias files.filesize
     * @param  {Integer} bytes The number of bytes
     * @example
     * const size = sdk.files.filesize(1500);
     * // 1.5kb
     */
    service.filesize = function(bytes) {
        var sizes = ['b', 'kb', 'mb', 'gb', 'tb'];
        if (bytes == 0) return '0 Byte';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + '' + sizes[i];
    }

    ///////////////////////

    /**
     * 
     * Get the basic primitive type of a file from it's mime type value
     * @alias files.getBinaryTypeFromMime
     * @param  {String} fileMime The mime type of the file
     * @example
     * const type = sdk.files.getBinaryTypeFromMime('image/svg+xml');
     * // 'image'
     *
     * const type = sdk.files.getBinaryTypeFromMime('video/webm');
     * // 'video'
     */
    service.getBinaryTypeFromMime = function(fileMime) {

        if (!fileMime) {
            return 'file';
        }

        ////////////////////////////////

        switch (fileMime) {
            case 'image/jpeg':
            case 'image/png':
            case 'image/gif':
            case 'image/bmp':
            case 'image/tiff':
            case 'image/svg+xml':
                return 'image';
                break;
            case 'video/mp4':
            case 'video/quicktime':
            case 'video/ogg':
            case 'video/webm':
                return 'video'
                break;
            case 'audio/aac':
            case 'audio/aiff':
            case 'audio/mp3':
            case 'audio/x-m4a':
            case 'audio/mpeg':
            case 'audio/ogg':
            case 'audio/wav':
            case 'audio/webm':
                return 'audio'
                break;
            default:
                //See if we can guess it from the first part of the mimetype
                var prefix = fileMime.split('/')[0];
                switch (prefix) {
                    case 'image':
                    case 'video':
                    case 'audio':
                        return prefix;
                        break;
                    default:
                        return 'file';
                        break;
                }
                break;
        }
    }

    ////////////////////////////////

    return service;

}
