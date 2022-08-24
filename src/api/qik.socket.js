
import { EventDispatcher } from './qik.utils.js';

///////////////////////////////////////////////////

var QikSocket = function(qik, mode) {

    mode = mode || 'production';

    if (!qik.auth) {
        throw new Error(`Can't Instantiate QikSocket before QikAuth exists`);
    }

    ///////////////////////////////////////////////////

    var service = {
        debug:false,
        url: `wss://iqtm6zjz3l.execute-api.ap-southeast-2.amazonaws.com/${mode}`,
    }

    let socket;

  
    //Create a new dispatcher
    var dispatcher = new EventDispatcher();
    dispatcher.bootstrap(service);

    ///////////////////////////////////////////////////

    function socketOpened(event) {
        service.debug ? console.log("[socket] Connection open") : null;
        dispatcher.dispatch('connected', event);
    }

    function socketClosed(event) {
        if (event.wasClean) {
            service.debug ? console.log(`[socket] Connection closed cleanly, code=${event.code} reason=${event.reason}`) : null;
        } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            service.debug ? console.log('[socket] - connection closed due to error', event) : null
        }

        dispatcher.dispatch('disconnected', event);
        socket = null;
    }

    function socketError(error) {
        service.debug ? console.log("[socket] Error", error) : null;
        dispatcher.dispatch('error', error);
    }

    function socketMessageReceived(event) {
        const eventData = JSON.parse(event.data);
        service.debug ? console.log("[socket] message received", eventData) : null;
        
        // Dispatch a generic message
        dispatcher.dispatch('message', eventData);

        if(eventData.channel) {
            dispatcher.dispatch(eventData.channel, eventData);
        }
    }

    function broadcast(data) {
        socket.send(JSON.stringify(data));
    }


    ///////////////////////////////////////////////////

    service.connect = async function() {
        if(socket) {
            service.debug ? console.log('[socket] - Socket is already connected') : null;
            return;
        }

        const accessToken = qik.auth.getCurrentToken();

        if(!accessToken) {
            service.debug ? console.log('[socket] - Must be authenticated to connect to socket') : null;
            return;
        }
        socket = new WebSocket(`${service.url}?access_token=${accessToken}`);
        socket.onclose = socketClosed;
        socket.onerror = socketError;
        socket.onopen = socketOpened;
        socket.onmessage = socketMessageReceived;
    }

    ///////////////////////////////////////////////////

    service.disconnect = async function() {
        if(!socket) {
            service.debug ? console.log('[socket] - Socket is not connected') : null;
            return;
        }

        socket.close();
        socket.onclose = null;
        socket.onerror = null;
        socket.onopen = null;
        socket.onmessage = null;
        socket = null;
    }

    ///////////////////////////////////////////////////

    service.subscribe = async function(channel) {
        if(!socket) {
            service.debug ? console.log(`[socket] - Can't subscribe to channel as socket is not connected`)  : null;
            return;
        }

        broadcast({
            action:'unsubscribe',
            channel,
        })

        service.debug ? console.log(`[socket] - unsubscribed from ${channel}`)  : null;
    }

    ///////////////////////////////////////////////////

    service.unsubscribe = async function(channel) {
        if(!socket) {
            service.debug ? console.log(`[socket] - Can't unsubscribe from channel as socket is not connected`)  : null;
            return;
        }

        broadcast({
            action:'subscribe',
            channel,
        })

        service.debug ? console.log(`[socket] - subscribed to ${channel}`) : null;
    }

    ///////////////////////////////////////////////////

    return service;

}


export default QikSocket;