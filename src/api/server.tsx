// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import { GetServerSideProps } from 'next';

// interface Props {
//     client: SupabaseClient;
// }

// export const getServerSideProps: GetServerSideProps<Props> = async () => {
//     const supabase = createClient(
//         process.env.SUPABASE_URL!, 
//         process.env.SUPABASE_KEY!
//     );

//     return {
//         props: {
//             client: supabase,
//         },
//     };
// }

// const Server: React.FC<Props> = ({ 
//     client 
// }) => {


//     return <></>;
//   };
  

//   export default Server;