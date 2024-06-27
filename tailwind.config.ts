import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      fontFamily: {
        lora: ["Lora", "serif"], 
        nunito: ["Nunito Sans", "sans-serif"], 
      },
      colors: {
        "gradient-start": "rgba(255, 255, 204, 0.2)", 
        "gradient-end": "rgba(204, 153, 255, 0.2)", 
        "gradient-start-light": "rgba(255, 255, 204, 0.1)", 
        "gradient-end-light": "rgba(204, 153, 255, 0.1)", 
        "gray-00": "#F9F9FA",
        "gray-15": "#E9E9ED",
        "gray-30": "#D2D2DC",
        "gray-60": "#9EA2B0",
        "gray-90": "#3F3F46",
        "gray-pdf": "#F7F7F7",
        "llama-purple-light": "#EDDDFC",
        "llama-purple": "#D09FF6",
        "llama-magenta-light": "#FBD7F9",
        "llama-magenta": "#F48FEF",
        "llama-red-light": "#FBDBD9",
        "llama-red": "#F49B95",
        "llama-orange-light": "#FAE9D3",
        "llama-orange": "#F1BA72",
        "llama-yellow-light": "#FDF6DD",
        "llama-yellow": "#F8EC78",
        "llama-lime-light": "#E5FAD2",
        "llama-lime": "#A1E66D",
        "llama-teal-light": "#D9FBEC",
        "llama-teal": "#66D8A7",
        "llama-cyan-light": "#DAFAFB",
        "llama-cyan": "#70E4EC",
        "llama-blue-light": "#EDF5FD",
        "llama-blue": "#87B6F3",
        "llama-indigo-light": "#EDECFD",
        "llama-indigo": "#817AF2",
      },
      backgroundImage: (theme) => ({
        gradient: "url('https://llama-app-frontend.vercel.app/Gradient.png')",
      }),
      backgroundSize: {
        "100%": "100%",
      },
      backgroundPosition: {
        center: "center",
      },
      backgroundRepeat: {
        "no-repeat": "no-repeat",
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: "1" },
          '50%': { opacity: "0.5" },
        },
      },
      animation: {
        pulse: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
