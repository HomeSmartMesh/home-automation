import { useState } from 'react';
import {    Paper, Grid,Box, Divider,
            Typography, Slider,  Stack } from '@mui/material';

import {Thermostat,MeetingRoom} from '@mui/icons-material';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SoupKitchenIcon from '@mui/icons-material/SoupKitchen';
import HomeIcon from '@mui/icons-material/Home';
import WeekendIcon from '@mui/icons-material/Weekend';
import LocalHotelIcon from '@mui/icons-material/LocalHotel';
import ComputerIcon from '@mui/icons-material/Computer';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';

import { styled } from '@mui/material/styles';
import CircularProgress, {circularProgressClasses} from '@mui/material/CircularProgress';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

const slider_config ={
  min:5,
  max:27,
  step:1
}

let slider_marks = [
  {value: 5,label: '5°',},
  {value: 27,label: '27°',},
];

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 5,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: theme.palette.mode === 'light' ? '#d02222' : '#308fe8',
  },
}));

function MUICircularProgress(props) {
  return (
    <Box sx={{ position: 'relative' }}>
      <CircularProgress
        variant="determinate"
        sx={{
          color: (theme) =>theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
        }}
        size={40}
        thickness={4}
        {...props}
        value={100}
      />
      <CircularProgress
        variant="determinate"
        sx={{
          color: (theme) => (theme.palette.mode === 'light' ? '#d02222' : '#308fe8'),
          animationDuration: '550ms',
          position: 'absolute',
          left: 0,
          [`& .${circularProgressClasses.circle}`]: {
            strokeLinecap: 'round',
          },
        }}
        size={40}
        thickness={4}
        {...props}
      />
    </Box>
  );
}

export default function RoomHeater({ room_id,room, onChange }) {
  const [value,setValue] = useState(12)

  let handle_metal = 0

  let current_heating_setpoint = 6
  if("current_heating_setpoint" in room.heater.data){
    current_heating_setpoint = room.heater.data.current_heating_setpoint
  }
  let handle_temperature = ""
  if("local_temperature" in room.heater.data){
    handle_temperature = "handle "+room.heater.data.local_temperature.toFixed(1)+"°"
  }

  let room_temperature = ""
  if(room.ambient.temperature != 0){
    room_temperature = room.ambient.temperature.toFixed(1)+"°"
    slider_marks = [{value: 5,label: '5°',},{value:room.ambient.temperature,label:"ambient"},{value: 27,label: '27°'}]
  }
  let metal_temperature = ""
  if("temperature" in room.metal.data){
    metal_temperature = "metal "+room.metal.data.temperature.toFixed(1)+"°"
    if("local_temperature" in room.heater.data){
      handle_metal = 100*(room.metal.data.temperature - room.heater.data.local_temperature)/60
    }
  }
  let pi_heating_demand = ("pi_heating_demand" in room.heater.data)?room.heater.data.pi_heating_demand:0
  let window_open = false
  if("eurotronic_host_flags" in room.heater.data){
    window_open = room.heater.data.eurotronic_host_flags.window_open
  }
  function get_icon(){
    if(room_id == "bathroom") return(<BathtubIcon/>)
    else if(room_id == "livingroom") return(<WeekendIcon/>)
    else if(room_id == "bedroom") return(<LocalHotelIcon/>)
    else if(room_id == "office") return(<ComputerIcon/>)
    else if(room_id == "kitchen") return(<SoupKitchenIcon/>)
    else return(<HomeIcon/>)
  }

  return(
  <div>
    <Box id="mainContent" m={1} >
      <Paper elevation={3} >
        <Box id="allCard" px={2} pt={1}>
          <Grid id="cardHeader" container alignItems="center" spacing={1}>
            <Grid item>{get_icon()} </Grid>
            <Grid item><Typography variant="h6" >{room.name}</Typography></Grid>
            <Grid item sx={{display: window_open?'block':'none'}}>
              <Stack direction="row" spacing={1} alignItems="center" >
                <Typography variant="h6" >window open</Typography>
                <MeetingRoom />
              </Stack>
            </Grid>
          </Grid>
          <Box px={1}>
            <Slider value={current_heating_setpoint}
                  getAriaValueText={()=>{`${value} °C`}}
                  min={slider_config.min}
                  max={slider_config.max}
                  step={slider_config.step}
                  marks={slider_marks}
                  onChange={(e,newValue)=>{
                    if(newValue != value){//required due to step but triggers on each pixel move
                      setValue(newValue)
                      onChange(room_id,newValue,false)
                    }
                  }}
                  onChangeCommitted={(e,newValue)=>{
                      onChange(room_id,newValue,true)
                  }}
                  aria-label="Small steps"
                  valueLabelDisplay="on"
              />
          </Box>
          <Divider light />
          <Stack  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="flex-start"
                  divider={<Divider orientation="vertical" flexItem />}
                  >
              <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
                <Thermostat/>
                <Typography variant="h6" >{room_temperature}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
                <SignalCellularAltIcon/>
                <Typography variant="h6" >{room.heater.last_seen_mn}</Typography>
              </Stack>
              <Stack direction="row"
                  alignItems="center"
                  justifyContent="center">
                <Typography variant="h6" >{(pi_heating_demand==0)?"closed":`open ${pi_heating_demand}%`}</Typography>
                <Box m={1}><MUICircularProgress value={pi_heating_demand}/></Box>
              </Stack>
              <Stack direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="center">
                <Typography variant="h6" >{handle_temperature}</Typography>
                <Box sx={{width:200, display: (handle_metal==0)?'none':'block'}}>
                  <BorderLinearProgress variant="determinate" value={handle_metal}/>
                </Box>
                <Typography variant="h6" sx={{ display: (handle_metal==0)?'none':'block' }}>{metal_temperature}</Typography>
              </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  </div>
  );
}
