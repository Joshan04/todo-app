import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';

function App() {



  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Sidebar />
      <MainContent />
    </div>
  );
}

export default App;
