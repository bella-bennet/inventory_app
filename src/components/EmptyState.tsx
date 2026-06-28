export function EmptyState({ onNewSheet }: { onNewSheet: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="15" y="20" width="90" height="80" rx="12" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
          <line x1="15" y1="45" x2="105" y2="45" stroke="currentColor" strokeWidth="2" opacity="0.2" />
          <line x1="45" y1="20" x2="45" y2="100" stroke="currentColor" strokeWidth="2" opacity="0.15" />
          <line x1="75" y1="20" x2="75" y2="100" stroke="currentColor" strokeWidth="2" opacity="0.15" />
          <circle cx="60" cy="70" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
          <path d="M60 67V73M57 70H63" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        </svg>
      </div>
      <h2 className="empty-state-title">No inventory sheets yet</h2>
      <p className="empty-state-text">Create your first sheet to start tracking inventory</p>
      <button className="btn btn-primary btn-lg" onClick={onNewSheet}>
        <span>+</span> Create Your First Sheet
      </button>
    </div>
  );
}
