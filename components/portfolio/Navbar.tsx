export function Navbar() {
  return (
    <nav className="nav" aria-label="主导航">
      <div className="nav-brand">
        <span className="nav-logo" aria-hidden="true">
          <span className="nav-logo-inner" />
        </span>
      </div>
      <div className="nav-divider" aria-hidden="true" />
      <div className="nav-links">
        <a href="#home"     className="nav-link is-active">Home</a>
        <a href="#work"     className="nav-link">履历</a>
        <a href="#projects" className="nav-link">项目</a>
        <a href="#articles" className="nav-link">文章</a>
        <a href="#photo"    className="nav-link">摄影</a>
        <a href="#travel"   className="nav-link">旅行</a>
        <a href="#fit"      className="nav-link">运动</a>
      </div>
    </nav>
  );
}
