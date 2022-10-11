export default function(qik) {


    ///////////////////////

    var service = {};

    ///////////////////////

    service.downloadUrl = function(type, id, params, options) {
        options = options || {}
        params = params || {}
        params.download = true;
        id = qik.utils.id(id);
        return qik.api.generateEndpointURL(`/${type}/${id}`, params, options);
    }

    service.mediaUrl = function(type, id, params, options) {
        options = options || {}
        params = params || {}
        id = qik.utils.id(id);
        return qik.api.generateEndpointURL(`/${type}/${id}`, params, options);
    }

    ///////////////////////

    service.filesize = function(bytes) {
        var sizes = ['b', 'kb', 'mb', 'gb', 'tb'];
        if (bytes == 0) return '0 Byte';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + '' + sizes[i];
    }

    ///////////////////////

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
