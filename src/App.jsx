import { Routes, Route, Outlet } from 'react-router-dom'
import Landing from './pages/onboarding/Landing.jsx'
import PhoneEntry from './pages/onboarding/PhoneEntry.jsx'
import { OnboardingProvider } from './pages/onboarding/OnboardingContext.jsx'
import NameStep from './pages/onboarding/steps/NameStep.jsx'
import DobStep from './pages/onboarding/steps/DobStep.jsx'
import GenderStep from './pages/onboarding/steps/GenderStep.jsx'
import CityStep from './pages/onboarding/steps/CityStep.jsx'
import TagsStep from './pages/onboarding/steps/TagsStep.jsx'
import PhotosStep from './pages/onboarding/steps/PhotosStep.jsx'
import EmailStep from './pages/onboarding/steps/EmailStep.jsx'
import AppShell from './components/AppShell.jsx'
import Feed from './pages/Feed.jsx'
import MyGroups from './pages/MyGroups.jsx'
import MyTickets from './pages/MyTickets.jsx'
import Profile from './pages/Profile.jsx'
import CitySwitcher from './pages/CitySwitcher.jsx'
import EventDetail from './pages/EventDetail.jsx'
import EditProfile from './pages/EditProfile.jsx'
import { ActiveCityProvider } from './context/ActiveCityContext.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/phone" element={<PhoneEntry />} />
      <Route
        path="/onboarding"
        element={
          <OnboardingProvider>
            <Outlet />
          </OnboardingProvider>
        }
      >
        <Route path="name" element={<NameStep />} />
        <Route path="dob" element={<DobStep />} />
        <Route path="gender" element={<GenderStep />} />
        <Route path="city" element={<CityStep />} />
        <Route path="tags" element={<TagsStep />} />
        <Route path="photos" element={<PhotosStep />} />
        <Route path="email" element={<EmailStep />} />
      </Route>
      <Route
        element={
          <ActiveCityProvider>
            <Outlet />
          </ActiveCityProvider>
        }
      >
        <Route element={<AppShell />}>
          <Route path="/feed" element={<Feed />} />
          <Route path="/groups" element={<MyGroups />} />
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/city" element={<CitySwitcher />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/profile/edit" element={<EditProfile />} />
      </Route>
    </Routes>
  )
}

export default App
