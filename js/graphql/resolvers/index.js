const { connect } = require('mqtt');
const { MQTTPubSub } = require('graphql-mqtt-subscriptions');

function defined(obj){
    return (typeof(obj) != "undefined")
}

const client = connect('mqtt://10.0.0.42:1883', {
    reconnectPeriod: 1000
});

const pubsub = new MQTTPubSub({
    client
});

const resolvers = {
    Query: {
        sensors: () => {
            return [{name: "Livingroom tag"}, {name: "Hallway tag"}];
        }
    },
    Subscription: {
        subscribe2sensor: {
            resolve: (payload) => {
                let res = {light:0,temperature:0}
                if(defined(payload.temperature)){
                    res.temperature = payload.temperature
                }
                if(defined(payload.humidity)){
                    res.humidity = payload.humidity
                }
                if(defined(payload.pressure)){
                    res.pressure = payload.pressure
                }
                if(defined(payload.light)){
                    res.light = payload.light
                }
                if(defined(payload.last_seen)){
                    res.last_seen = payload.last_seen
                }
                return res
            },
            subscribe: (_, args) => pubsub.asyncIterator([args.topic])
        }
    }
}

module.exports = { resolvers };
