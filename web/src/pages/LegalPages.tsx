import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useSeo } from '../hooks/useSeo.js';

const CONTACT_EMAIL = 'abadirhassan10@gmail.com';
const UPDATED = '30 September 2026';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-text-primary">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

const mail = (
  <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand hover:underline">
    {CONTACT_EMAIL}
  </a>
);

/**
 * The privacy policy for the web, Android and iOS apps.
 *
 * It describes what the code actually stores (see supabase/migrations), so
 * when a feature starts collecting something new -- analytics, a new profile
 * field, a new processor -- this page has to change with it. Kept in English
 * only: a legal text should have one authoritative wording.
 */
export function PrivacyPage() {
  useSeo({
    title: 'Privacy Policy',
    description:
      'What East-Market collects when you buy and sell, why, who it is shared with, and how to have it deleted.',
    path: '/legal/privacy',
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-text-muted">Last updated {UPDATED}</p>

      <p className="mt-6 text-sm leading-relaxed text-text-secondary">
        East-Market is an online marketplace for buying and selling in Somaliland, Somalia,
        Ethiopia, Kenya and Djibouti. This policy explains what information we collect when you
        use the East-Market website and the Android and iOS apps, why we collect it, and the
        choices you have. It applies to all three.
      </p>

      <Section title="Information you give us">
        <List
          items={[
            <>
              <strong className="text-text-primary">Account details</strong> — your email address
              and password when you register, and optionally your name, profile photo, phone
              number, WhatsApp number and city.
            </>,
            <>
              <strong className="text-text-primary">Listings</strong> — the title, description,
              price, category, location, photos and videos you post. Listings are public: anyone
              can see them, along with your seller name and city.
            </>,
            <>
              <strong className="text-text-primary">Messages</strong> — conversations with other
              users in the app. Only the people in a conversation can read it; our moderators may
              review a conversation when it is reported.
            </>,
            <>
              <strong className="text-text-primary">Reviews, reports and favorites</strong> — the
              reviews you leave for sellers, the listings or users you report, the listings you
              save and the sellers you follow.
            </>,
            <>
              <strong className="text-text-primary">Seller verification (optional)</strong> — if
              you ask to become a verified seller, your full name and an identity or business
              document (such as a passport, national ID or business registration). These are
              stored privately and seen only by our moderators.
            </>,
            <>
              <strong className="text-text-primary">Payments</strong> — if you pay for a paid
              feature, the amount, the payment method and the reference returned by the mobile
              money provider. We never see or store your mobile money PIN.
            </>,
          ]}
        />
      </Section>

      <Section title="Information collected automatically">
        <List
          items={[
            <>
              <strong className="text-text-primary">Location</strong> — only if you allow it, your
              approximate position, used to sort listings by distance. You can refuse or turn it
              off at any time; you can always choose a city by hand instead.
            </>,
            <>
              <strong className="text-text-primary">Activity</strong> — which listings are viewed
              (to show view counts to sellers) and your recent searches (to suggest them again).
            </>,
            <>
              <strong className="text-text-primary">Device information</strong> — a push
              notification token for your phone, if you allow notifications, and basic technical
              logs (such as IP address and browser) that our hosting providers keep for security
              and troubleshooting.
            </>,
            <>
              <strong className="text-text-primary">Local storage</strong> — the website and apps
              store your sign-in session, language, currency and city on your device so you stay
              signed in and see the marketplace the way you set it.
            </>,
          ]}
        />
        <p>
          We do not use advertising trackers or third-party analytics, and we do not sell your
          information.
        </p>
      </Section>

      <Section title="How we use it">
        <List
          items={[
            'To run the marketplace: publish your listings, deliver your messages, and show you listings near you.',
            'To keep people safe: review reported listings and users, verify sellers, and prevent fraud and spam.',
            'To send you notifications you have asked for, such as new messages.',
            'To process payments for paid features.',
            'To fix problems and improve the service.',
          ]}
        />
      </Section>

      <Section title="Who can see or receive your information">
        <List
          items={[
            'Other users — your public listings and seller profile, and the messages you send them.',
            'Our moderators — to handle reports and verification requests.',
            'Service providers that host and operate East-Market for us: Supabase (database, sign-in and file storage, in the European Union), Vercel (website and API hosting) and, for push notifications, Google Firebase and Apple.',
            'Mobile money providers (such as Zaad, eDahab, EVC Plus, Sahal, Telebirr and M-Pesa) — only the details needed to complete a payment you make.',
            'Authorities — when the law requires it, or to protect people from harm or fraud.',
          ]}
        />
        <p>
          When you contact a seller by WhatsApp or phone, that conversation happens outside
          East-Market and is covered by those services’ own policies.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account and listings while your account is open. When you delete a listing
          it is removed from the marketplace. When we delete your account at your request, we
          delete your profile, listings, messages and favorites, and the photos and videos you
          uploaded. We may keep
          payment records and moderation records for longer where the law or fraud prevention
          requires it.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <List
          items={[
            'Edit your profile and listings at any time in the app.',
            'Turn off location access and notifications in your device settings.',
            <>
              Ask for a copy of your information, a correction, or the deletion of your account by
              emailing {mail} from the address on your account. We will respond within 30 days.
            </>,
          ]}
        />
      </Section>

      <Section title="Security">
        <p>
          Connections to East-Market are encrypted (HTTPS). Access to data is limited by account:
          you can only change your own listings and read your own conversations, and identity
          documents are kept in private storage. No system is perfectly secure, so please use a
          strong password that you do not use elsewhere.
        </p>
      </Section>

      <Section title="Children">
        <p>
          East-Market is not intended for children under 16, and we do not knowingly collect
          information from them. If you believe a child has created an account, contact us and we
          will remove it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we change this policy we will update the date at the top of this page. For significant
          changes we will also let you know before they take effect.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about this policy or your information: {mail}.</p>
      </Section>

      <p className="mt-10 text-sm">
        <Link to="/" className="font-medium text-brand hover:underline">
          ← Back to East-Market
        </Link>
      </p>
    </article>
  );
}

/**
 * The terms of service for the web, Android and iOS apps.
 *
 * Like the privacy policy it follows what the product actually does:
 * listings can be held for review, rejected, suspended or expire
 * (product_status), and the paid features are featured listings and
 * subscriptions. Change it when those change.
 */
export function TermsPage() {
  useSeo({
    title: 'Terms of Service',
    description:
      'The rules for buying and selling on East-Market: accounts, listings, prohibited items, paid features and safety.',
    path: '/legal/terms',
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-text-muted">Last updated {UPDATED}</p>

      <p className="mt-6 text-sm leading-relaxed text-text-secondary">
        These terms are the agreement between you and East-Market for using the East-Market
        website and the Android and iOS apps. By creating an account or using East-Market you
        agree to them. Please also read our{' '}
        <Link to="/legal/privacy" className="font-medium text-brand hover:underline">
          Privacy Policy
        </Link>
        , which explains how we handle your information.
      </p>

      <Section title="What East-Market is">
        <p>
          East-Market is a place where people in Somaliland, Somalia, Ethiopia, Kenya and Djibouti
          advertise items and property for sale or rent and contact each other. We are not the
          buyer or the seller, we do not own or inspect the items listed, and we are not a party to
          any deal you make. Payment, delivery and the condition of an item are between the buyer
          and the seller.
        </p>
      </Section>

      <Section title="Your account">
        <List
          items={[
            'You must be at least 16 years old to use East-Market.',
            'Give accurate information, and keep your contact details up to date so buyers and sellers can reach you.',
            'Keep your password private. You are responsible for what happens on your account; tell us straight away if you think someone else is using it.',
            'Do not use another person’s account, or open new accounts to get around a suspension.',
          ]}
        />
      </Section>

      <Section title="Listing rules">
        <List
          items={[
            'Only list things you own or are authorised to sell or rent, and that are actually available.',
            'Describe items honestly: a real price, the true condition, and photos and videos of the actual item.',
            'Put each listing in the right category and location, and do not post the same item repeatedly.',
            'Mark a listing as sold, or delete it, once it is no longer available.',
          ]}
        />
      </Section>

      <Section title="What is not allowed">
        <p>You may not list, or use East-Market to arrange:</p>
        <List
          items={[
            'Anything illegal where you or the buyer are, including stolen goods, weapons and ammunition, drugs, and counterfeit or pirated goods.',
            'Wild or protected animals and their parts, such as ivory.',
            'Adult services, any trade in people, or anything that exploits children.',
            'Fake listings, advance-fee or deposit scams, and requests for payment for items that do not exist.',
          ]}
        />
        <p>You also may not:</p>
        <List
          items={[
            'Harass, threaten or abuse other users, or post hateful or offensive content.',
            'Send spam, or use other users’ contact details for anything other than the listing.',
            'Scrape the site, interfere with how it works, or try to get into accounts or data that are not yours.',
          ]}
        />
      </Section>

      <Section title="How we moderate">
        <p>
          To keep the marketplace safe we may review listings before or after they appear, and we
          may move a listing to the right category, reject or remove a listing, or suspend or close
          an account that breaks these terms or that we reasonably believe puts other users at
          risk. Listings may also expire after a period without being renewed. If you think we
          made a mistake, contact us and we will look at it again.
        </p>
        <p>
          Use the Report button on any listing or user that breaks these rules. Reports help us act
          quickly.
        </p>
      </Section>

      <Section title="Paid features">
        <p>
          Posting a listing is free. Optional paid features, such as featured listings and seller
          subscriptions, are charged at the price shown before you pay, through the mobile money
          provider you choose. A featured placement or subscription runs for the period shown at
          purchase and does not guarantee a sale. If a paid feature was not delivered, or you were
          charged in error, contact us within 30 days and we will put it right or refund you. Paid
          features are not refunded when a listing is removed for breaking these terms.
        </p>
      </Section>

      <Section title="Staying safe">
        <List
          items={[
            'Meet in a public place and inspect the item before you pay.',
            'Be careful with requests to pay a deposit or send money before you have seen the item.',
            'For property, land and vehicles, check ownership documents before any money changes hands.',
            'Keep conversations in East-Market messages where you can, so they can be reviewed if something goes wrong.',
          ]}
        />
      </Section>

      <Section title="Your content">
        <p>
          You keep ownership of the text, photos and videos you post. By posting them you allow
          East-Market to store, display, resize and share them on the website and apps, and in
          links people share, for as long as the listing is up. You confirm you have the right to
          post them and that they do not infringe anyone else’s rights.
        </p>
        <p>
          The East-Market name, logo and design belong to East-Market and may not be used without
          our permission.
        </p>
      </Section>

      <Section title="Ending your account">
        <p>
          You can stop using East-Market at any time and ask us to delete your account by emailing{' '}
          {mail}. We may suspend or close an account that breaks these terms. Some records may be
          kept after an account is closed, as described in the Privacy Policy.
        </p>
      </Section>

      <Section title="Disclaimers and liability">
        <p>
          East-Market is provided “as is”. We work to keep it available and accurate, but we do not
          promise it will always be uninterrupted or error-free, and we cannot guarantee that
          listings or users are genuine. Because we are not a party to deals between users, we are
          not responsible for the items, the payments or the conduct of buyers and sellers.
        </p>
        <p>
          To the extent the law allows, East-Market is not liable for indirect or consequential
          losses, and our total liability to you is limited to the amount you paid us for paid
          features in the 12 months before the claim. Nothing in these terms limits rights you have
          under the law that cannot be limited.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms as East-Market changes. We will update the date at the top of
          this page and, for significant changes, let you know before they take effect. If you keep
          using East-Market after that, you accept the updated terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about these terms: {mail}.</p>
      </Section>

      <p className="mt-10 text-sm">
        <Link to="/" className="font-medium text-brand hover:underline">
          ← Back to East-Market
        </Link>
      </p>
    </article>
  );
}

/**
 * Community guidelines: the Terms of Service rules, in plain everyday terms.
 *
 * The "Report" section mirrors the report_reason enum (scam, fake_product,
 * wrong_information, offensive, illegal, duplicate, spam, other) so that each
 * guideline has a matching reason a user can pick. Keep the two in step.
 */
export function CommunityGuidelinesPage() {
  useSeo({
    title: 'Community Guidelines',
    description:
      'How to buy and sell well on East-Market: honest listings, respectful messages, safe deals, and what to report.',
    path: '/legal/community-guidelines',
  });

  const termsLink = (
    <Link to="/legal/terms" className="font-medium text-brand hover:underline">
      Terms of Service
    </Link>
  );

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
        Community Guidelines
      </h1>
      <p className="mt-2 text-sm text-text-muted">Last updated {UPDATED}</p>

      <p className="mt-6 text-sm leading-relaxed text-text-secondary">
        East-Market works when buyers can trust what they see and sellers are treated fairly. These
        guidelines explain, in everyday terms, what that looks like. They sit alongside our{' '}
        {termsLink}, which are the binding rules.
      </p>

      <Section title="Be honest in your listings">
        <List
          items={[
            'Use your own photos and videos of the actual item, not pictures copied from the internet or another listing.',
            'Show the price you will really accept. If it is negotiable, say so — do not post a low price to attract calls and then ask for more.',
            'Describe the condition truthfully, including any faults, damage or missing parts.',
            'Give the real location of the item, so buyers know how far they will travel.',
            'Post each item once, in the category that fits it best.',
            'Mark it sold, or delete it, as soon as it is gone.',
          ]}
        />
      </Section>

      <Section title="Property, land, vehicles and livestock">
        <p>These deals involve large sums, so they need extra care.</p>
        <List
          items={[
            'Houses and land: only list property you own or are authorised to sell or rent, and be ready to show title or authorisation documents.',
            'Vehicles: give the real year, mileage and condition, and have the registration papers ready for the buyer to check.',
            'Livestock: describe the animals’ age, breed and health honestly, and let buyers see them before paying.',
            'Rentals: state the rent, the deposit and what is included, and do not ask for money before the tenant has seen the place.',
          ]}
        />
      </Section>

      <Section title="Talk to each other with respect">
        <List
          items={[
            'Be polite, even when you disagree on a price. A “no, thank you” is enough.',
            'No insults, threats, harassment, or hateful comments about anyone’s clan, tribe, religion, nationality, gender or disability.',
            'Answer messages about your listings, and tell buyers when an item has sold.',
            'Use someone’s phone number or WhatsApp only to talk about the listing they posted.',
          ]}
        />
      </Section>

      <Section title="Keep deals safe">
        <List
          items={[
            'Meet in a busy public place, and bring someone with you for high-value items.',
            'See and check the item before you pay. Never send a deposit for something you have not seen.',
            'Be wary of prices that look too good to be true, and of pressure to decide or pay quickly.',
            'Never share your mobile money PIN or a verification code — East-Market will never ask for them.',
            'Keep your conversation in East-Market messages where you can, so there is a record if something goes wrong.',
          ]}
        />
      </Section>

      <Section title="Never allowed">
        <p>
          Some things are never allowed, however they are described: illegal goods, stolen
          property, weapons and ammunition, drugs, counterfeit goods, protected wildlife, adult
          services, any trade in people, and anything that exploits children. The full list is in
          the {termsLink}.
        </p>
      </Section>

      <Section title="Report what looks wrong">
        <p>
          Use the Report button on a listing or a user’s profile. Reports are private — the person
          you report is not told who reported them. Choose the reason that fits best:
        </p>
        <List
          items={[
            <>
              <strong className="text-text-primary">Scam</strong> — asks for payment up front,
              pretends to be someone else, or the item does not exist.
            </>,
            <>
              <strong className="text-text-primary">Fake product</strong> — counterfeit, or the
              photos are not of the real item.
            </>,
            <>
              <strong className="text-text-primary">Wrong information</strong> — the price,
              condition, location or category is misleading.
            </>,
            <>
              <strong className="text-text-primary">Offensive</strong> — insulting, hateful or
              abusive content or messages.
            </>,
            <>
              <strong className="text-text-primary">Illegal</strong> — anything on the never-allowed
              list above.
            </>,
            <>
              <strong className="text-text-primary">Duplicate</strong> — the same item posted more
              than once.
            </>,
            <>
              <strong className="text-text-primary">Spam</strong> — repeated, irrelevant or
              advertising messages.
            </>,
            <>
              <strong className="text-text-primary">Other</strong> — anything else that breaks
              these guidelines; add a short note so we understand.
            </>,
          ]}
        />
        <p>
          If you are in danger or have been the victim of a crime, contact the local police first.
        </p>
      </Section>

      <Section title="What happens when guidelines are broken">
        <p>
          Our moderators review reports and may ask you to correct a listing, move it to the right
          category, remove it, or — for serious or repeated problems — suspend or close the
          account. Scams, illegal items and threats can lead to an account being closed straight
          away. If you think we got it wrong, email {mail} and we will look again.
        </p>
      </Section>

      <p className="mt-10 text-sm">
        <Link to="/" className="font-medium text-brand hover:underline">
          ← Back to East-Market
        </Link>
      </p>
    </article>
  );
}
