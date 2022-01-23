import { useState } from 'react';
import {    Paper, Grid,Box, Divider,
  Typography, Slider,LinearProgress,
  CircularProgress} from '@mui/material';
import {Thermostat} from '@mui/icons-material';

const slider_config ={
  min:5,
  max:27,
  step:1
}

let slider_marks = [
  {value: 5,label: '5°',},
  {value: 27,label: '27°',},
];

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
    room_temperature = "room "+room.ambient.temperature.toFixed(1)+"°"
    slider_marks = [{value: 5,label: '5°',},{value:room.ambient.temperature,label:"room"},{value: 27,label: '27°'}]
  }
  let metal_temperature = ""
  if("temperature" in room.metal.data){
    metal_temperature = "metal "+room.metal.data.temperature.toFixed(1)+"°"
    if("local_temperature" in room.heater.data){
      handle_metal = 100*(room.metal.data.temperature - room.heater.data.local_temperature)/60
    }
  }
  let pi_heating_demand = ("pi_heating_demand" in room.heater.data)?room.heater.data.pi_heating_demand:0


  return(
  <div>
    <Box id="mainContent" m={1} >
      <Paper elevation={3} >
        <Box id="allCard" px={2} pt={1}>
          <Grid id="cardHeader" container alignItems="center">
            <Grid item><Typography variant="h6" >{room.name}</Typography></Grid>
            <Grid item><Thermostat /></Grid>
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
          <Box pt={1}>
            <Grid container spacing={2} b={1}>
              <Grid item xs={2}><Typography variant="h6" >{room_temperature}</Typography></Grid>
              <Grid item xs={2}><Typography variant="h6" >{room.heater.last_seen_mn}</Typography></Grid>
              <Grid item xs={1}><Typography variant="h6" >
                  {(pi_heating_demand==0)?"closed":`open ${pi_heating_demand}%`} 
                </Typography></Grid>
              <Grid item xs={1}><CircularProgress variant="determinate" value={pi_heating_demand}color="secondary"/></Grid>
              <Grid item xs={2}><Typography variant="h6" >{handle_temperature}</Typography></Grid>
              <Grid item xs={2}><LinearProgress 
                sx={{ display: (handle_metal==0)?'none':'block' }}
                variant="determinate" 
                value={handle_metal}  
                color="secondary"/></Grid>
              <Grid item xs={2}><Typography variant="h6" >{metal_temperature}</Typography></Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Box>
  </div>
  );
}
