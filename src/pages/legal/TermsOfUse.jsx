import { ArrowLeft } from 'lucide-react'
import { useBackOr } from '../../lib/navigation.js'

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

export function TermsOfUse() {
  // Reachable from outside the app (payment-provider and search links), so
  // back must have somewhere to go when this is the first page in the tab.
  const goBack = useBackOr('/')

  return (
    <div className="bg-cirkle-black h-[100dvh] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-cirkle-black border-b border-cirkle-border">
        <div className="flex items-center gap-2 max-w-[720px] mx-auto w-full px-4 h-14">
          <button
            type="button"
            onClick={goBack}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/10 -ml-1.5"
            aria-label="Back"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <h1 className="font-body text-[16px] font-bold text-white">Terms of Use</h1>
        </div>
      </header>

      {/* Scrollable document */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[720px] mx-auto w-full px-6 py-8 pb-16">
          <p className="font-body text-[12.5px] font-semibold uppercase tracking-wide text-cirkle-text-muted">
            Last updated: 31 July 2026
          </p>

          <H>1. Acceptance of Terms</H>
          <P>
            These Terms of Use ("Terms") govern your access to and use of the Cirkle website, mobile
            applications, and services (collectively, the "Platform"), operated by Razespace Private
            Limited ("Cirkle", "we", "us", "our").
          </P>
          <P>
            By accessing, browsing, registering on, or using the Platform, you agree to be bound by
            these Terms and by our Privacy Policy and Safety Guidelines, which are incorporated by
            reference. If you do not agree, do not use the Platform.
          </P>
          <P>
            These Terms may be updated from time to time without individual notice. It is your
            responsibility to review them each time you use the Platform. Your continued use
            constitutes acceptance of the current Terms. In case of any conflict between these Terms
            and any other terms appearing on the Platform, these Terms prevail.
          </P>

          <H>2. Eligibility</H>
          <P>
            You must be 18 years of age or older to create an account and use the Platform. Certain
            events, including club and nightlife events, are strictly restricted to attendees 18
            years or older, and valid government-issued age proof may be required at the venue. By
            using the Platform you represent that you meet these requirements and that the
            information you provide is true and accurate.
          </P>

          <H>3. Your Account</H>
          <UL>
            <LI>You register using your mobile number and must provide accurate, complete information.</LI>
            <LI>
              You are responsible for maintaining the confidentiality of your account and for all
              activity under it.
            </LI>
            <LI>
              You may not impersonate any person, misrepresent your identity or age, use another
              person's photographs, or create an account on behalf of someone else.
            </LI>
            <LI>
              We may suspend or terminate accounts that violate these Terms, that we reasonably
              believe pose a safety risk, or that contain false information.
            </LI>
          </UL>

          <H>4. The Services</H>
          <P>
            Cirkle is a social discovery and events platform. Through the Platform you can:
          </P>
          <UL>
            <LI>Discover events listed by organizers.</LI>
            <LI>Book and pay for tickets to events.</LI>
            <LI>
              Discover other users attending events (the "Vibes" feed) and navigate to those events.
            </LI>
            <LI>Request invitations to invite-only events, subject to organizer approval.</LI>
          </UL>
          <P>
            Cirkle is a platform and intermediary. Events are organised and hosted by third-party
            organizers and venues. Cirkle facilitates discovery, booking, and payment, but is not
            the organiser of events unless expressly stated. Cirkle does not control, and is not
            responsible for, the conduct of event organizers, venues, or other users, or the
            quality, safety, or legality of events.
          </P>

          <H>5. Tickets, Bookings, and Payments</H>
          <UL>
            <LI>
              <Lead>Pricing.</Lead> Ticket prices are set by organizers and displayed on the
              Platform. Applicable taxes (including GST) are calculated and shown at checkout. The
              final amount payable is displayed before you confirm payment.
            </LI>
            <LI>
              <Lead>Payment.</Lead> Payments are processed through our third-party payment gateway.
              By making a booking you authorise the charge for the total amount shown.
            </LI>
            <LI>
              <Lead>Booking confirmation.</Lead> On successful payment, a ticket with a unique
              booking reference and QR code is issued and made available in the Platform.
              Confirmation may also be sent via SMS, email, or WhatsApp.
            </LI>
            <LI>
              <Lead>One ticket per user per event.</Lead> Each booking is for a single ticket for the
              account holder. You may hold only one ticket per event.
            </LI>
            <LI>
              <Lead>Ticket validity and entry.</Lead> Entry is granted on presentation and scanning
              of a valid ticket QR / booking reference at the venue. A ticket is valid for one entry
              only. Anyone presenting a valid booking reference may be permitted entry; keep your
              booking reference secure.
            </LI>
            <LI>
              <Lead>Seat holds.</Lead> When you begin checkout, a ticket may be held for you for a
              limited time. If payment is not completed within that time, the hold expires and the
              ticket is released.
            </LI>
            <LI>
              <Lead>Coupons.</Lead> Discount coupons, where offered, are subject to their own
              validity, usage limits, and conditions, and may be withdrawn at any time.
            </LI>
          </UL>

          <H>6. Cancellations and Refunds</H>
          <UL>
            <LI>
              <Lead>All bookings are final.</Lead> Tickets, once booked, cannot be cancelled,
              modified, exchanged, or transferred by you through the Platform.
            </LI>
            <LI>
              <Lead>Refunds.</Lead> If you experience a problem with a booking or an event, you may
              contact us. Refunds are not available as a matter of right. Where you raise an issue,
              our admin team will review it, and may, at its discretion, resolve the matter —
              including by issuing a refund where we consider it appropriate (for example, where an
              event is cancelled). Any refund is processed through the original payment method via
              our payment gateway. The decision of Cirkle on such matters is final and binding.
            </LI>
            <LI>
              <Lead>Event cancellation or changes by organizers.</Lead> Organizers may cancel,
              reschedule, or change events. Where an event is cancelled, we will work to process
              appropriate refunds. We are not liable for organizer-driven changes beyond
              facilitating any applicable refund.
            </LI>
          </UL>

          <H>7. Invite-Only Events</H>
          <UL>
            <LI>
              Some events are "invite-only". For these, you must request an invitation, which the
              event organizer may accept or reject at their sole discretion.
            </LI>
            <LI>
              Approval of an invitation grants you permission to purchase a ticket; it does not
              reserve a ticket or guarantee availability. You must still complete booking, subject to
              capacity.
            </LI>
            <LI>
              A rejected invitation is final. Approval and rejection decisions rest with the
              organizer.
            </LI>
          </UL>

          <H>8. User Conduct</H>
          <P>You agree that you will not:</P>
          <UL>
            <LI>Provide false information or misrepresent your identity, age, or photographs.</LI>
            <LI>
              Use the Platform to harass, threaten, stalk, abuse, defraud, or harm any other person.
            </LI>
            <LI>
              Use another user's information obtained through the Platform for any purpose other than
              as intended by the Services.
            </LI>
            <LI>
              Contact, meet, or interact with other users in any manner that is unlawful, harassing,
              or unsafe.
            </LI>
            <LI>
              Attempt to resell tickets, scrape data, reverse-engineer, disrupt, or gain
              unauthorised access to the Platform.
            </LI>
            <LI>Upload unlawful, obscene, infringing, or harmful content.</LI>
          </UL>
          <P>
            Violation may result in immediate suspension or termination and, where appropriate,
            referral to law enforcement.
          </P>

          <H>9. Meeting Other Users — Assumption of Risk</H>
          <P>
            Cirkle enables you to discover and, potentially, meet other people in connection with
            events. You understand and agree that Cirkle does not conduct background checks or verify
            the identity, character, or conduct of users beyond the limited measures described in our
            Safety Guidelines. Any interaction or meeting with another user or attendance at any
            event is at your own risk. You are solely responsible for your interactions with others.
            Please read our Safety Guidelines before meeting anyone.
          </P>
          <P>
            To the maximum extent permitted by law, Cirkle disclaims liability for the acts or
            omissions of any user, organizer, or venue, and for any harm arising from interactions or
            meetings facilitated through the Platform.
          </P>

          <H>10. Intellectual Property</H>
          <P>
            The Platform, including its design, text, graphics, logos, and software, is owned by or
            licensed to Cirkle and protected by applicable laws. You may not copy, reproduce, or
            exploit any part of the Platform without our prior written consent. Content you upload
            remains yours, but you grant Cirkle a licence to host, display, and use it as necessary
            to operate the Services (including displaying your profile in the Vibes feed and to
            organizers as described in the Privacy Policy).
          </P>

          <H>11. Disclaimers and Limitation of Liability</H>
          <UL>
            <LI>
              The Platform is provided on an "as is" and "as available" basis without warranties of
              any kind.
            </LI>
            <LI>
              Cirkle does not warrant that the Platform will be uninterrupted, error-free, or secure,
              or that events will occur as described by organizers.
            </LI>
            <LI>
              To the maximum extent permitted by law, Cirkle's total liability for any claim arising
              out of or relating to the Services shall not exceed the amount you paid to Cirkle for
              the specific booking giving rise to the claim.
            </LI>
            <LI>
              Cirkle shall not be liable for any indirect, incidental, special, or consequential
              damages.
            </LI>
          </UL>

          <H>12. Indemnity</H>
          <P>
            You agree to indemnify and hold harmless Cirkle and its officers, employees, and partners
            from any claims, damages, or expenses arising out of your use of the Platform, your
            violation of these Terms, or your interactions with other users, organizers, or venues.
          </P>

          <H>13. Suspension and Termination</H>
          <P>
            We may suspend or terminate your access at any time, with or without notice, for
            violation of these Terms, suspected fraud or safety risk, or as required by law. You may
            stop using the Platform and request account deletion at any time, subject to legal
            retention requirements.
          </P>

          <H>14. Governing Law and Jurisdiction</H>
          <P>
            These Terms are governed by the laws of India. Subject to applicable law, the courts at
            Delhi shall have exclusive jurisdiction over any dispute arising out of or relating to
            these Terms or the Platform.
          </P>

          <H>15. Grievance Officer and Contact</H>
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
          <P>
            Complaints will be acknowledged and addressed within the timelines prescribed under
            applicable law.
          </P>
        </div>
      </main>
    </div>
  )
}

export default TermsOfUse
