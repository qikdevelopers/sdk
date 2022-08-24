
import { EventDispatcher } from './qik.utils.js';

///////////////////////////////////////////////////

var QikSocket = function(qik, mode) {

    mode = mode || 'production';

    if (!qik.auth) {
        throw new Error(`Can't Instantiate QikSocket before QikAuth exists`);
    }

    ///////////////////////////////////////////////////

    var service = {
        url: `wss://iqtm6zjz3l.execute-api.ap-southeast-2.amazonaws.com/${mode}`,
    }

    let socket;

  
    //Create a new dispatcher
    var dispatcher = new EventDispatcher();
    dispatcher.bootstrap(service);

    ///////////////////////////////////////////////////

    function socketOpened(event) {
        console.log("[socket] Connection open");
        dispatcher.dispatch('connected');
    }

    function socketClosed(event) {
        if (event.wasClean) {
            console.log(`[socket] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            console.log('[socket] - connection closed due to error', event)
        }

        dispatcher.dispatch('disconnected', event.wasClean);
        socket = null;
    }

    function socketError(error) {
        console.log("[socket] Error", error);
        dispatcher.dispatch('error', error);
    }

    function socketMessageReceived(event) {
        const eventData = JSON.parse(event.data);
        console.log("[socket] Message received", eventData);
        
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
            console.log('[socket] - Socket is already connected')
            return;
        }

        const accessToken = qik.auth.getCurrentToken();

        if(!accessToken) {
            console.log('[socket] - Must be authenticated to connect to socket')
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
            console.log('[socket] - Socket is not connected')
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
            console.log(`[socket] - Can't subscribe to channel as socket is not connected`)
            return;
        }

        broadcast({
            action:'unsubscribe',
            channel,
        })
    }

    ///////////////////////////////////////////////////

    service.unsubscribe = async function(channel) {
        if(!socket) {
            console.log(`[socket] - Can't unsubscribe from channel as socket is not connected`)
            return;
        }

        broadcast({
            action:'subscribe',
            channel,
        })
    }

    ///////////////////////////////////////////////////

    return service;

}


export default QikSocket;