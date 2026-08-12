import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Layout, BareLayout } from '@/components/Layout';
import { RequireAuth, RequireAdmin } from '@/components/RouteGuards';
import { Spinner } from '@/components/Spinner';

/**
 * Carregamento sob demanda: cada página só baixa o próprio código quando a
 * pessoa realmente navega até ela — em vez de todo mundo baixar o código de
 * TODAS as páginas (inclusive as de admin, que a imensa maioria dos
 * visitantes nunca vai ver) só pra ver a home. Isso reduz bastante o
 * tamanho do que precisa carregar na primeira visita, especialmente em
 * conexões mais lentas.
 */
const Home = lazy(() => import('@/pages/Home'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Login = lazy(() => import('@/pages/Login'));
const ClientDashboard = lazy(() => import('@/pages/ClientDashboard'));
const PhotoGallery = lazy(() => import('@/pages/PhotoGallery'));
const Checkin = lazy(() => import('@/pages/Checkin'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const PrivacyPolicy = lazy(() => import('@/pages/Legal').then((m) => ({ default: m.PrivacyPolicy })));
const TermsOfUse = lazy(() => import('@/pages/Legal').then((m) => ({ default: m.TermsOfUse })));
const NotFound = lazy(() => import('@/pages/NotFound'));const AdminLayout = lazy(() => import('@/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/admin/AdminDashboard'));
const AdminEvent = lazy(() => import('@/admin/AdminEvent'));
const AdminCourtesy = lazy(() => import('@/admin/AdminCourtesy'));
const AdminCoupons = lazy(() => import('@/admin/AdminCoupons'));
const AdminTickets = lazy(() => import('@/admin/AdminTickets'));
const AdminClients = lazy(() => import('@/admin/AdminClients'));
const AdminPayments = lazy(() => import('@/admin/AdminPayments'));

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Suspense fallback={<Spinner fullScreen />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/checkout" element={<Checkout />} />
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
                path="/fotos"
                element={
                  <RequireAuth>
                    <PhotoGallery />
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
                <Route path="evento" element={<AdminEvent />} />
                <Route path="cortesias" element={<AdminCourtesy />} />
                <Route path="cupons" element={<AdminCoupons />} />
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
        </Suspense>
      </AuthProvider>
    </HashRouter>
  );
}
