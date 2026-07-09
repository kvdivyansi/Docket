export default function CountdownTicket({ daysUntilDeadline, deadline }) {
  const past = daysUntilDeadline < 0;
  const urgent = !past && daysUntilDeadline <= 14;

  return (
    <div className={`ticket-stub ${past ? "past" : urgent ? "urgent" : ""}`}>
      {past ? (
        <>
          <div className="count">Closed</div>
          <div className="count-label">deadline passed</div>
        </>
      ) : (
        <>
          <div className="count">{daysUntilDeadline}</div>
          <div className="count-label">days left</div>
        </>
      )}
      <div className="stub-date">{deadline}</div>
    </div>
  );
}
