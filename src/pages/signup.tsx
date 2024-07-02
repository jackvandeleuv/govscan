import React, { FormEvent, useState } from 'react';
import client from '../supabase/client';
import { useRouter } from 'next/router';


function SignUp() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (accessCode !== process.env.NEXT_PUBLIC_ACCESS_CODE) {
      setError('Incorrect or missing access code.');
      return;
    }

    const { data, error } = await client.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Sign up error: " + error.message);
      setError(error.message);
      return;
    }

    setError('');
    setSuccessMessage('Success! Check your email for confirmation.')
  };

  const handleSigninRedirect = () => {
    router
      .push('/signin')
      .catch(() => {
        console.error("error navigating to sign up page");
      });
  };

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-10 rounded-lg shadow-md w-80">
      <h1 className="text-2xl font-bold mb-6 text-center">GovScan Create Account</h1>
      <form onSubmit={((e) => void handleSubmit(e))} className="flex flex-col">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">Confirm Password:</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">Access Code:</label>
          <input type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {successMessage && <p className="text-green-500 text-sm mb-4">{successMessage}</p>}
        <div className="flex items-center justify-center">
          <button type="submit" className="bg-blue-400 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Sign Up</button>
        </div>
      </form>
      <div className="mt-4 text-center">
        <p className="text-gray-700 text-sm">
          {"Already have an account?"}
          {" "}
          <button onClick={handleSigninRedirect} className="text-blue-400 hover:text-blue-600 font-bold">Sign in here.</button>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
