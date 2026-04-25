import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';

import Home from './pages/Home';
import SignIn from './pages/SignIn';
import MentorDashboard from './pages/MentorDashboard';
import TraineeProfile from './pages/TraineeProfile.jsx';
import EntranceConference from './pages/trainee/EntranceConference.jsx';
import StandardsScoring from './pages/trainee/StandardsScoring.jsx';
import ExitConference from './pages/trainee/ExitConference.jsx';
import RequireAuth from './components/shared/RequireAuth';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          {/* '/' and '/login' MUST remain public — never wrap in RequireAuth.
              See SQHN MAT routing architecture notes in RequireAuth and AppHeader. */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/dashboard" element={
            <RequireAuth allowedRole="mentor"><MentorDashboard /></RequireAuth>
          } />
          <Route path="/trainee/:id" element={
            <RequireAuth allowedRole="mentor"><TraineeProfile /></RequireAuth>
          } />
          <Route path="/entrance" element={
            <RequireAuth allowedRole="trainee"><EntranceConference /></RequireAuth>
          } />
          <Route path="/standards" element={
            <RequireAuth allowedRole="trainee"><StandardsScoring /></RequireAuth>
          } />
          <Route path="/exit" element={
            <RequireAuth allowedRole="trainee"><ExitConference /></RequireAuth>
          } />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App