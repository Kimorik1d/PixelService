export function Button({ children, onClick, variant }) {
  const variantClass = variant === "outline" ? "btn-outline" : "btn-primary";
  return (
    <button className={`btn ${variantClass}`} onClick={onClick}>
      {children}
    </button>
  );
}
