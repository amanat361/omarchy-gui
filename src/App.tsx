import { useState } from 'react';
import "./index.css";
import { AppMenu } from './components/layout/AppMenu';
import { MainContent } from './components/layout/MainContent';

export function App() {
  const [activeCategory, setActiveCategory] = useState('display');

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AppMenu activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      <MainContent activeCategory={activeCategory} />
    </div>
  );
}

export default App;
