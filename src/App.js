import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserLogin from './Components/Authentication/JavaScript/UserLogin';
import Map from './Components/MapAndForms/JavaScript/map';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserLogin />} />
        <Route path="/map" element={<Map />} />
      </Routes>
    </Router>
  );
}

export default App;
