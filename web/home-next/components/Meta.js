import Head from 'next/head'

const Meta = ({ title, keywords, description }) => {
  return (
    <Head>
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <meta name='keywords' content={keywords} />
      <meta name='description' content={description} />
      <meta charSet='utf-8' />
      <link rel='icon' href='/next/favicon.ico' />
      <link rel="manifest" href="/next/manifest.json"></link>
      <title>{title}</title>
    </Head>
  )
}

Meta.defaultProps = {
  title: 'Home Automation',
  keywords: 'Heating, sound system',
  description: 'Control your home with react',
}

export default Meta
