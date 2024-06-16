// import { createContext, useContext, useEffect, useState, ReactNode } from "react";
// import { supabase } from "../supabase/client";

// interface AuthContextType {
//   auth: boolean;
//   user: any; 
//   sessionToken: string | null;
//   login: (email: string, password: string) => Promise<{ error: any, user: any }>; 
//   signOut: () => Promise<{ error: any }>;
//   passwordReset: (email: string) => Promise<{ error: any }>;
//   updatePassword: (updatedPassword: string) => Promise<{ error: any }>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const useAuth = (): AuthContextType => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// };

// const login = async (email: string, password: string) =>
//   supabase.auth.signInWithPassword({ email, password });

// const signOut = async () => supabase.auth.signOut();

// // const passwordReset = async (email: string) =>
// //   supabase.auth.resetPasswordForEmail(email, {
// //     redirectTo: "http://localhost:5173/update-password"
// //   });

// // const updatePassword = async (updatedPassword: string) =>
// //   supabase.auth.updateUser({ password: updatedPassword });

// interface AuthProviderProps {
//   children: ReactNode;
// }

// const AuthProvider = ({ children }: AuthProviderProps) => {
//   const [auth, setAuth] = useState<boolean>(false);
//   const [user, setUser] = useState<any>(null); // You can replace `any` with a specific user type if you have one.
//   const [loading, setLoading] = useState<boolean>(true);
//   const [sessionToken, setSessionToken] = useState<string | null>(null);

//   useEffect(() => {
//     setLoading(true);
//     const getUser = async () => {
//       const { data } = await supabase.auth.getUser();
//       const { user: currentUser } = data;
//       setUser(currentUser ?? null);
//       setAuth(currentUser ? true : false);
//       setLoading(false);
//     };
//     getUser();
//     const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
//       if (event == "PASSWORD_RECOVERY") {
//         setAuth(false);
//       } else if (event === "SIGNED_IN") {
//         setUser(session.user);
//         setAuth(true);
//         setSessionToken(session.access_token);
//       } else if (event === "SIGNED_OUT") {
//         setAuth(false);
//         setUser(null);
//         setSessionToken(null);
//       }
//     });
//     return () => {
//       data.subscription.unsubscribe();
//     };
//   }, []);

//   return (
//     <AuthContext.Provider
//       value={{
//         auth,
//         user,
//         sessionToken,
//         login,
//         signOut,
//         passwordReset,
//         updatePassword
//       }}>
//       {!loading && children}
//     </AuthContext.Provider>
//   );
// };

// export default AuthProvider;
