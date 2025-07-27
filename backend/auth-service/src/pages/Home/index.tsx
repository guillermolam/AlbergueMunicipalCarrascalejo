import { useLogto } from '@logto/react';

const Home = () => {
  const { signIn, signOut, isAuthenticated } = useLogto();

  return isAuthenticated ? (
    <button onClick={() => signOut(`https://${LOGTO_ENDPOINT}/`)}>Sign Out</button>
  ) : (
    <button onClick={() => signIn(`https://${LOGTO_ENDPOINT}/callback`)}>Sign In</button>
  );
};