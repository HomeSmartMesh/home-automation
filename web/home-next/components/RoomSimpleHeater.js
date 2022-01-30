import { useState } from 'react';
import {    Paper, Grid,Box, Tooltip,
            Typography, Slider,  Stack } from '@mui/material';
import {Thermostat,MeetingRoom} from '@mui/icons-material';
import PropTypes from 'prop-types';
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

const HeatSlider = styled(Slider)(({theme})=>({
    '& .MuiSlider-valueLabel': {
      lineHeight: 1.2,
      fontSize: 14,
      background: 'unset',
      padding: 0,
      width: 32,
      height: 32,
      borderRadius: '50% 50% 50% 0',
      backgroundColor: '#1976D2b0',
      transformOrigin: 'bottom left',
      transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
      '&:before': { display: 'none' },
      '&.MuiSlider-valueLabelOpen': {
        transform: 'translate(50%, -100%) rotate(-30deg) scale(1)',
      },
      '& > *': {
        transform: 'rotate(45deg)',
      },
    },
}))

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
    slider_marks = [{value: 5,label: '5°',},{value:room.ambient.temperature,label:room_temperature},{value: 27,label: '27°'}]
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
  function preventHorizontalKeyboardNavigation(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
    }
  }
  return(
  <div>
    <Box id="mainContent" >
      <Paper elevation={1} >
        <Box id="allCard" pr={0} pt={1}>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
          {get_icon()}
          <MeetingRoom  sx={{display: window_open?'block':'none'}}/>
          </Stack>
          <Stack direction="column" justifyContent="flex-start" alignItems="center" spacing={1}>
          <Box pr={0} pb={2} pt={6} sx={{height:400}}>
              <HeatSlider value={current_heating_setpoint}
                    getAriaValueText={()=>{`${value} °C`}}
                    orientation="vertical"
                    min={slider_config.min}
                    max={slider_config.max}
                    step={slider_config.step}
                    marks={slider_marks}
                    sx={{
                      '& input[type="range"]': {
                        WebkitAppearance: 'slider-vertical',
                      },
                    }}
                    onKeyDown={preventHorizontalKeyboardNavigation}
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
            <Box m={1}><MUICircularProgress value={pi_heating_demand}/></Box>
            <SignalCellularAltIcon/>
            <Typography >{room.heater.last_seen_mn}</Typography>
          </Stack>
        </Box>
      </Paper>
    </Box>
  </div>
  );
}
