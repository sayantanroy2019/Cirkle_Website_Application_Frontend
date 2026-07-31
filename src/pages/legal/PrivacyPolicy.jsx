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
function SubH({ children }) {
  return <p className="mt-5 font-body text-[14.5px] font-bold text-white">{children}</p>
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

export function PrivacyPolicy() {
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
          <h1 className="font-body text-[16px] font-bold text-white">Privacy Policy</h1>
        </div>
      </header>

      {/* Scrollable document */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[720px] mx-auto w-full px-6 py-8 pb-16">
          <p className="font-body text-[12.5px] font-semibold uppercase tracking-wide text-cirkle-text-muted">
            Last updated: 31 July 2026
          </p>

          <H>1. Introduction</H>
          <P>
            This Privacy Policy explains how Razespace Private Limited ("Cirkle", "we", "us", or
            "our") collects, uses, discloses, stores, and protects your personal data when you use
            the Cirkle website, mobile applications, and related services (collectively, the
            "Platform" or "Services").
          </P>
          <P>
            Cirkle is an AI-native social discovery and events platform that helps people find
            others attending the same events and attend them together. Because our Services involve
            connecting individuals and displaying limited profile information to other users, please
            read this Policy carefully.
          </P>
          <P>
            By using the Platform, you consent to the collection and use of your personal data as
            described in this Policy. If you do not agree, please do not use the Services.
          </P>
          <P>
            This Policy is published in compliance with the Digital Personal Data Protection Act,
            2023, the Information Technology Act, 2000, the Information Technology (Reasonable
            Security Practices and Procedures and Sensitive Personal Data or Information) Rules,
            2011, and applicable rules made thereunder.
          </P>

          <H>2. Who We Are (Data Fiduciary)</H>
          <P>
            For the purposes of the DPDP Act, Cirkle is the "Data Fiduciary" that determines the
            purpose and means of processing your personal data. Our contact and grievance details
            are in Section 12.
          </P>

          <H>3. Eligibility and Age</H>
          <P>
            The Platform is intended for use by individuals 18 years of age and older. Certain
            events — including club and nightlife events — are strictly restricted to users aged 18
            and above, and you may be required to verify your age to book or attend such events.
          </P>
          <P>
            We do not knowingly collect personal data from individuals under the age of 18 without
            verifiable consent of a parent or lawful guardian as required under the DPDP Act. If we
            learn that we have collected data from a person under 18 without such consent, we will
            delete it.
          </P>

          <H>4. Personal Data We Collect</H>
          <P>We collect the following categories of personal data:</P>

          <SubH>Information you provide directly</SubH>
          <UL>
            <LI>
              <Lead>Account &amp; identity:</Lead> phone number (used for login), email address,
              first and last name, date of birth, gender.
            </LI>
            <LI>
              <Lead>Profile:</Lead> photographs you upload, a short tagline or bio, your city, and
              lifestyle interests/tags you select.
            </LI>
            <LI>
              <Lead>Bookings &amp; activity:</Lead> the events you view, book, attend, or express
              interest in; your tickets, booking references, and check-in status; invitation
              requests you send for invite-only events.
            </LI>
            <LI>
              <Lead>Communications:</Lead> queries, feedback, and support requests you send us.
            </LI>
          </UL>

          <SubH>Information collected automatically</SubH>
          <UL>
            <LI>
              <Lead>Device &amp; usage data:</Lead> device type, operating system, app version, and
              interactions with the Platform, for the purpose of operating and improving the
              Services and for security.
            </LI>
            <LI>
              <Lead>Log data:</Lead> access times and error logs.
            </LI>
          </UL>

          <SubH>Payment information</SubH>
          <UL>
            <LI>
              Payments are processed by our third-party payment gateway (Razorpay). We do not store
              your full card, UPI, or bank details on our servers. We retain limited transaction
              records (amount, status, payment method type, and gateway transaction identifiers) for
              order management, reconciliation, refunds, and legal compliance.
            </LI>
          </UL>

          <H>5. How We Use Your Data</H>
          <P>We use your personal data to:</P>
          <UL>
            <LI>Create and manage your account and profile.</LI>
            <LI>
              Provide the core Services — showing you events, enabling bookings, delivering tickets,
              and enabling the social-discovery ("Vibes") feed.
            </LI>
            <LI>Operate the invitation and approval flow for invite-only events.</LI>
            <LI>Process payments, issue tickets, and handle refunds through our payment gateway.</LI>
            <LI>
              Communicate with you — booking confirmations, ticket delivery, event updates, and
              service messages (including via SMS, email, and, where you have provided consent,
              WhatsApp).
            </LI>
            <LI>Provide customer support and resolve grievances.</LI>
            <LI>Detect, prevent, and address fraud, abuse, safety issues, and security incidents.</LI>
            <LI>Improve and personalise the Services.</LI>
            <LI>Comply with legal obligations.</LI>
          </UL>

          <H>6. How Your Data Is Shown to Other Users</H>
          <P>
            Because Cirkle is a social platform, some of your information is visible to other users.
            You should understand this clearly before using the Services:
          </P>
          <UL>
            <LI>
              <Lead>The Vibes feed:</Lead> When you hold a ticket to an upcoming event, a card
              showing your first name, age, gender, photos, tagline, and lifestyle interests,
              together with the event you are attending and its date and venue, may be shown to
              other users of the Platform so they can discover people attending the same or similar
              events.
            </LI>
            <LI>
              <Lead>Invite-only events:</Lead> When you request an invitation to an invite-only
              event, the event organizer can view your profile in order to accept or reject your
              request.
            </LI>
          </UL>
          <P>
            Your phone number, email address, and date of birth are never displayed to other users.
            Only the profile fields described above are shown.
          </P>
          <P>
            We are actively developing additional privacy controls, including options to limit your
            visibility in the Vibes feed. Until such controls are available, participation in the
            feed is a feature of holding a ticket.
          </P>

          <H>7. Sharing and Disclosure</H>
          <P>We do not sell your personal data. We share it only as follows:</P>
          <UL>
            <LI>
              <Lead>Event organizers:</Lead> limited profile information necessary for event entry,
              invitation approval, and attendance management.
            </LI>
            <LI>
              <Lead>Service providers:</Lead> payment gateway (Razorpay), cloud hosting and storage
              (Amazon Web Services), and communication providers (for SMS/email/WhatsApp), who
              process data on our behalf under contractual safeguards.
            </LI>
            <LI>
              <Lead>Legal and safety:</Lead> where required by law, court order, or governmental
              authority, or where necessary to protect the rights, safety, or property of Cirkle,
              our users, or the public.
            </LI>
            <LI>
              <Lead>Business transfers:</Lead> in connection with a merger, acquisition, or sale of
              assets, subject to this Policy.
            </LI>
          </UL>

          <H>8. Data Security</H>
          <P>
            We implement reasonable security safeguards to protect your personal data, including
            encryption in transit, access controls and access logging, private storage of uploaded
            photographs served only via time-limited signed links, and hashing of authentication
            credentials. No method of transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </P>
          <P>
            In the event of a personal data breach, we will notify the Data Protection Board of
            India and affected users in accordance with the DPDP Act and its Rules.
          </P>

          <H>9. Data Retention</H>
          <P>
            We retain your personal data for as long as your account is active and as necessary to
            provide the Services, and thereafter as required to comply with legal, tax, accounting,
            and regulatory obligations, to resolve disputes, and to enforce our agreements.
            Transaction records are retained as required under applicable financial and tax laws.
          </P>

          <H>10. Your Rights</H>
          <P>Subject to applicable law, you have the right to:</P>
          <UL>
            <LI>Access the personal data we hold about you.</LI>
            <LI>Correct or update inaccurate or incomplete data.</LI>
            <LI>Request erasure of your data, subject to legal retention requirements.</LI>
            <LI>
              Withdraw consent for processing (which may limit your ability to use certain
              Services).
            </LI>
            <LI>
              Nominate another individual to exercise your rights in the event of death or
              incapacity, as provided under the DPDP Act.
            </LI>
            <LI>Grievance redressal (see Section 12).</LI>
          </UL>
          <P>To exercise these rights, contact us using the details in Section 12.</P>

          <H>11. Cookies and Similar Technologies</H>
          <P>
            We and our service providers may use cookies and similar technologies to operate the
            Platform, remember your session, and analyse usage. You can control cookies through your
            browser settings, though disabling them may affect functionality.
          </P>

          <H>12. Grievance Officer and Contact</H>
          <P>
            In accordance with the Information Technology Act, 2000, the Consumer Protection
            (E-Commerce) Rules, 2020, and the DPDP Act, 2023, the contact details of our Grievance
            Officer are:
          </P>
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
            We will acknowledge grievances promptly and endeavour to resolve them within the
            timelines prescribed under applicable law (generally within 30 days). If your grievance
            is not resolved satisfactorily, you may escalate it to the Data Protection Board of
            India.
          </P>

          <H>13. Changes to This Policy</H>
          <P>
            We may update this Policy from time to time. The updated version will be posted on the
            Platform with a revised "Last updated" date. Your continued use of the Services after
            changes take effect constitutes acceptance of the revised Policy.
          </P>
        </div>
      </main>
    </div>
  )
}

export default PrivacyPolicy
