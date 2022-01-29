import Nav from './Nav'
import Meta from './Meta'

const Layout = ({ children }) => {
  return (
    <>
      <Meta />
      <Nav />
      <div >
        <main >
          {children}
        </main>
      </div>
    </>
  )
}

export default Layout
