import { useState, useEffect, useReducer } from 'react';
import { styled } from '@mui/material/styles';
import {    FormControlLabel, Switch, Container,Paper, Box, Grid,
            Card, CardMedia,CardContent,CardActions,
             Typography,Stack} from '@mui/material';
import { connect } from "mqtt"
import BoltIcon from '@mui/icons-material/Bolt';
import { SportsHockeyTwoTone } from '@mui/icons-material';

var mqtt_url = "ws://10.0.0.31:1884";
const connect_options = {clientId : 'next_power_'+Math.random().toString(16).substr(2, 8)}
const subscribe_options = {qos:2}
const publish_options = {qos:2, retain:false}

const initial_sockets = {
    poster:{
        topic:"lzig/poster socket",
        control:"lzig/poster socket/set",
        media_on:"/next/poster.png",
        media_off:"/next/poster-dark.png",
        state:false,power:0,disabled:false
    },
    lifx:{
        topic:"lzig/lifx socket",
        control:"lzig/lifx socket/set",
        media_on:"/next/lifx.png",
        media_off:"/next/lifx-dark.png",
        state:false,power:0,disabled:false
    },
    mesh:{
        topic:"lzig/wifi mesh socket",
        control:"lzig/wifi mesh socket/set",
        media_on:"/next/wifi-on.png",
        media_off:"/next/wifi-off.png",
        state:false,power:0,disabled:false
    },
    pc:{
        topic:"lzig/pc socket",
        control:"lzig/pc socket/set",
        media_on:"/next/pc.png",
        media_off:"/next/pc.png",
        state:false,power:0,disabled:true
    },
    //"waching machine":  {topic:"",state:false,power:0,disable:true},
    //dryer:              {topic:"",state:false,power:0,disable:true},
    //"dish washer":      {topic:"",state:false,power:0,disable:true},
    //microwave:          {topic:"",state:false,power:0,disable:true},
}

const mqtt_subscriptions = Object.entries(initial_sockets).map(([name,socket])=>socket.topic)

let client = null

function SocketCard({name,socket,onChange}){
    return(
        <Grid item>
            <Card sx={{ maxWidth: 345 }}>
                <CardMedia
                component="img"
                height="100"
                image={socket.state?socket.media_on:socket.media_off}
                alt={name}
                />
                <CardContent>
                    <Typography gutterBottom variant="h5" component="div">{name}</Typography>
                </CardContent>
                <CardActions>
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={8}
                        >
                    <FormControlLabel 
                    datakey={name}
                    label={""}
                    control={<Switch checked={socket.state} disabled={socket.disabled}/>}
                    onChange={(e)=>{onChange(e.target,name)}}
                    />
                    {socket.power?<Stack direction="row">
                                <BoltIcon/>
                                <Typography>{socket.power} W</Typography>
                                </Stack>:
                                <></>
                            }
                    </Stack>
                </CardActions>
            </Card>        
        </Grid>
    )
}

function reducer(state, action){
    let result = {}
    if(action.data){
        if("state" in action.data){
            result[action.name] = state[action.name]
            result[action.name].state = (action.data.state == "ON")
            //console.log(`${action.name} is now ${result[action.name].state}`)
        }
        if("power" in action.data){
            result[action.name] = state[action.name]
            result[action.name].power = action.data.power
            //console.log(`${action.name} is at ${result[action.name].power}`)
        }
    }
    else if("checked" in action){
        const socket = state[action.name]
        result[action.name] = socket
        result[action.name].state = action.checked
        if(action.checked){
            client.publish(socket.control,`{"state":"ON"}`,publish_options)
        }else{
            client.publish(socket.control,`{"state":"OFF"}`,publish_options)
        }
        console.log("now send mqtt command")
    }
    return {...state, ...result}
}

export default function PowerControl(){
    const [mqtt,setMqtt] = useState("nothing")
    const [checked_mqtt,setCheckedMqtt] = useState(false)
    const [sockets, dispatch] = useReducer(reducer, initial_sockets)

    function receive_data(topic,data){
        //console.log(`received : '${topic}'`)
        Object.entries(sockets).forEach(([name,socket],index)=>{
            //console.log(`check if '${name}' in ${topic}`)
            if(topic.includes(name)){
                dispatch({name, data})
            }
        })
    }

    function onChange(target,name){
        console.log(`${name} is now at ${target.checked}`)
        dispatch({name,checked:target.checked})
    }

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
                else{
                    receive_data(topic,data);
                }
            })
        }else{
            console.log("client already initialized")
        }
        return ()=>{
            client.end()
            client = null
        }
    }, [])
      return (
        <Container >
            <Grid pt={1} container direction="row"
            justifyContent="center" alignItems="center" spacing={{ xs: 2, md: 3 }}>
                {Object.entries(sockets).map(([name,socket],index)=>(
                    <SocketCard name={name} socket={socket} onChange={onChange} key={index}/>
                    ))}
            </Grid>
            <FormControlLabel 
                label={mqtt} 
                control={<Switch checked={checked_mqtt} disabled/>} 
            />
      </Container>
    );
}
