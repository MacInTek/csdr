class Page404 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :root {
          --primary: #0c6d38;
          --primary-dark: #095a2e;
          --bg: #f4f9f6;
          --text: #1f2933;
        }

        :host {
          display: block;
          min-height: 100vh;
          position: relative;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--bg), #ffffff);
          overflow: hidden;
          position: relative;
        }

        /* Floating background circles */
        .bubble {
          position: absolute;
          border-radius: 50%;
          background: rgba(12, 109, 56, 0.12);
          animation: float 12s infinite ease-in-out;
        }

        .bubble:nth-child(1) {
          width: 180px;
          height: 180px;
          top: 10%;
          left: 8%;
        }

        .bubble:nth-child(2) {
          width: 120px;
          height: 120px;
          bottom: 15%;
          right: 12%;
          animation-delay: 3s;
        }

        .bubble:nth-child(3) {
          width: 80px;
          height: 80px;
          top: 65%;
          left: 18%;
          animation-delay: 6s;
        }

        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
          100% { transform: translateY(0); }
        }

        .card {
          position: relative;
          background: #ffffff;
          padding: 3rem 3.5rem;
          border-radius: 1.5rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          text-align: center;
          max-width: 420px;
          z-index: 1;
        }

        .number {
          font-size: 6rem;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: 0.3rem;
          animation: pulse 2.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .leaf {
          width: 80px;
          margin: 1.5rem auto;
          animation: swing 3s infinite ease-in-out;
          cursor: pointer;
        }

        @keyframes swing {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }

        h1 {
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
          color: var(--text);
        }

        p {
          font-size: 0.95rem;
          color: #4b5563;
          margin-bottom: 1.75rem;
        }

        .btn {
          display: inline-block;
          padding: 0.75rem 1.75rem;
          border-radius: 999px;
          background: var(--primary);
          color: #ffffff;
          text-decoration: none;
          font-weight: 600;
          transition: background 0.3s, transform 0.2s, box-shadow 0.2s;
          border: none;
          cursor: pointer;
        }

        .btn:hover {
          background: var(--primary-dark);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(12, 109, 56, 0.25);
        }

        .tip {
          margin-top: 1rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
      </style>

      <div class="container">
        <!-- Animated background -->
        <div class="bubble"></div>
        <div class="bubble"></div>
        <div class="bubble"></div>

        <div class="card">
          <div class="number">404</div>

          <!-- SVG leaf icon (interactive) -->
          <svg class="leaf" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" id="leaf">
            <path d="M32 4C18 4 6 18 6 32c0 14 12 28 26 28s26-14 26-28C58 18 46 4 32 4z" fill="#0c6d38" opacity="0.15" />
            <path d="M32 10c-8 8-10 18-10 24 0 8 6 14 10 16 4-2 10-8 10-16 0-6-2-16-10-24z" fill="#0c6d38" />
          </svg>

          <h1>Page Not Found</h1>
          <p>The page you're looking for doesn't exist or was moved.</p>

          <button class="btn" id="homeBtn">Go Back Home</button>

          <div class="tip">Tip: Click the leaf 🌿</div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const leaf = this.shadowRoot.getElementById('leaf');
    const homeBtn = this.shadowRoot.getElementById('homeBtn');

    if (leaf) {
      leaf.addEventListener('click', () => {
        leaf.style.transform = 'rotate(360deg) scale(1.2)';
        leaf.style.transition = 'transform 0.6s ease';

        setTimeout(() => {
          leaf.style.transform = '';
        }, 600);
      });
    }

    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.href = '/';
      });
    }
  }
}

customElements.define('page-404', Page404);
