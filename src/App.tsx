import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import InstallBanner from './components/InstallBanner';
import React, { useState } from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-red-600 p-8">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-left overflow-auto text-sm">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { useFirestoreSync } from './hooks/useFirestoreSync';

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Enable Firestore Sync
  useFirestoreSync();

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <MainContent
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
      </div>
      <InstallBanner />
    </ErrorBoundary>
  );
}

export default App;
