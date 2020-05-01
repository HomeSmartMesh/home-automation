const {gql} = require('apollo-server-express')

const typeDefs = gql`
    type SensorData {
        temperature: Float!
        humidity: Float!
        pressure: Float!
        light: Float!
        last_seen: String!
    }

    type Subscription {
        subscribe2sensor(topic: String!): SensorData!
    }

    type Sensors {
        name: String!
    }

    type Query {
        sensors: [Sensors!]!
    }

    schema {
        query: Query
        subscription: Subscription
    }
`;

module.exports = { typeDefs };
