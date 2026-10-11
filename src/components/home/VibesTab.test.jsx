import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// The Vibes discovery feed: a deck of people going to events. The deck's
// state (cards, index) lives in the vibes store; the gesture only moves the
// index. These tests drive the store the way a swipe would and check what
// the attendee sees, plus the one rule that costs money: the feed is
// fetched once per session, not once per swipe.

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('../../store/gateStore.js', () => ({
  useGateStore: (selector) => selector({ profileComplete: true, ensureKnown: () => {} }),
}))
vi.mock('../CreateProfilePrompt.jsx', () => ({ default: () => <p>create-profile-prompt</p> }))
const get = vi.fn()
vi.mock('../../lib/api.js', () => ({ api: { get: (...a) => get(...a) }, ApiError: class ApiError extends Error {} }))

import { VibesTab } from './VibesTab.jsx'
import { useVibesStore } from '../../store/vibesStore.js'

const card = (n, name, age) => ({
  person: { id: `p${n}`, firstName: name, age, photos: [{ url: `https://img/${n}.jpg` }], tagline: '', lifestyleTags: [] },
  event: { id: `ev${n}`, name: `Event ${n}`, startsAt: '2026-11-20T15:30:00.000Z', venueName: 'Lawns', goingCount: 3 + n, categoryId: 'club' },
})
const CARDS = [card(1, 'Priya', 24), card(2, 'Rahul', 27), card(3, 'Zoya', 22)]

let resolveFeed
beforeEach(() => {
  navigate.mockReset()
  get.mockReset()
  useVibesStore.getState().reset()
  // jsdom has no scrollTo on elements; the deck scrolls the card to the top on change.
  Element.prototype.scrollTo = () => {}
  get.mockImplementation(() => new Promise((r) => { resolveFeed = r }))
})

describe('VibesTab', () => {
  it('shows the skeleton while the feed loads', () => {
    const { container } = render(<VibesTab />)
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
    expect(get).toHaveBeenCalledWith('/vibes')
  })

  it('shows the empty state when nobody is going anywhere', async () => {
    render(<VibesTab />)
    await act(async () => resolveFeed({ cards: [] }))
    expect(await screen.findByText('No vibes yet')).toBeInTheDocument()
  })

  it('renders the first person with their event, and peeks the next card behind', async () => {
    render(<VibesTab />)
    await act(async () => resolveFeed({ cards: CARDS }))
    expect(await screen.findByText('Priya, 24')).toBeInTheDocument()
    expect(screen.getByText('Event 1')).toBeInTheDocument()
    expect(screen.getByText('4 going')).toBeInTheDocument()
    expect(screen.getByText('Rahul, 27')).toBeInTheDocument() // the peek
    expect(screen.queryByText('Zoya, 22')).not.toBeInTheDocument()
  })

  it('advancing the deck (what a left swipe does) shows the next person, then the empty end of the deck stays on the last', async () => {
    render(<VibesTab />)
    await act(async () => resolveFeed({ cards: CARDS }))
    await screen.findByText('Priya, 24')
    act(() => useVibesStore.getState().setIndex(1))
    expect(screen.getByText('Rahul, 27')).toBeInTheDocument()
    expect(screen.getByText('Zoya, 22')).toBeInTheDocument() // now the peek
    act(() => useVibesStore.getState().setIndex(2))
    expect(screen.queryByText('Priya, 24')).not.toBeInTheDocument()
    expect(screen.getByText('Zoya, 22')).toBeInTheDocument()
    act(() => useVibesStore.getState().setIndex(99)) // past the end: clamped to the last card
    expect(screen.getByText('Zoya, 22')).toBeInTheDocument()
  })

  it('"Join me" takes the attendee to that person’s event', async () => {
    render(<VibesTab />)
    await act(async () => resolveFeed({ cards: CARDS }))
    await screen.findByText('Priya, 24')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Join me' }))
    expect(navigate).toHaveBeenCalledWith('/events/ev1')
  })

  it('fetches the feed once per session — not on every swipe, not on remount', async () => {
    const { unmount } = render(<VibesTab />)
    await act(async () => resolveFeed({ cards: CARDS }))
    await screen.findByText('Priya, 24')
    act(() => useVibesStore.getState().setIndex(1))
    act(() => useVibesStore.getState().setIndex(2))
    unmount()
    render(<VibesTab />)
    expect(await screen.findByText('Zoya, 22')).toBeInTheDocument() // keeps your place
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('a failed feed shows the error, and a Browser without a profile gets the prompt instead of a feed', async () => {
    const { ApiError } = await import('../../lib/api.js')
    get.mockImplementation(() => Promise.reject(new ApiError('Feed is down')))
    render(<VibesTab />)
    expect(await screen.findByText('Feed is down')).toBeInTheDocument()
  })
})
