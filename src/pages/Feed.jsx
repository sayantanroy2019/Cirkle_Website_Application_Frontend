import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import GroupsTab from '../components/home/GroupsTab.jsx'
import EventsTab from '../components/home/EventsTab.jsx'
import { useCityStore } from '../store/cityStore.js'
import { useEventsStore } from '../store/eventsStore.js'

const TABS = [
  { id: 'groups', label: 'Groups' },
  { id: 'events', label: 'Events' },
]

export function Feed() {
  // Keep the active sub-tab in the URL so returning here (e.g. back from an
  // event detail) restores the tab the user was on instead of resetting.
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'events' ? 'events' : 'groups'
  const setTab = (id) => setSearchParams(id === 'groups' ? {} : { tab: id }, { replace: true })

  // Prefetch events in the background so the Events tab is ready when tapped.
  const activeCityId = useCityStore((s) => s.activeCityId)
  const fetchEvents = useEventsStore((s) => s.fetchEvents)
  useEffect(() => {
    fetchEvents(activeCityId)
  }, [activeCityId, fetchEvents])

  return (
    <div>
      {/* Sub-tab toggle — segmented pill, active half filled. Sticks below the fixed top nav */}
      <div className="sticky top-14 md:top-16 z-40 bg-cirkle-black px-6 py-3">
        <div className="flex gap-1 p-1 rounded-full bg-cirkle-input border border-cirkle-border-card max-w-[340px] mx-auto">
          {TABS.map(({ id, label }) => {
            const isActive = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 py-2.5 rounded-full text-center font-body text-[14px] font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-cirkle-yellow text-cirkle-text-dark'
                    : 'text-cirkle-text-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {tab === 'groups' ? <GroupsTab /> : <EventsTab />}
    </div>
  )
}

export default Feed
