import NavTabs from './NavTabs'
import Meta from './Meta'

const Layout = ({ children }) => {
  return (
    <>
      <Meta />
      <NavTabs />
      <div >
        <main >
          {children}
        </main>
      </div>
    </>
  )
}

export default Layout
