import { jwtDecode } from 'jwt-decode';

const isTokenExpired = (token: string) => {
    if (!token) {
        return true;
    }
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