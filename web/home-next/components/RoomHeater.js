import { useState } from 'react';
import {    Paper, Grid,Box, 
  Typography, Slider,LinearProgress,
  CircularProgress} from '@mui/material';
import {Thermostat} from '@mui/icons-material';

const slider_config ={
  min:5,
  max:27,
  step:1
}

const slider_marks = [
  {
    value: 5,
    label: '5°C',
  },
  {
    value: 10,
    label: 'Current 10°C',
  },
  {
    value: 27,
    label: '27°C',
  },
];

export default function RoomHeater({ room, roomName, roomData,onChange, roomTemp }) {
  const [value,setValue] = useState(12)

  function valuetext(val){
    return `${val} °C`
  }
  function valueTemperature(){
    let result = ""
    if("local_temperature" in roomData){
      result = roomData.local_temperature.toString()+"°"
    }
    return result
  }
  return(
  <div>
    <Box id="mainContent" m={1} >
      <Paper elevation={3} >
        <Box id="allCard" px={2} pt={1}>
          <Grid id="cardHeader" container alignItems="center">
            <Grid item><Typography variant="h6" >{roomName}</Typography></Grid>
            <Grid item><Thermostat /></Grid>
            <Grid item><Typography variant="h6" >{(roomTemp==0)?"":roomTemp+"°"}</Typography></Grid>
          </Grid>
          <Box px={1}>
            <Slider value={value}
                  getAriaValueText={valuetext}
                  min={slider_config.min}
                  max={slider_config.max}
                  step={slider_config.step}
                  marks={slider_marks}
                  onChange={(e)=>{
                    onChange(room,e.target.value)
                    setValue(e.target.value)
                  }}
                  aria-label="Small steps"
                  valueLabelDisplay="on"
              />
          </Box>
          <Grid container spacing={2} b={1}>
              <Grid item xs={2}>
                  <Typography gutterBottom>Metal Temperature 35°C</Typography>
              </Grid>
              <Grid item xs={4}>
                  <LinearProgress variant="determinate" value={80}  color="secondary"/>
              </Grid>
              <Grid item xs={2}>
              <Typography gutterBottom>Flow Opening 50%</Typography>
              </Grid>
              <Grid item xs={4}>
                  <CircularProgress variant="determinate" value={80}  color="secondary"/>
              </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  </div>
  );
}
