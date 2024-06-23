import { jwtDecode } from 'jwt-decode';
import client from '../supabase/client';


export const isTokenExpired = (token: string) => {
    if (!token) return true;
    
    try {
        const decodedToken = jwtDecode(token);
        if (!decodedToken || !decodedToken.exp) {
            return false;
        }

        const currentTime = Date.now() / 1000; 

        return decodedToken.exp < currentTime;
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return true;
    }
};


export const getToken = async (): Promise<string | null> => {
    const { data, error } = await client.auth.refreshSession();

    if (error) {
        console.error('Error refreshing session:', error);
        return null;
    } else {
        const { session } = data || {};
        const newToken = session?.access_token;
    
        if (newToken) {
            console.log('Refreshed token!')

            return newToken
        } else {
            console.error('New session token not available after refresh');
            return null;
        }
    }  
};
