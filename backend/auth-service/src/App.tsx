import { LogtoProvider, LogtoConfig } from '@logto/react';

const config: LogtoConfig = {
  endpoint: `https://${LOGTO_ENDPOINT}/`,
  appId: `${LOGTO_APPID}`,
};

// Assuming react-router
<Route path="/callback" element={<Callback />} />

const App = () => (
  <LogtoProvider config={config}>
    <YourAppContent />
  </LogtoProvider>
);