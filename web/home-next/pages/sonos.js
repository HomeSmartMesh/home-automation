import { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {    Stack,FormControlLabel, Switch, Container,
            Button, Box, Slider,Snackbar, Alert} from '@mui/material';
import { connect } from "mqtt"

var mqtt_url = "ws://10.0.0.31:1884";
const sonos_url = 'http://10.0.0.31:5005/livingroom'
const safety_volume_jump_percent = 30
const connect_options = {clientId : 'next_sonos_'+Math.random().toString(16).substr(2, 8)}
const subscribe_options = {qos:2}
const publish_options = {qos:2, retain:false}
const mqtt_subscriptions = ["lzig/sonos front socket","lzig/sonos rear socket"]
const mqtt_control = {
    "front":"lzig/sonos front socket/set",
    "rear":"lzig/sonos rear socket/set",
}
let client = null

function delay(ms) {return new Promise(resolve => setTimeout(resolve, ms));}
    
async function getVolume(){
    const response = await fetch(`${sonos_url}/state`)
    if(response.ok){
        const state = await response.json()
        return state.volume
    }else{
        return Promise.reject(response.statusText)
    }
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

const WideSlider = styled(Slider)(({theme})=>({
    height:20,
    '& .MuiSlider-track': {
        border: 'none',
        height:20
      },
    '& .MuiSlider-rail': {
        opacity: 0.5,
        backgroundColor: '#bfbfbf',
      },
      '& .MuiSlider-thumb': {
        height: 68,
        width: 24,
        backgroundColor: '#fff',
        border: '2px solid currentColor',
        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
          boxShadow: 'inherit',
        },
        '&:before': {
          display: 'none',
        },
      },
      '& .MuiSlider-valueLabel': {
        lineHeight: 1.2,
        fontSize: 12,
        background: 'unset',
        padding: 0,
        width: 32,
        height: 32,
        borderRadius: '50% 50% 50% 0',
        backgroundColor: '#1976D2',
        transformOrigin: 'bottom left',
        transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
        '&:before': { display: 'none' },
        '&.MuiSlider-valueLabelOpen': {
          transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
        },
        '& > *': {
          transform: 'rotate(45deg)',
        },
      },
}))

const OnButton = styled(Button)(({ theme }) => ({
    color: theme.palette.getContrastText('#1976D2'),
    backgroundColor: '#1976D2',
    '&:hover': {backgroundColor: '#0C3C68'},
  }));
const OffButton = styled(Button)(({ theme }) => ({
    color: theme.palette.getContrastText('#BDBDBD'),
    backgroundColor: '#BDBDBD',
    '&:hover': {backgroundColor: '#757575'},
}));

export default function PowerControl(){
    const [mqtt,setMqtt] = useState("nothing")
    const [checked_mqtt,setCheckedMqtt] = useState(false)
    const [checked_front,setCheckedFront] = useState(false)
    const [checked_rear,setCheckedRear] = useState(false)
    const [available,setAvailable] = useState(false)
    const [speakerVolume,setSpeakerVolume] = useState(0)
    const [sliderVolume,setSliderVolume] = useState(0)
    const [limitWarning, setLimitWarning] = useState(false);
    const [limitMessage, setLimitMessage] = useState("volume limit");

    function updateVolume(){
        console.log('updating volume');
        getVolume().then((volume)=>{
            console.log(`fetched volume = ${volume} => Available`);
            setAvailable(true)
            setSliderVolume(volume)
            setSpeakerVolume(volume)
        }).catch((error)=>{
            console.log(`getVolume fetch failed with error '${error}' => Not Available`);
            setAvailable(false)
        })
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
            updateVolume()
            delay(1000).then(()=>{
                updateVolume()
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
        if(!available){
            delay(6000).then(()=>{
                updateVolume()
                delay(8000).then(()=>{
                    updateVolume()
                })
            })
        }
    }
    function switch_off(e){
        client.publish(mqtt_control.front,`{"state":"OFF"}`,publish_options)
        client.publish(mqtt_control.rear,`{"state":"OFF"}`,publish_options)
        setAvailable(false)
    }
    function handleSliderChange(newValue){
        const volume_diff = parseInt(newValue) - parseInt(speakerVolume)
        console.log(`volume diff = ${newValue} - ${speakerVolume} = ${volume_diff}`);
        if((volume_diff) < safety_volume_jump_percent){
            setSpeakerVolume(newValue)
            rest_setVolume(newValue)
            console.log(`published volume at '${newValue}'`)
        }else{
            const warning_message = `safety jump too high from ${speakerVolume} to ${newValue}`
            setSliderVolume(speakerVolume)
            setLimitMessage(warning_message)
            setLimitWarning(true)
        }
    }
    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
          return;
        }
        setLimitWarning(false);
      };
      return (
        <Container maxWidth="sm">
        <Stack direction="column" justifyContent="center" alignItems="center" spacing={1}>
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
            <OffButton variant="contained" color="error"  onClick={switch_off} sx={{height:60}}>Switch Off</OffButton>
                <Stack direction="column" justifyContent="center" alignItems="flex-start" spacing={0}>
                    <FormControlLabel 
                        label="Front"
                        control={<Switch checked={checked_front} disabled/>}
                    />
                    <FormControlLabel 
                        label="Rear"
                        control={<Switch checked={checked_rear} disabled/>} 
                    />
                </Stack>
                <OnButton variant="contained" onClick={switch_on} sx={{height:60}}>Switch On</OnButton>
            </Stack>
            <Box sx={{width:300}} pt={6}>
                <WideSlider value={sliderVolume}
                    disabled={!available}
                    min={0}
                    max={100}
                    onChange={(e,newValue)=>{
                        setSliderVolume(newValue)
                    }}
                    onChangeCommitted={(e,newValue)=>{
                        handleSliderChange(newValue)
                    }}
                    aria-label="Small steps"
                    valueLabelDisplay="on"
                />
            </Box>
            <FormControlLabel 
                label={mqtt} 
                control={<Switch checked={checked_mqtt} disabled/>} 
            />
        </Stack>
        <Snackbar open={limitWarning} onClose={handleClose} autoHideDuration={2000}>
            <Alert severity="warning" sx={{ width: '100%' }}>{limitMessage}</Alert>
       </Snackbar>
      </Container>
    );
}
