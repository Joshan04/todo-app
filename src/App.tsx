import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { useTaskStore } from './store/useTaskStore';
import { useEffect } from 'react';

function App() {
  const { addTask, tasks } = useTaskStore();

  // Mock Data Init
  useEffect(() => {
    if (Object.keys(tasks).length === 0) {
      addTask("Review project proposal");
      addTask("Prepare presentation slides");
      addTask("Buy groceries for the week");
    }
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Sidebar />
      <MainContent />
    </div>
  );
}

export default App;
