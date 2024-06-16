import React from "react";

import type { NextPage } from "next";
import { TitleAndDropdown } from "~/components/landing-page/TitleAndDropdown";
import { useState, useEffect } from "react";
import Login from './login';

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


  useEffect(() => {
    setHasMounted(true);
  }, []);


  useEffect(() => {
    if (hasMounted) {
      const token = localStorage.getItem('isLoggedIn');
      if (token) {
        setIsLoggedIn(token === 'true');
      }
    }
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
        const endpoint = '/api/login';
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: authString.email, password: authString.password }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = (await res.json()) as AuthResponse;
        if (data.token) {
          setIsLoggedIn(true);
          localStorage.setItem('authToken', data.token);
        } else {
          setIsLoggedIn(false);
        }
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
        <Login 
          setAuthString={setAuthString}
        />
      }
    </>
  );
};
export default LandingPage;
