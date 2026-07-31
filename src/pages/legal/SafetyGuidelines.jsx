import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Typographic helpers for the legal document.
function H({ children }) {
  return <h2 className="mt-9 font-body text-[17px] font-bold text-white">{children}</h2>
}
function P({ children }) {
  return (
    <p className="mt-3 font-body text-[14.5px] text-cirkle-text-light leading-[1.75]">{children}</p>
  )
}
function UL({ children }) {
  return <ul className="mt-3 flex flex-col gap-2.5">{children}</ul>
}
function LI({ children }) {
  return (
    <li className="flex gap-3 font-body text-[14.5px] text-cirkle-text-light leading-[1.7]">
      <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-cirkle-yellow shrink-0" />
      <span>{children}</span>
    </li>
  )
}
function Lead({ children }) {
  return <strong className="font-semibold text-white">{children}</strong>
}

export function SafetyGuidelines() {
  const navigate = useNavigate()

  return (
    <div className="bg-cirkle-black h-[100dvh] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-cirkle-black border-b border-cirkle-border">
        <div className="flex items-center gap-2 max-w-[720px] mx-auto w-full px-4 h-14">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
            aria-label="Back"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <h1 className="font-body text-[16px] font-bold text-white">Safety Guidelines</h1>
        </div>
      </header>

      {/* Scrollable document */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[720px] mx-auto w-full px-6 py-8 pb-16">
          <p className="font-body text-[12.5px] font-semibold uppercase tracking-wide text-cirkle-text-muted">
            Last updated: 31 July 2026
          </p>

          <H>1. Our Commitment to Safety</H>
          <P>
            Cirkle helps you find people to attend events with. Meeting new people should be exciting
            — and safe. These Safety Guidelines explain how to protect yourself, how our features are
            designed with safety in mind, and how to report anyone who makes you feel unsafe.
          </P>
          <P>
            Please read these guidelines before you attend an event or interact with another user.
            They form part of our Terms of Use.
          </P>

          <H>2. Before You Go — Meeting People Safely</H>
          <P>
            Cirkle connects you with other real people. As with any situation involving people you
            have not met before, take sensible precautions:
          </P>
          <UL>
            <LI>
              <Lead>Meet in public, at the event.</Lead> Cirkle is designed for meeting others at
              public events, not for private one-on-one meetings. Keep your first interactions in the
              public event setting.
            </LI>
            <LI>
              <Lead>Tell someone you trust.</Lead> Let a friend or family member know which event you
              are attending, when, and who you expect to be there.
            </LI>
            <LI>
              <Lead>Arrange your own transport.</Lead> Plan how you will get to and from the venue. Do
              not rely on someone you have just met.
            </LI>
            <LI>
              <Lead>Stay in control.</Lead> Watch your drink, know your limits, and keep your phone
              charged.
            </LI>
            <LI>
              <Lead>Trust your instincts.</Lead> If something or someone feels wrong, leave. You never
              owe anyone your time or company.
            </LI>
            <LI>
              <Lead>Protect your personal information.</Lead> Do not share your home address,
              financial details, or other sensitive information with people you have just met.
            </LI>
            <LI>
              <Lead>Guard your ticket.</Lead> Your booking reference/QR is your entry. Do not share it
              publicly.
            </LI>
          </UL>

          <H>3. How Cirkle Is Built for Safety</H>
          <P>We have designed several features with your safety in mind:</P>
          <UL>
            <LI>
              <Lead>Verified accounts.</Lead> Every user registers with a mobile number, which helps
              tie accounts to real, contactable individuals.
            </LI>
            <LI>
              <Lead>Age restrictions.</Lead> The Platform is for users 18 and older, and
              club/nightlife events are strictly restricted to those 18 and above.
            </LI>
            <LI>
              <Lead>Invite-only events.</Lead> For events marked invite-only, organizers review and
              approve who may attend, adding a layer of curation and control.
            </LI>
            <LI>
              <Lead>You choose what to share.</Lead> Only limited profile information (first name,
              age, gender, photos, tagline, interests) and the event you are attending are shown to
              other users. Your phone number, email, and date of birth are never shown to other
              users.
            </LI>
            <LI>
              <Lead>No obligation to connect.</Lead> Discovering someone or tapping "Join me" simply
              takes you to an event. You are never required to interact with anyone.
            </LI>
          </UL>
          <P>
            We continue to invest in safety, including planned features for reporting, blocking, and
            greater control over your visibility.
          </P>

          <H>4. Expected Behaviour</H>
          <P>
            All users must treat one another with respect. On and around the Platform, you must not:
          </P>
          <UL>
            <LI>Harass, threaten, intimidate, stalk, or abuse any other person.</LI>
            <LI>Engage in any unwanted, persistent, or inappropriate contact.</LI>
            <LI>
              Discriminate against or demean others on the basis of gender, religion, caste,
              ethnicity, sexual orientation, disability, or any other characteristic.
            </LI>
            <LI>
              Solicit money, engage in fraud, or use the Platform for any commercial or unlawful
              purpose.
            </LI>
            <LI>Use another person's photos or misrepresent your identity or age.</LI>
            <LI>Behave in any way at an event that endangers or harasses others.</LI>
          </UL>
          <P>
            Violations of these standards may result in immediate suspension or permanent removal
            from the Platform, and, where appropriate, reporting to law enforcement.
          </P>

          <H>5. Protecting Minors</H>
          <P>
            The Platform is strictly for adults (18+) for attending club events. We do not permit
            anyone under 18 to use the Services without verifiable parental or guardian consent as
            required by law, and club/nightlife events are adults-only. For other events anyone can
            attend. If you believe a minor is using the Platform unsafely or that any content
            endangers a minor, report it immediately using the contacts below; we treat such reports
            as our highest priority.
          </P>

          <H>6. Reporting a Problem or an Unsafe User</H>
          <P>
            Your safety comes first. If someone makes you feel unsafe, harasses you, or behaves
            inappropriately — on the Platform or at an event — please report it to us:
          </P>
          <div className="mt-4 rounded-card bg-cirkle-card border border-cirkle-border-card p-4">
            <p className="font-body text-[14.5px] text-white">
              <Lead>Email:</Lead>{' '}
              <a href="mailto:official@razex.io" className="text-cirkle-yellow hover:underline">
                official@razex.io
              </a>
            </p>
            <p className="mt-1 font-body text-[14.5px] text-white">
              <Lead>Grievance Officer:</Lead> Shubham Shashwat
            </p>
          </div>
          <P>
            When reporting, please include as much detail as possible (the person or event involved,
            dates, and what happened). We will review reports promptly and may suspend or remove
            users, share information with organizers or venues where appropriate, and cooperate with
            law enforcement.
          </P>
          <P>
            In an emergency, or if you are in immediate danger, contact the police (dial 112) or
            local emergency services first. Cirkle is not an emergency service and cannot respond to
            emergencies.
          </P>

          <H>7. If Something Goes Wrong at an Event</H>
          <UL>
            <LI>Speak to venue staff or security if you feel unsafe at a venue.</LI>
            <LI>Remove yourself from the situation and go to a safe, public place.</LI>
            <LI>Contact emergency services if you are in danger.</LI>
            <LI>
              Report the incident to us afterwards so we can take appropriate action on the Platform.
            </LI>
          </UL>

          <H>8. Our Limitations — Please Read</H>
          <P>
            Cirkle works to make the Platform safer, but we cannot guarantee the conduct of any user,
            organizer, or venue. We do not perform criminal background checks on users. The
            information shown on the Platform is largely provided by users and organizers themselves.
            Meeting anyone or attending any event is ultimately at your own risk, and you are
            responsible for your own safety and decisions. These guidelines are here to help you make
            safer choices — please use them.
          </P>

          <H>9. Contact</H>
          <div className="mt-4 rounded-card bg-cirkle-card border border-cirkle-border-card p-4">
            <p className="font-body text-[14.5px] text-white">
              <Lead>Grievance Officer:</Lead> Shubham Shashwat
            </p>
            <p className="mt-1 font-body text-[14.5px] text-white">
              <Lead>Email:</Lead>{' '}
              <a href="mailto:official@razex.io" className="text-cirkle-yellow hover:underline">
                official@razex.io
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default SafetyGuidelines
