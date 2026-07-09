import { useNavigate } from "react-router-dom";

export default function LandingDashboard({ user }) {
  const navigate = useNavigate();

  const cards = [
    {
      id: "conferences",
      title: "Conferences",
      subtitle: "Live AI-curated Call-for-Papers desk",
      description: "Explore upcoming research conferences in AI, CV, NLP, Cloud Computing, and Cyber Security with strict >30 day deadline tracking and official ranking stamps.",
      active: true,
      badge: "Active Module",
      icon: "📌",
      path: "/conferences",
    },
    {
      id: "journal",
      title: "Journal",
      subtitle: "Academic journal directory & indexing",
      description: "Track submission windows, impact factors, and peer-review cycles for top-tier international scientific journals and letters.",
      active: false,
      badge: "Available Soon",
      icon: "📚",
    },
    {
      id: "literature-survey",
      title: "Literature Survey",
      subtitle: "Deep citation & state-of-the-art mapping",
      description: "Automated survey tools to map citation graphs, extract key methodologies, and synthesize related works across arXiv and open literature.",
      active: false,
      badge: "Available Soon",
      icon: "🔍",
    },
    {
      id: "collaboration",
      title: "Collaboration Recommendation",
      subtitle: "Peer matching & co-author network",
      description: "Connect with researchers working on similar problems, share drafts, and form cross-institution collaboration teams for upcoming submissions.",
      active: false,
      badge: "Available Soon",
      icon: "🤝",
    },
  ];

  return (
    <div className="landing-dashboard">
      <div className="landing-hero">
        <h2 className="landing-title">
          Welcome to your Research Desk, <span className="accent">{user?.full_name?.split(" ")[0] || "Researcher"}</span>.
        </h2>
        <p className="landing-subtitle">
          Select a workspace module below to manage your academic pipeline and deadline tracking.
        </p>
      </div>

      <div className="dashboard-grid">
        {cards.map((card) => {
          if (card.active) {
            return (
              <button
                key={card.id}
                className="dashboard-card active-card"
                onClick={() => navigate(card.path)}
              >
                <div className="card-top">
                  <span className="card-icon">{card.icon}</span>
                  <span className="badge badge-active">{card.badge}</span>
                </div>
                <div className="card-body">
                  <h3 className="card-title">{card.title}</h3>
                  <div className="card-subtitle">{card.subtitle}</div>
                  <p className="card-description">{card.description}</p>
                </div>
                <div className="card-footer active-footer">
                  <span>Open Conference Desk &rarr;</span>
                </div>
              </button>
            );
          } else {
            return (
              <div
                key={card.id}
                className="dashboard-card disabled-card"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className="card-top">
                  <span className="card-icon">{card.icon}</span>
                  <span className="badge badge-soon">{card.badge}</span>
                </div>
                <div className="card-body">
                  <h3 className="card-title">{card.title}</h3>
                  <div className="card-subtitle">{card.subtitle}</div>
                  <p className="card-description">{card.description}</p>
                </div>
                <div className="card-footer disabled-footer">
                  <span>In Development ⏳</span>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
