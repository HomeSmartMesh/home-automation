import { useState, useEffect } from 'react';
import {    Grid,FormControlLabel, Switch} from '@mui/material';
import { connect } from "mqtt"

var mqtt_url = "ws://10.0.0.31:1884";
const options = {clientId : 'home_next_'+Math.random().toString(16).substr(2, 8)}
const mqtt_subscriptions = ["lzig/sonos front socket","lzig/sonos rear socket"]
const mqtt_control = {
    "front":"lzig/sonos front socket/set",
    "rear":"lzig/sonos rear socket/set",
}
let client = null


export default function PowerControl(){
    const [mqtt,setMqtt] = useState("nothing")
    const [checked_mqtt,setCheckedMqtt] = useState(false)
    const [checked_front,setCheckedFront] = useState(false)
    const [checked_rear,setCheckedRear] = useState(false)
    const [checked_power,setCheckedPower] = useState(false)

    useEffect(()=>{
        let isMounted = true
        if(client == null){
            client = connect(mqtt_url,options)
            client.on('connect', ()=>{
                console.log("connected")
                client.subscribe(mqtt_subscriptions)
                if(!isMounted){
                    console.log("component not mounted")
                    return
                }
                setMqtt("mqtt connected")
                setCheckedMqtt(true)
            })
            client.on('reconnect', () => {
                console.log("reconnecting")
                if(!isMounted){
                    console.log("component not mounted")
                    return
                }
                setMqtt("mqtt reconnecting")
                setCheckedMqtt(false)
            })
            client.on('error', (err)=>{
                console.log(err)
                client.end()
                if(!isMounted){
                    console.log("component not mounted")
                    return
                }
                setMqtt("mqtt error")
                setCheckedMqtt(false)
            })    
            client.on('close', ()=>{
                console.log("closed")
                if(!isMounted){
                    console.log("component not mounted")
                    return
                }
                setMqtt("mqtt disconnected")
                setCheckedMqtt(false)
                })
            client.on('message', (topic,msg)=>{
                if(!isMounted){
                    console.log("component not mounted")
                    return
                }
                const data = JSON.parse(msg)
                if(data === undefined){
                    console.log(`undefined msg : '${msg}'`)
                }
                else if("state" in data){
                    const data_state = ((data.state=="ON")?true:false)
                    if(topic.includes("front")){
                        console.log(`Front state = ${data.state}`)
                        setCheckedFront(data_state)
                        setCheckedPower(data_state || checked_rear)
                    }
                    else if(topic.includes("rear")){
                        console.log(`Rear state = ${data.state}`)
                        setCheckedRear(data_state)
                        setCheckedPower(data_state || checked_front)
                    }
                }
            })
        }else{
            console.log("client already initialized")
        }
    }, [])
    function powerControl(checked){
        if(checked){
            client.publish(mqtt_control.front,`{"state":"ON"}`)
            client.publish(mqtt_control.rear,`{"state":"ON"}`)
        }else{
            client.publish(mqtt_control.front,`{"state":"OFF"}`)
            client.publish(mqtt_control.rear,`{"state":"OFF"}`)
        }
        setCheckedPower(checked)
    }
      return (
        <Grid container columns={{ xs: 4, sm: 8, md: 12 }} sx={{margin:2}}>
        <Grid item>
            <FormControlLabel 
                label="Sonos Power"
                control={<Switch 
                    checked={checked_power}
                    onChange={(event)=>{powerControl(event.target.checked)}}
                />}  
            />
        </Grid>
        <Grid item>
            <FormControlLabel 
                label={mqtt} 
                control={<Switch 
                            checked={checked_mqtt}
                            disabled
                        />
                        } 
            />
            <FormControlLabel 
                label="Front"
                control={<Switch 
                            checked={checked_front}
                            disabled
                        />
                        } 
            />
            <FormControlLabel 
                label="Rear"
                control={<Switch 
                            checked={checked_rear}
                            disabled
                        />
                        } 
            />
        </Grid>
    </Grid>
    );
}
