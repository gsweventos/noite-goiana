import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Layout, BareLayout } from '@/components/Layout';
import { RequireAuth, RequireAdmin } from '@/components/RouteGuards';

import Home from '@/pages/Home';
import Events from '@/pages/Events';
import EventDetail from '@/pages/EventDetail';
import Checkout from '@/pages/Checkout';
import Login from '@/pages/Login';
import ClientDashboard from '@/pages/ClientDashboard';
import Checkin from '@/pages/Checkin';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import { PrivacyPolicy, TermsOfUse } from '@/pages/Legal';
import NotFound from '@/pages/NotFound';

import AdminLayout from '@/admin/AdminLayout';
import AdminDashboard from '@/admin/AdminDashboard';
import AdminEvents from '@/admin/AdminEvents';
import AdminEventForm from '@/admin/AdminEventForm';
import AdminCategories from '@/admin/AdminCategories';
import AdminTickets from '@/admin/AdminTickets';
import AdminClients from '@/admin/AdminClients';
import AdminPayments from '@/admin/AdminPayments';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/eventos" element={<Events />} />
            <Route path="/eventos/:slug" element={<EventDetail />} />
            <Route path="/checkout/:slug" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/contato" element={<Contact />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsOfUse />} />

            <Route
              path="/painel"
              element={
                <RequireAuth>
                  <ClientDashboard />
                </RequireAuth>
              }
            />

            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="eventos" element={<AdminEvents />} />
              <Route path="eventos/:id" element={<AdminEventForm />} />
              <Route path="categorias" element={<AdminCategories />} />
              <Route path="ingressos" element={<AdminTickets />} />
              <Route path="clientes" element={<AdminClients />} />
              <Route path="pagamentos" element={<AdminPayments />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Check-in fica fora do layout padrão: tela cheia, sem header/footer */}
          <Route element={<BareLayout />}>
            <Route
              path="/checkin"
              element={
                <RequireAdmin>
                  <Checkin />
                </RequireAdmin>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
