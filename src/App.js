import React from 'react';
import Navigation from './components/navigation';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import PageRenderer from './page-renderer';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/:path" element={<PageRenderer />} />
          <Route path="*" element={<h1>404</h1>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
