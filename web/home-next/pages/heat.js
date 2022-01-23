import { useState, useEffect } from 'react';
import {    FormControlLabel, Switch} from '@mui/material';
import { connect } from "mqtt"
import RoomHeater from '../components/RoomHeater';



var mqtt_url = "ws://10.0.0.31:1884";
const connect_options = {clientId : 'next_heat_'+Math.random().toString(16).substr(2, 8)}
const subscribe_options = {qos:2}
const publish_options = {qos:2, retain:false}

const rooms = {
    livingroom:{
        name:"Livingroom",
        heater:{
            topic:"lzig/living heat",
            data:{}
        },
        sensor:{
            topic:"nrf/livingroom tag",
            data:{}
        }
    },
    bedroom:{
        name:"Bedroom",
        heater:{
            topic:"lzig/bedroom heat",
            data:{}
        },
        sensor:{
            topic:"nrf/bedroom tag",
            data:{}
        }
    },
    kitchen:{
        name:"Kitchen",
        heater:{
            topic:"lzig/kitchen heat",
            data:{}
        },
        sensor:{
            topic:"nrf/kitchen tag",
            data:{}
        }
    },
    bathroom:{
        name:"Bathroom",
        heater:{
            topic:"lzig/bathroom heat",
            data:{}
        },
        sensor:{
            topic:"nrf/bathroom tag",
            data:{}
        }
    },
    office:{
        name:"Office",
        heater:{
            topic:"lzig/office heat",
            data:{}
        },
        sensor:{
            topic:"nrf/office tag",
            data:{}
        }
    }
}

let client = null

export default function PowerControl(){
    const [mqtt,setMqtt] = useState("nothing")
    const [checked_mqtt,setCheckedMqtt] = useState(false)
    const [room_temp_list, setRoomTempList] = useState(new Array(5).fill(0))
    const [room_0_temp, setRoom0Temp] = useState(0)
    
    function receive_data(topic,data){
        Object.entries(rooms).forEach(([id,room],index)=>{
            if(topic == room.heater.topic){
                room.heater.data = data
                console.log(`heater update: ${topic}`)
            }
            else if(topic == room.sensor.topic){
                if("temperature" in data){
                    console.log(`room '${room.name}' temperature: ${data.temperature} : (${typeof(data.temperature)})`)
                    let temp_list = room_temp_list
                    temp_list[index] = data.temperature.toFixed(1)
                    setRoomTempList(temp_list)
                    if(index == 0){
                        setRoom0Temp(data.temperature.toFixed(1))
                    }
                }
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
                client.subscribe(Object.entries(rooms).map(([key,room])=>(room.sensor.topic)),subscribe_options)
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
    function handleSliderChange(topic, newValue){
        rooms[topic].target = newValue
        console.log(`room '${topic}' set at '${newValue}'`)
    }
      return (
    <div>
        {Object.entries(rooms).map(([id,room],index)=>(
            <RoomHeater key={index}
            room={id}
            roomName={room.name}
            roomData={room.heater.data}
            onChange={handleSliderChange}
            roomTemp={(index==0)?room_0_temp:room_temp_list[index]}
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
