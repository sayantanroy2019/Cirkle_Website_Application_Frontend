import { useActiveCity } from '../../context/ActiveCityContext.jsx'

export function GroupsTab() {
  const { activeCityName } = useActiveCity()

  return (
    <div className="px-6 py-6">
      <p className="font-body text-[15px] text-cirkle-text-muted">
        Groups forming in{' '}
        <span className="font-bold text-cirkle-yellow">{activeCityName || 'your city'}</span>{' '}
        will appear here — anchor cards you can join. Coming next.
      </p>
    </div>
  )
}

export default GroupsTab
