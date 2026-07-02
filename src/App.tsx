
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LocketApp from './pages/LocketApp';
import Admin from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LocketApp />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
