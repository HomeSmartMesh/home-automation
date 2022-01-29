import { useState, useEffect } from 'react';
import {    Stack,FormControlLabel, Switch, Container,
            Button, ButtonGroup, Slider} from '@mui/material';
import { connect } from "mqtt"

var mqtt_url = "ws://10.0.0.31:1884";
const sonos_url = 'http://10.0.0.31:5005/livingroom'
const connect_options = {clientId : 'next_sonos_'+Math.random().toString(16).substr(2, 8)}
const subscribe_options = {qos:2}
const publish_options = {qos:2, retain:false}
const mqtt_subscriptions = ["lzig/sonos front socket","lzig/sonos rear socket"]
const mqtt_control = {
    "front":"lzig/sonos front socket/set",
    "rear":"lzig/sonos rear socket/set",
}
let client = null

async function getVolume(){
    const response = await fetch(`${sonos_url}/state`)
    const state = await response.json()
    console.log(`fetched volume = ${state.volume}`);
    return state.volume
}

async function rest_setVolume(volume){
    const response = await fetch(`${sonos_url}/volume/${volume}`)
    const resp = await response.json()
    if(("status" in resp) && (resp.status == "success")){
        console.log(`success`);
    }else{
        console.log(`fail`);
    }
}


export default function PowerControl(){
    const [mqtt,setMqtt] = useState("nothing")
    const [checked_mqtt,setCheckedMqtt] = useState(false)
    const [checked_front,setCheckedFront] = useState(false)
    const [checked_rear,setCheckedRear] = useState(false)
    const [volume,setVolume] = useState(0)

    useEffect(()=>{
        let isMounted = true
        if(client == null){
            client = connect(mqtt_url,connect_options)
            client.on('connect', ()=>{
                console.log("connected")
                client.subscribe(mqtt_subscriptions,subscribe_options)
                if(!isMounted){
                    console.log("component not mounted")
                    return
                }
                setMqtt("connected")
                setCheckedMqtt(true)
            })
            client.on('reconnect', () => {
                console.log("reconnecting")
                if(!isMounted){
                    console.log("component not mounted")
                    return
                }
                setMqtt("reconnecting")
                setCheckedMqtt(false)
            })
            client.on('error', (err)=>{
                console.log(err)
                client.end()
                if(!isMounted){
                    console.log("component not mounted")
                    return
                }
                setMqtt("error")
                setCheckedMqtt(false)
            })    
            client.on('close', ()=>{
                console.log("closed")
                if(!isMounted){
                    console.log("component not mounted")
                    return
                }
                setMqtt("disconnected")
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
                    const data_state = data.state.includes("ON")
                    if(topic.includes("front")){
                        console.log(`Front state = ${data_state}`)
                        setCheckedFront(data_state)
                    }
                    else if(topic.includes("rear")){
                        console.log(`Rear state = ${data_state}`)
                        setCheckedRear(data_state)
                    }
                }
            })

            getVolume().then((volume)=>{
                setVolume(volume)
            })
        }else{
            console.log("client already initialized")
        }
        return ()=>{
            client.end()
            client = null
        }
    }, [])
    function switch_on(e){
        client.publish(mqtt_control.front,`{"state":"ON"}`,publish_options)
        client.publish(mqtt_control.rear,`{"state":"ON"}`,publish_options)
        //todo delay then get volume
    }
    function switch_off(e){
        client.publish(mqtt_control.front,`{"state":"OFF"}`,publish_options)
        client.publish(mqtt_control.rear,`{"state":"OFF"}`,publish_options)
    }
    function handleSliderChange(newValue){
        rest_setVolume(newValue)
        console.log(`published volume at '${newValue}'`)
    }
      return (
        <Stack direction="column" justifyContent="center" alignItems="center" spacing={1}>
            <ButtonGroup sx={{m:2}} variant="contained" aria-label="outlined primary button group">
                <Button variant="contained" color="success" onClick={switch_on}>Switch On</Button>
                <Button variant="contained" color="error"  onClick={switch_off}>Switch Off</Button>
            </ButtonGroup>
            <Container maxWidth="sm">
                <Slider value={volume}
                    getAriaValueText={()=>{`${volume} %`}}
                    min={0}
                    max={100}
                    onChange={(e,newValue)=>{
                        setVolume(newValue)
                    }}
                    onChangeCommitted={(e,newValue)=>{
                        handleSliderChange(newValue)
                    }}
                    aria-label="Small steps"
                    valueLabelDisplay="on"
                />
            </Container>
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                <FormControlLabel 
                    label="Front"
                    control={<Switch checked={checked_front} disabled/>}
                />
                <FormControlLabel 
                    label="Rear"
                    control={<Switch checked={checked_rear} disabled/>} 
                />
            </Stack>
            <FormControlLabel 
                label={mqtt} 
                control={<Switch checked={checked_mqtt} disabled/>} 
            />
        </Stack>
    );
}
