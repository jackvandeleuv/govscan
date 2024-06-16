import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';

interface AuthString {
    email: string;
    password: string;
}

interface LoginProps {
    setAuthString: (authString: AuthString) => void;
}

function Login({ setAuthString }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthString({
      email: email,
      password: password
    });
  };

  const handleSignupRedirect = () => {
    router
      .push('/signup')
      .catch(() => {
        console.log("error navigating to sign up page");
      });
  };


  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-10 rounded-lg shadow-md w-80">
      <h1 className="text-2xl font-bold mb-6 text-center">GovScan Sign In</h1>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        <div className="flex items-center justify-center">
          <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Login</button>
        </div>
      </form>
      <div className="mt-4 text-center">
        <p className="text-gray-700 text-sm">{"Don't have a password?"}
          <button onClick={handleSignupRedirect} className="text-blue-500 hover:text-blue-700 font-bold">Create an account.</button>
        </p>
      </div>
    </div>
  );
}

export default Login;
