import { useState, useReducer ,useEffect } from 'react';
import {    FormControlLabel, Switch} from '@mui/material';
import { connect } from "mqtt"
import RoomHeater from '../components/RoomHeater';


var mqtt_url = "ws://10.0.0.31:1884";
const connect_options = {clientId : 'next_heat_'+Math.random().toString(16).substr(2, 8)}
const subscribe_options = {qos:2}
const publish_options = {qos:2, retain:false}

const initial_state = {
    livingroom:{
        name:"Livingroom",
        heater:{
            topic:"lzig/living heat",
            last_seen_mn:"Not seen",
            data:{}
        },
        ambient:{
            topic:"nrf/livingroom tag",
            temperature:0
        },
        metal:{
            topic:"lzig/living heat weather",
            data:{}
        }
    },
    bedroom:{
        name:"Bedroom",
        heater:{
            topic:"lzig/bedroom heat",
            last_seen_mn:"Not seen",
            data:{}
        },
        ambient:{
            topic:"nrf/bedroom tag",
            temperature:0
        },
        metal:{
            topic:"lzig/bedroom heat weather",
            data:{}
        }
    },
    kitchen:{
        name:"Kitchen",
        heater:{
            topic:"lzig/kitchen heat",
            last_seen_mn:"Not seen",
            data:{}
        },
        ambient:{
            topic:"nrf/kitchen tag",
            temperature:0
        },
        metal:{
            topic:"lzig/kitchen heat weather",
            data:{}
        }
    },
    bathroom:{
        name:"Bathroom",
        heater:{
            topic:"lzig/bathroom heat",
            last_seen_mn:"Not seen",
            data:{}
        },
        ambient:{
            topic:"nrf/bathroom tag",
            temperature:0
        },
        metal:{
            topic:"lzig/bathroom heat weather",
            data:{}
        }
    },
    office:{
        name:"Office",
        heater:{
            topic:"lzig/office heat",
            last_seen_mn:"Not seen",
            data:{}
        },
        ambient:{
            topic:"nrf/office tag",
            temperature:0
        },
        metal:{
            topic:"lzig/office heat weather",
            data:{}
        }
    }
}

let client = null

function get_last_seen_minutes(sensor){
    let result = "No info"
    if("last_seen" in sensor){
      let diff = Date.now() - Date.parse(sensor["last_seen"]);
      if(diff < 0){
        diff = 0;//avoids small clocks discrepancies
      }
      let nb_min = Math.floor(diff / (60*1000));
      if(nb_min < 60){
        result = nb_min+" mn";
      }else if(nb_min > 60){
        let nb_h = Math.floor(nb_min / 60);
        result = nb_h+" h";
      }
    }
    return result
  }
  

function reducer(state, action){
    let result = {}
    if("temperature" in action){
        result[action.room_id] = state[action.room_id]
        result[action.room_id].ambient.temperature = action.temperature
    }else if("heater" in action){
        result[action.room_id] = state[action.room_id]
        result[action.room_id].heater.data = action.heater
        result[action.room_id].heater.last_seen_mn = get_last_seen_minutes(action.heater)
        //console.log(`${action.room_id} not seen since ${result[action.room_id].heater.last_seen_mn}`);
    }else if("setpoint" in action){
        result[action.room_id] = state[action.room_id]
        result[action.room_id].heater.data.current_heating_setpoint = action.setpoint
    }else if("metal" in action){
        result[action.room_id] = state[action.room_id]
        result[action.room_id].metal.data = action.metal
    }
    return {...state, ...result}
}

export default function PowerControl(){
    const [mqtt,setMqtt] = useState("nothing")
    const [checked_mqtt,setCheckedMqtt] = useState(false)
    const [rooms, dispatch] = useReducer(reducer, initial_state)
    
    function receive_data(topic,data){
        Object.entries(rooms).forEach(([id,room],index)=>{
            if(topic == room.heater.topic){
                dispatch({room_id:id, heater:data})
            }else if(topic == room.ambient.topic){
                if("temperature" in data){
                    dispatch({room_id:id, temperature:data.temperature})
                }
            }else if(topic == room.metal.topic){
                dispatch({room_id:id, metal:data})
            }
        })
    }

    useEffect(()=>{
        let isMounted = true
        if(client == null){
            client = connect(mqtt_url,connect_options)
            client.on('connect', ()=>{
                console.log("connected")
                client.subscribe(Object.entries(rooms).map(([key,room])=>(room.heater.topic)),subscribe_options)
                client.subscribe(Object.entries(rooms).map(([key,room])=>(room.ambient.topic)),subscribe_options)
                client.subscribe(Object.entries(rooms).map(([key,room])=>(room.metal.topic)),subscribe_options)
                if(!isMounted)return
                setMqtt("mqtt connected")
                setCheckedMqtt(true)
            })
            client.on('reconnect', () => {
                console.log("reconnecting")
                if(!isMounted)return
                setMqtt("mqtt reconnecting")
                setCheckedMqtt(false)
            })
            client.on('error', (err)=>{
                console.log(err)
                client.end()
                if(!isMounted)return
                setMqtt("mqtt error")
                setCheckedMqtt(false)
            })    
            client.on('close', ()=>{
                console.log("closed")
                if(!isMounted)return
                setMqtt("mqtt disconnected")
                setCheckedMqtt(false)
                })
            client.on('message', (topic,msg)=>{
                if(!isMounted)return
                const data = JSON.parse(msg)
                if(data === undefined){
                    console.log(`undefined msg : '${msg}'`)
                }
                else{
                    receive_data(topic,data);
                }
            })
        }else{
            console.log("client already initialized")
        }
    }, [])
    function handleSliderChange(room_id, newValue,exit){
        console.log(`room '${room_id}' to be set at '${newValue}'`)
        dispatch({room_id:room_id, setpoint:newValue})
        if(exit){
            let topic = rooms[room_id].heater.topic+"/set"
            let payload = JSON.stringify({current_heating_setpoint:newValue})
            client.publish(topic,payload,publish_options)
            console.log(`published '${room_id}' set at '${newValue}'`)
        }
    }
      return (
    <div>
        {Object.entries(rooms).map(([id,room],index)=>(
            <RoomHeater key={index}
            room_id={id}
            room={room}
            onChange={handleSliderChange}
            />
            ))
        }
        <FormControlLabel 
            label={mqtt} 
            control={<Switch 
                        checked={checked_mqtt}
                        disabled
                    />
                    } 
        />
    </div>
    );
}
