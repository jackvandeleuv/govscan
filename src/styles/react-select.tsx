export const customReactSelectStyles = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  control: (base: any, state: { isFocused: any }) => ({
    ...base,
    background: "#F7F7F7",
    borderRadius: 0,
    borderWidth: 0,
    boxShadow: state.isFocused ? 0 : 0,
    "&:hover": {
      border: "0",
    },
  }),
  option: (styles: any, { isFocused, isSelected }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
      ...styles,
      backgroundColor: isSelected ? "#60a5fa" : isFocused ? "#60a5fa" : null,
      color: isFocused ? "white" : isSelected ? "white" : "black",
    };
  },
};
