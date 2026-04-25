import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { initDb } from '@/lib/offlineDb';
import { startSyncListener } from '@/lib/syncManager';
import PageNotFound from './lib/PageNotFound';

import Home from './pages/Home';
import SignIn from './pages/SignIn';
import MentorDashboard from './pages/MentorDashboard';
import TraineeProfile from './pages/TraineeProfile.jsx';
import EntranceConference from './pages/trainee/EntranceConference.jsx';
import StandardsScoring from './pages/trainee/StandardsScoring.jsx';
import ExitConference from './pages/trainee/ExitConference.jsx';
import MyPlan from './pages/trainee/MyPlan.jsx';
import RequireAuth from './components/shared/RequireAuth';
import AssessmentReport from './pages/AssessmentReport';
import Settings from './pages/Settings';

const pageVariants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: 'tween', duration: 0.22 } },
  exit: { x: '-30%', opacity: 0, transition: { type: 'tween', duration: 0.18 } },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ position: 'relative' }}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/dashboard" element={<RequireAuth allowedRole="mentor"><MentorDashboard /></RequireAuth>} />
          <Route path="/trainee/:id" element={<RequireAuth allowedRole="mentor"><TraineeProfile /></RequireAuth>} />
          <Route path="/entrance" element={<RequireAuth allowedRole="trainee"><EntranceConference /></RequireAuth>} />
          <Route path="/standards" element={<RequireAuth allowedRole="trainee"><StandardsScoring /></RequireAuth>} />
          <Route path="/exit" element={<RequireAuth allowedRole="trainee"><ExitConference /></RequireAuth>} />
          <Route path="/my-plan" element={<RequireAuth allowedRole="trainee"><MyPlan /></RequireAuth>} />
          <Route path="/report/:assignment_id" element={<AssessmentReport />} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    initDb();
    startSyncListener();

    // Apply dark class based on system preference and keep it in sync
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AnimatedRoutes />
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App