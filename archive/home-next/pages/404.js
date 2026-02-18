import Link from 'next/link'
import {Button,Typography} from '@mui/material';

export default function NotFoundPage() {
  return (
      <div >
        <Typography variant="h1">404</Typography>
        <Typography variant="h4">Sorry, there is nothing here</Typography>
        <Button variant="contained"><Link href='/heat'>Go To Heat</Link></Button>
        
      </div>
  )
}
