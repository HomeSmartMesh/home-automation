graphql server that allows schema based subscription to sensor variables

# node
tested with node version v13.11.0

# Usage
```bash
  \raspi\js\graphql> npm install
  \raspi\js\graphql> node server.js
```
open [http://localhost:4000/graphql](http://localhost:4000/graphql) in the browser


## Queries
```javascript
subscription {
 subscribe2sensor(topic: "nrf/#") {
    temperature
    light
  }
}
```

```javascript
query{sensors{name}}
```

# Issues & Limitations
The sensors send alternatively different measures, how to make graphql send the existing data in the schema only without throwing an error and without having to fill unavailable vauels with 0.