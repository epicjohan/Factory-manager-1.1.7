import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { db } from "../services/storage";

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare props to satisfy TypeScript compiler
  declare props: Readonly<ErrorBoundaryProps>;

  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch (e) {
      console.warn("Soft reload blocked:", e);
      window.dispatchEvent(new CustomEvent('app-notification', { detail: { type: 'ERROR', title: 'Let op', message: 'Kan pagina niet automatisch verversen. Doe dit handmatig.' } }));
    }
  };

  private handleHardReset = () => {
    if (window.confirm("Dit wist alle lokale data en herstelt de applicatie. Weet u het zeker?")) {
      db.resetData();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-red-100 dark:border-red-900/50 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Er is iets misgegaan</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              De applicatie is tegen een onverwachte fout aangelopen. Onze excuses voor het ongemak.
            </p>

            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl mb-6 text-left overflow-auto max-h-32 text-xs font-mono text-red-500">
              {this.state.error?.toString()}
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={20} /> Pagina Verversen
              </button>

              <button
                onClick={this.handleHardReset}
                className="w-full py-3 bg-white dark:bg-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[2rem] font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 size={20} /> Fabrieksinstellingen (Noodoplossing)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}