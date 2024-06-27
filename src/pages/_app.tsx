import { type AppType } from "next/dist/shared/lib/utils";
import Layout from "~/components/Layout";
import "~/styles/globals.css";
import ReactGA from "react-ga4";

import { IntercomProvider } from "react-use-intercom";
import { GOOGLE_ANALYTICS_ID, INTERCOM_ID } from "~/constants";
import { Analytics } from "@vercel/analytics/react";
import Head from "next/head";

ReactGA.initialize(GOOGLE_ANALYTICS_ID);

// Add Vercel Analytics
<Analytics />

const MyApp: AppType = ({ Component, pageProps }) => {

  return (
    <>
      <Head>
        <title>GovScan</title>
      </Head>
      <IntercomProvider appId={INTERCOM_ID}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </IntercomProvider>
    </>
  );
};

export default MyApp;
