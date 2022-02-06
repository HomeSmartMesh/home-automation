import Link from 'next/link'
import Layout from '../components/Layout'

export default function NotFoundPage() {
  return (
      <div >
        <h1>
          404
        </h1>
        <h4>Sorry, there is nothing here</h4>
        <Link href='/heat'>Go To Heat</Link>
      </div>
  )
}
