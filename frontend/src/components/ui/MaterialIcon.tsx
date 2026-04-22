export const MaterialIcon = ({ name, size = 20, color = "inherit", style = {} }: any) => (
    <span className="material-symbols-outlined" style={{ fontSize: size, color, ...style }}>
    {name}
  </span>
);