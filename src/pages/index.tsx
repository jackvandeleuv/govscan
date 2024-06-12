import React from "react";

import type { NextPage } from "next";
import { MarketingSection } from "~/components/landing-page/MarketingSection";
import { TitleAndDropdown } from "~/components/landing-page/TitleAndDropdown";
import { useState, useEffect } from "react";
import Login from './login';
import { backendUrl } from "~/config";

export interface AuthString {
  username: string;
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
        const endpoint = backendUrl + `api/authorize/`;
        const encodedAuth = btoa(authString.username + ":" + authString.password);
      
        try {
          const res = await fetch(endpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${encodedAuth}`, 
            },
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
      } catch (error) {
        console.error('Error during authentication:', error);
      }
    }) ()
  }, [authString, isLoggedIn, setIsLoggedIn]);

  

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
