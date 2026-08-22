import { Routes, Route, Outlet } from 'react-router-dom'
import Landing from './pages/onboarding/Landing.jsx'
import PhoneEntry from './pages/onboarding/PhoneEntry.jsx'
import OtpVerification from './pages/onboarding/OtpVerification.jsx'
import OnboardingIntro from './pages/onboarding/OnboardingIntro.jsx'
import OnboardingVibe from './pages/onboarding/OnboardingVibe.jsx'
import NameStep from './pages/onboarding/steps/NameStep.jsx'
import DobStep from './pages/onboarding/steps/DobStep.jsx'
import GenderStep from './pages/onboarding/steps/GenderStep.jsx'
import CityStep from './pages/onboarding/steps/CityStep.jsx'
import TagsStep from './pages/onboarding/steps/TagsStep.jsx'
import PhotosStep from './pages/onboarding/steps/PhotosStep.jsx'
import EmailStep from './pages/onboarding/steps/EmailStep.jsx'
import Walkthrough from './pages/onboarding/Walkthrough.jsx'
import AppShell from './components/AppShell.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import Feed from './pages/Feed.jsx'
import MyGroups from './pages/MyGroups.jsx'
import MyTickets from './pages/MyTickets.jsx'
import Profile from './pages/Profile.jsx'
import CitySwitcher from './pages/CitySwitcher.jsx'
import EventDetail from './pages/EventDetail.jsx'
import EventAttendees from './pages/EventAttendees.jsx'
import EventTickets from './pages/EventTickets.jsx'
import EditProfile from './pages/EditProfile.jsx'
import Checkout from './pages/Checkout.jsx'
import PaymentSuccess from './pages/PaymentSuccess.jsx'
import TicketDetail from './pages/TicketDetail.jsx'
import PrivacyPolicy from './pages/legal/PrivacyPolicy.jsx'
import TermsOfUse from './pages/legal/TermsOfUse.jsx'
import SafetyGuidelines from './pages/legal/SafetyGuidelines.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/phone" element={<PhoneEntry />} />
      <Route path="/otp" element={<OtpVerification />} />
      {/* Authenticated, but capture={false}: the resume point comes from the
          verify response, so a remembered onboarding URL would only mislead. */}
      <Route path="/onboarding" element={<RequireAuth capture={false}><Outlet /></RequireAuth>}>
        <Route path="intro" element={<OnboardingIntro />} />
        <Route path="name" element={<NameStep />} />
        <Route path="dob" element={<DobStep />} />
        <Route path="gender" element={<GenderStep />} />
        <Route path="city" element={<CityStep />} />
        <Route path="tags" element={<TagsStep />} />
        <Route path="vibe" element={<OnboardingVibe />} />
        <Route path="photos" element={<PhotosStep />} />
        <Route path="email" element={<EmailStep />} />
      </Route>
      <Route
        path="/walkthrough"
        element={
          <RequireAuth capture={false}>
            <Walkthrough />
          </RequireAuth>
        }
      />
      {/* Everything below needs a session. Guarding at the route means these
          screens never mount tokenless and fire a request that is certain to
          401 — which showed as a flash of empty state before the redirect. */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/feed" element={<Feed />} />
        <Route path="/groups" element={<MyGroups />} />
        <Route path="/tickets" element={<MyTickets />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/city" element={<RequireAuth><CitySwitcher /></RequireAuth>} />
      <Route path="/events/:id" element={<RequireAuth><EventDetail /></RequireAuth>} />
      <Route path="/events/:id/attendees" element={<RequireAuth><EventAttendees /></RequireAuth>} />
      <Route path="/events/:id/tickets" element={<RequireAuth><EventTickets /></RequireAuth>} />
      <Route path="/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
      <Route path="/checkout/:eventId" element={<RequireAuth><Checkout /></RequireAuth>} />
      <Route path="/payment/success" element={<RequireAuth><PaymentSuccess /></RequireAuth>} />
      {/* Deep-link target from the WhatsApp ticket message. Guarded so a tap
          while logged out captures this path, runs OTP, and comes back here. */}
      <Route
        path="/tickets/:id"
        element={
          <RequireAuth>
            <TicketDetail />
          </RequireAuth>
        }
      />
      <Route path="/legal/privacy" element={<PrivacyPolicy />} />
      <Route path="/legal/terms" element={<TermsOfUse />} />
      <Route path="/legal/safety" element={<SafetyGuidelines />} />
    </Routes>
  )
}

export default App
