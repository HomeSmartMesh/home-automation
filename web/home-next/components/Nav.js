import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import {Button} from '@mui/material';
import Typography from '@mui/material/Typography';
import Link from 'next/link'

const pages = ['heat', 'sonos', 'heating', 'history','3h']


export default function Nav() {
  return (
    <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
            <Toolbar>
                {pages.map((page,index)=>(
                    <Link href={`/${page}`} key={index}>
                        <Button sx={{ my: 2, color: 'white', display: 'block' }}>
                            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                {page}
                            </Typography>
                        </Button>
                    </Link>          
            ))}
            </Toolbar>
        </AppBar>
    </Box>
  );
}

