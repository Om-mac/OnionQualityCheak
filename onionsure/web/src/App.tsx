import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, DashboardLayout } from './components/Layout';
import { useAuth, ROLE_HOME } from './lib/auth';

import Home from './pages/Home';
import Login from './pages/Login';
import Verify from './pages/Verify';
import Demo from './pages/Demo';
import CertificateView from './pages/CertificateView';
import Solution from './pages/Solution';

// Marketing / informational pages. Every nav and footer link resolves to one
// of these, so there are no dead links anywhere on the site.
const SOLUTION_SLUGS = [
  'ai-inspection', 'iot', 'reports', 'how-it-works', 'solutions',
  'farmers', 'fpos', 'procurement-centers', 'buyers',
  'about', 'contact', 'privacy', 'terms',
] as const;

// Role/dashboard pages are code-split per route so the initial bundle stays
// small. The 5 public/entry pages above are kept static for instant first paint.
const ProcDashboard = lazy(() => import('./pages/procurement/Dashboard'));
const QualityAssessment = lazy(() => import('./pages/procurement/QualityAssessment'));
const NewInspection = lazy(() => import('./pages/procurement/NewInspection'));
const SmartAssessment = lazy(() => import('./pages/procurement/SmartAssessment'));
const LotDetail = lazy(() => import('./pages/procurement/LotDetail'));
const LiveSensor = lazy(() => import('./pages/procurement/LiveSensor'));
const AIAnalysis = lazy(() => import('./pages/procurement/AIAnalysis'));
const LiveCamera = lazy(() => import('./pages/procurement/LiveCamera'));
const Fusion = lazy(() => import('./pages/procurement/Fusion'));
const FinalResult = lazy(() => import('./pages/procurement/FinalResult'));
const Certificates = lazy(() => import('./pages/procurement/Certificates'));
const QrVerify = lazy(() => import('./pages/procurement/QrVerify'));
const History = lazy(() => import('./pages/procurement/History'));
const AuditDisputes = lazy(() => import('./pages/procurement/AuditDisputes'));
const Analytics = lazy(() => import('./pages/procurement/Analytics'));
const Centers = lazy(() => import('./pages/procurement/Centers'));

const FpoDashboard = lazy(() => import('./pages/fpo/Dashboard'));
const FpoInspection = lazy(() => import('./pages/fpo/Inspection'));
const FarmerDashboard = lazy(() => import('./pages/farmer/Dashboard'));
const FarmerInspections = lazy(() => import('./pages/farmer/Inspections'));
const FarmerInspection = lazy(() => import('./pages/farmer/Inspection'));
const FarmerCertificates = lazy(() => import('./pages/farmer/Certificates'));
const FarmerReport = lazy(() => import('./pages/farmer/Report'));
const FarmerDispute = lazy(() => import('./pages/farmer/Dispute'));
const BuyerDashboard = lazy(() => import('./pages/buyer/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));

// Suspense lives *inside* the layout so the sidebar/header stay visible
// while a lazily-loaded route chunk is fetched.
function Dash({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<RouteFallback />}>{children}</Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function RouteFallback() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-fresh border-t-transparent" />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={user ? <Navigate to={ROLE_HOME[user.role] || '/'} replace /> : <Login />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/verify/:certId" element={<Verify />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/certificate/:id" element={<CertificateView />} />

      {/* Informational pages (nav + footer destinations) */}
      {SOLUTION_SLUGS.map((slug) => (
        <Route key={slug} path={`/${slug}`} element={<Solution slug={slug} />} />
      ))}

      {/* Procurement Officer */}
      <Route path="/quality/dashboard" element={<Dash><ProcDashboard /></Dash>} />
      <Route path="/quality/assessment" element={<Dash><QualityAssessment /></Dash>} />
      <Route path="/quality/new-inspection" element={<Dash><NewInspection /></Dash>} />
      <Route path="/quality/assessment/:inspectionId" element={<Dash><SmartAssessment /></Dash>} />
      <Route path="/quality/lots/:lotNumber" element={<Dash><LotDetail /></Dash>} />
      <Route path="/quality/live-sensor" element={<Dash><LiveSensor /></Dash>} />
      <Route path="/quality/ai-analysis" element={<Dash><AIAnalysis /></Dash>} />
      <Route path="/quality/live-camera" element={<Dash><LiveCamera /></Dash>} />
      <Route path="/quality/fusion" element={<Dash><Fusion /></Dash>} />
      <Route path="/quality/fusion/:inspectionId" element={<Dash><Fusion /></Dash>} />
      <Route path="/quality/result" element={<Dash><FinalResult /></Dash>} />
      <Route path="/quality/certificates" element={<Dash><Certificates /></Dash>} />
      <Route path="/quality/qr-verify" element={<Dash><QrVerify /></Dash>} />
      <Route path="/quality/history" element={<Dash><History /></Dash>} />
      <Route path="/quality/audit" element={<Dash><AuditDisputes /></Dash>} />
      <Route path="/quality/analytics" element={<Dash><Analytics /></Dash>} />
      <Route path="/quality/centers" element={<Dash><Centers /></Dash>} />

      {/* FPO */}
      <Route path="/fpo/dashboard" element={<Dash><FpoDashboard /></Dash>} />
      <Route path="/fpo/inspection" element={<Dash><FpoInspection /></Dash>} />
      {/* Farmer */}
      <Route path="/farmer/dashboard" element={<Dash><FarmerDashboard /></Dash>} />
      <Route path="/farmer/inspections" element={<Dash><FarmerInspections /></Dash>} />
      <Route path="/farmer/inspection" element={<Dash><FarmerInspection /></Dash>} />
      <Route path="/farmer/certificates" element={<Dash><FarmerCertificates /></Dash>} />
      <Route path="/farmer/report" element={<Dash><FarmerReport /></Dash>} />
      <Route path="/farmer/report/:id" element={<Dash><FarmerReport /></Dash>} />
      <Route path="/farmer/dispute" element={<Dash><FarmerDispute /></Dash>} />
      {/* Buyer */}
      <Route path="/buyer/dashboard" element={<Dash><BuyerDashboard /></Dash>} />
      {/* Admin */}
      <Route path="/admin/dashboard" element={<Dash><AdminDashboard /></Dash>} />
      <Route path="/admin/analytics" element={<Dash><AdminAnalytics /></Dash>} />
      <Route path="/admin/users" element={<Dash><AdminUsers /></Dash>} />
      <Route path="/admin/reports" element={<Dash><AdminReports /></Dash>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
