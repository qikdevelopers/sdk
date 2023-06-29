import { EventDispatcher } from './qik.utils.js';

///////////////////////////////////////////////////

/**
 * Creates a new instance of QikSocket a module of the SDK
 * that contains all helper functions to do with realtime sockets
 * @name socket
 * @constructor
 * @hideconstructor
 * @param {QikAPI} qik A reference to the parent instance of the QikCore module. This module is usually created by a QikCore instance that passes itself in as the first argument.
 */

const QikSocket = function(qik, mode) {

    mode = mode || 'production';

    if (!qik.auth) {
        throw new Error(`Can't Instantiate QikSocket before QikAuth exists`);
    }


    const windowID = qik.utils.guid();

    ///////////////////////////////////////////////////

    let service = {
        debug: false,
        url: `wss://iqtm6zjz3l.execute-api.ap-southeast-2.amazonaws.com/${mode}`,
        connected:false,
        windowID,
    }

    let socket;
    let timer;
    let buckets = {};



    //Create a new dispatcher
    const dispatcher = new EventDispatcher();
    dispatcher.bootstrap(service);

    ///////////////////////////////////////////////////

    function getSubscriptions() {
        return Object.keys(buckets);
    }    

    ///////////////////////////////////////////////////


    /**
     * @description Create an event dispatcher instance and subscribe to a new socket channel.
     * This can then be used to receive socket events for this channel
     * @alias socket.channel
     * @param  {String} key The key or name of the channel to subscribe to
     * @example
     * const socketChannel = await sdk.socket.channel('awesome:notifications')
     * socketChannel.addEventListener('message', function(message) {
     *    console.log('Received a new message from the socket')
     * })
     *
     * // Disconnect from this channel and remove all listeners
     * socketChannel.destroy();
     * 
     */
    service.channel = async function(key) {
        if(buckets[key]) {
            return buckets[key];
        }

        const bucket = new EventDispatcher();
        buckets[key] = bucket;

        if(!service.connected) {
            // Return the socket
            await service.connect();
        }
        
        // Subscribe to this channel
        service.subscribe(key);

        // Listen for all relevant events
        service.addEventListener(key, dispatchMessage);

        function dispatchMessage(message) {
            bucket.dispatch('message', message);
        }

        // Destroy the service
        bucket.destroy = function() {
            service.removeAllListeners();
            buckets[key] = null;
        }

        return buckets[key];
    }

    ///////////////////////////////////////////////////

    function ping() {
        broadcast({
            action: 'ping',
        })
    }

    function startHeartbeat() {
        if(timer) {
            return;
        }
        timer = setInterval(ping, 10000);
    }

    function stopHeartbeat() {
        if(!timer) {
            return;
        }

        clearInterval(timer)
        timer = null;
    }

    ///////////////////////////////////////////////////

    function socketOpened(event) {
        service.debug ? console.log("[socket] Connection open", event) : null;
        service.connected = true;
        
        dispatcher.dispatch('connected', event);
        
        // startHeartbeat();
    }

    function socketClosed(event) {
        if (event.wasClean) {
            service.debug ? console.log(`[socket] Connection closed cleanly, code=${event.code} reason=${event.reason}`) : null;
        } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            service.debug ? console.log('[socket] - connection closed due to error', event) : null
        }

        service.connected = false;
        dispatcher.dispatch('disconnected', event);
        socket = null;
        // stopHeartbeat();
    }

    function socketError(error) {
        console.log('[event] socketError', event);
        service.debug ? console.log("[socket] Error", error) : null;
        dispatcher.dispatch('error', error);
    }

    function socketMessageReceived(event) {
        const eventData = JSON.parse(event.data);
        service.debug ? console.log("[socket] message received", eventData) : null;

        // Dispatch a generic message
        dispatcher.dispatch('message', eventData);

        if (eventData.channel) {
            dispatcher.dispatch(eventData.channel, eventData);
        }
    }

    async function broadcast(data) {
        socket.send(JSON.stringify(data));
    }

    ///////////////////////////////////////////////////

    function wait() {
        return new Promise(function(resolve) {
            function check() {
                if(service.connected) {
                    return resolve(socket);
                }

                setTimeout(check, 1000);
            }

            check();
        })
    }

    ///////////////////////////////////////////////////

    /**
     * @description Connect to the socket service
     * @alias socket.connect
     * @example
     * const connected = await sdk.socket.connect()
     * 
     */
    service.connect = async function() {
        if (socket) {

            if(!socket.connected) {
                return wait();
            }

            console.log('[socket] - Socket is already connected');
            return socket;
        }

        const accessToken = qik.auth.getCurrentToken();

        if (!accessToken) {
            service.debug ? console.log('[socket] - Must be authenticated to connect to socket') : null;
            return;
        }

        socket = new WebSocket(`${service.url}?access_token=${accessToken}&windowid=${windowID}`);
        socket.addEventListener('close', socketClosed);
        socket.addEventListener('error', socketError);
        socket.addEventListener('open', socketOpened);
        socket.addEventListener('message', socketMessageReceived);
        service.debug ? console.log('[socket] - Connected with event listeners') : null;

        return wait();
    }

    ///////////////////////////////////////////////////

    /**
     * @description Close the connection to the socket service
     * @alias socket.close
     * @example
     * const closed = await sdk.socket.close()
     * 
     */
    service.close = async function() {
        if (!socket) {
            console.log('[socket] - Socket is not connected');
            return;
        }

        socket.close();
        socket.removeEventListener('close', socketClosed);
        socket.removeEventListener('error', socketError);
        socket.removeEventListener('open', socketOpened);
        socket.removeEventListener('message', socketMessageReceived);
        socket = null;
        socketClosed({ wasClean: true });
    }

    service.disconnect = service.close;

    ///////////////////////////////////////////////////

    /**
     * @description Subscribe to a socket channel
     * @alias socket.subscribe
     * @param  {String} key The name of the channel to subscribe to
     * @example
     * const subscribed = await sdk.socket.subscribe('some:cool:alert')
     * 
     */
    service.subscribe = async function(channel) {
        if (!socket) {
            console.log(`[socket] - Can't subscribe to channel as socket is not connected`);
            return;
        }

        broadcast({
            action: 'subscribe',
            channel,
        })

        dispatcher.dispatch('subscribe', channel)
        service.debug ? console.log(`[socket] - subscribed to ${channel}`) : null;
    }

    ///////////////////////////////////////////////////

    /**
     * @description Unsubscribe from a socket channel
     * @alias socket.unsubscribe
     * @param  {String} key The name of the channel to unsubscribe from
     * @example
     * const unsubscribed = await sdk.socket.unsubscribe('some:cool:alert')
     * 
     */
    service.unsubscribe = async function(channel) {
        if (!socket) {
            console.log(`[socket] - Can't unsubscribe from channel as socket is not connected`);
            return;
        }

        broadcast({
            action: 'unsubscribe',
            channel,
        })

        dispatcher.dispatch('unsubscribe', channel)
        service.debug ? console.log(`[socket] - unsubscribed from ${channel}`) : null;
    }

    ///////////////////////////////////////////////////

    return service;

}


export default QikSocket;