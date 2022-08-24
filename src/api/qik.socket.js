import { EventDispatcher } from './qik.utils.js';

///////////////////////////////////////////////////



const QikSocket = function(qik, mode) {

    mode = mode || 'production';

    if (!qik.auth) {
        throw new Error(`Can't Instantiate QikSocket before QikAuth exists`);
    }

    ///////////////////////////////////////////////////

    var service = {
        debug: false,
        url: `wss://iqtm6zjz3l.execute-api.ap-southeast-2.amazonaws.com/${mode}`,
        connected:false,
    }

    var socket;
    var timer;
    var buckets = {};


    //Create a new dispatcher
    var dispatcher = new EventDispatcher();
    dispatcher.bootstrap(service);

    ///////////////////////////////////////////////////

    function getSubscriptions() {
        return Object.keys(buckets);
    }    

    ///////////////////////////////////////////////////

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
        
        console.log('subscribe', key, service.connected);
        // Subscribe to this channel
        service.subscribe(key);

        // Listen for all relevant events
        service.addEventListener(key, dispatchMessage);

        function dispatchMessage(message) {
            console.log('Dispatch a message now', key, message)
            bucket.dispatch('message', message);
        }

        // Destroy the service
        bucket.destroy = function() {
            service.removeEventListener(key, dispatchMessage);
            buckets[key] = null;
            console.log('destroyed', key);
        }

        return buckets[key];
    }

    ///////////////////////////////////////////////////

    function ping() {
        console.log('ping');
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
        service.debug ? console.log("[socket] Connection open") : null;
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
                     console.log('connected successfully')
                    return resolve(socket);
                }

                console.log('check in a second')
                setTimeout(check, 1000);
            }

            check();
        })
    }

    ///////////////////////////////////////////////////

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

        socket = new WebSocket(`${service.url}?access_token=${accessToken}`);
        socket.addEventListener('close', socketClosed);
        socket.addEventListener('error', socketError);
        socket.addEventListener('open', socketOpened);
        socket.addEventListener('message', socketMessageReceived);
        service.debug ? console.log('[socket] - Connected with event listeners') : null;

        return wait();
    }

    ///////////////////////////////////////////////////

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