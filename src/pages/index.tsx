import React from "react";

import type { NextPage } from "next";
import { TitleAndDropdown } from "~/components/landing-page/TitleAndDropdown";
import { useState, useEffect } from "react";
import SignIn from './signin';
import { getToken } from "../supabase/manageTokens";
import supabase from "../supabase/client";

export interface AuthString {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
}

const LandingPage: NextPage = () => {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authString, setAuthString] = useState<AuthString | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setHasMounted(true);
  }, []);


  useEffect(() => {
    const checkToken = async () => {
      if (hasMounted) {
        const token = await getToken();
        setIsLoggedIn(token !== null)
      }
    };
    void checkToken();
  }, [hasMounted]);

  
  useEffect(() => {
    if (hasMounted) {
      // Save isLoggedIn state to Local Storage whenever it changes
      localStorage.setItem('isLoggedIn', isLoggedIn.toString());
    }
  }, [isLoggedIn, hasMounted]);
 

  useEffect(() => {
    void (async () => {
      if (authString === null) return;

      try {
        const { email, password } = authString;
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      
        if (error) {
          setError(error.message);
          return;
        }
      
        const token = data.session?.access_token;
        setIsLoggedIn(token !== null);
      } catch (error) {
        console.error('Error during authentication:', error);
      }
    })();
  }, [authString]);


  return (
    <>
      {isLoggedIn === true && 
        <TitleAndDropdown 
          setIsLoggedIn={setIsLoggedIn}
        />
      }
      {isLoggedIn === false && 
        <SignIn 
          setAuthString={setAuthString}
          error={error}
          setError={setError}
        />
      }
    </>
  );
};
export default LandingPage;
