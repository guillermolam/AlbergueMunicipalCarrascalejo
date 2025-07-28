import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { BookingFlow } from './components/BookingFlow';
import { BookingConfirmation } from './components/BookingConfirmation';
import { BookingSuccess } from './components/BookingSuccess';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<BookingFlow />} />
        <Route path="/confirmation" element={<BookingConfirmation />} />
        <Route path="/success" element={<BookingSuccess />} />
      </Routes>
    </div>
  );
}

export default App;