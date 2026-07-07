export default function Stamp({ tier }) {
  const isUnranked = tier === "Unranked";
  return (
    <div className={`stamp ${isUnranked ? "unranked" : ""}`}>
      {isUnranked ? "Unranked" : tier}
    </div>
  );
}
