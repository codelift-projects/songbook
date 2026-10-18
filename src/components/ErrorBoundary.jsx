import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 grid place-items-center mx-auto text-xl font-black">
              !
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Something unexpected happened
            </h2>
            <p className="text-xs text-slate-500 font-mono bg-slate-100 p-2.5 rounded-xl text-left overflow-x-auto max-h-32">
              {this.state.error?.message || String(this.state.error)}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 transition"
              >
                Reload App
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                className="rounded-xl border border-slate-200 bg-white text-slate-700 px-4 py-2 text-xs font-bold hover:bg-slate-100 transition"
              >
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
