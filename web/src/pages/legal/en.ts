import type { LegalContent } from './types.js';

/**
 * English is the authoritative version of every legal page; the other
 * languages are translations of this file. Change this one first.
 */
export const en: LegalContent = {
  updated: 'Last updated 30 September 2026',
  back: '← Back to East-Market',

  privacy: {
    title: 'Privacy Policy',
    description:
      'What East-Market collects when you buy and sell, why, who it is shared with, and how to have it deleted.',
    intro:
      'East-Market is an online marketplace for buying and selling in Somaliland, Somalia, Ethiopia, Kenya and Djibouti. This policy explains what information we collect when you use the East-Market website and the Android and iOS apps, why we collect it, and the choices you have. It applies to all three.',
    sections: [
      {
        title: 'Information you give us',
        blocks: [
          {
            list: [
              '**Account details** — your email address and password when you register, and optionally your name, profile photo, phone number, WhatsApp number and city.',
              '**Listings** — the title, description, price, category, location, photos and videos you post. Listings are public: anyone can see them, along with your seller name and city.',
              '**Messages** — conversations with other users in the app. Only the people in a conversation can read it; our moderators may review a conversation when it is reported.',
              '**Reviews, reports and favorites** — the reviews you leave for sellers, the listings or users you report, the listings you save and the sellers you follow.',
              '**Seller verification (optional)** — if you ask to become a verified seller, your full name and an identity or business document (such as a passport, national ID or business registration). These are stored privately and seen only by our moderators.',
              '**Payments** — if you pay for a paid feature, the amount, the payment method and the reference returned by the mobile money provider. We never see or store your mobile money PIN.',
            ],
          },
        ],
      },
      {
        title: 'Information collected automatically',
        blocks: [
          {
            list: [
              '**Location** — only if you allow it, your approximate position, used to sort listings by distance. You can refuse or turn it off at any time; you can always choose a city by hand instead.',
              '**Activity** — which listings are viewed (to show view counts to sellers) and your recent searches (to suggest them again).',
              '**Device information** — a push notification token for your phone, if you allow notifications, and basic technical logs (such as IP address and browser) that our hosting providers keep for security and troubleshooting.',
              '**Local storage** — the website and apps store your sign-in session, language, currency and city on your device so you stay signed in and see the marketplace the way you set it.',
            ],
          },
          {
            p: 'We do not use advertising trackers or third-party analytics, and we do not sell your information.',
          },
        ],
      },
      {
        title: 'How we use it',
        blocks: [
          {
            list: [
              'To run the marketplace: publish your listings, deliver your messages, and show you listings near you.',
              'To keep people safe: review reported listings and users, verify sellers, and prevent fraud and spam.',
              'To send you notifications you have asked for, such as new messages.',
              'To process payments for paid features.',
              'To fix problems and improve the service.',
            ],
          },
        ],
      },
      {
        title: 'Who can see or receive your information',
        blocks: [
          {
            list: [
              'Other users — your public listings and seller profile, and the messages you send them.',
              'Our moderators — to handle reports and verification requests.',
              'Service providers that host and operate East-Market for us: Supabase (database, sign-in and file storage, in the European Union), Vercel (website and API hosting) and, for push notifications, Google Firebase and Apple.',
              'Mobile money providers (such as Zaad, eDahab, EVC Plus, Sahal, Telebirr and M-Pesa) — only the details needed to complete a payment you make.',
              'Authorities — when the law requires it, or to protect people from harm or fraud.',
            ],
          },
          {
            p: 'When you contact a seller by WhatsApp or phone, that conversation happens outside East-Market and is covered by those services’ own policies.',
          },
        ],
      },
      {
        title: 'How long we keep it',
        blocks: [
          {
            p: 'We keep your account and listings while your account is open. When you delete a listing it is removed from the marketplace. When we delete your account at your request, we delete your profile, listings, messages and favorites, and the photos and videos you uploaded. We may keep payment records and moderation records for longer where the law or fraud prevention requires it.',
          },
        ],
      },
      {
        title: 'Your choices and rights',
        blocks: [
          {
            list: [
              'Edit your profile and listings at any time in the app.',
              'Turn off location access and notifications in your device settings.',
              'Ask for a copy of your information, a correction, or the deletion of your account by emailing {email} from the address on your account. We will respond within 30 days.',
            ],
          },
        ],
      },
      {
        title: 'Security',
        blocks: [
          {
            p: 'Connections to East-Market are encrypted (HTTPS). Access to data is limited by account: you can only change your own listings and read your own conversations, and identity documents are kept in private storage. No system is perfectly secure, so please use a strong password that you do not use elsewhere.',
          },
        ],
      },
      {
        title: 'Children',
        blocks: [
          {
            p: 'East-Market is not intended for children under 16, and we do not knowingly collect information from them. If you believe a child has created an account, contact us and we will remove it.',
          },
        ],
      },
      {
        title: 'Changes to this policy',
        blocks: [
          {
            p: 'If we change this policy we will update the date at the top of this page. For significant changes we will also let you know before they take effect.',
          },
        ],
      },
      {
        title: 'Contact',
        blocks: [{ p: 'Questions about this policy or your information: {email}.' }],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    description:
      'The rules for buying and selling on East-Market: accounts, listings, prohibited items, paid features and safety.',
    intro:
      'These terms are the agreement between you and East-Market for using the East-Market website and the Android and iOS apps. By creating an account or using East-Market you agree to them. Please also read our [Privacy Policy](/legal/privacy), which explains how we handle your information.',
    sections: [
      {
        title: 'What East-Market is',
        blocks: [
          {
            p: 'East-Market is a place where people in Somaliland, Somalia, Ethiopia, Kenya and Djibouti advertise items and property for sale or rent and contact each other. We are not the buyer or the seller, we do not own or inspect the items listed, and we are not a party to any deal you make. Payment, delivery and the condition of an item are between the buyer and the seller.',
          },
        ],
      },
      {
        title: 'Your account',
        blocks: [
          {
            list: [
              'You must be at least 16 years old to use East-Market.',
              'Give accurate information, and keep your contact details up to date so buyers and sellers can reach you.',
              'Keep your password private. You are responsible for what happens on your account; tell us straight away if you think someone else is using it.',
              'Do not use another person’s account, or open new accounts to get around a suspension.',
            ],
          },
        ],
      },
      {
        title: 'Listing rules',
        blocks: [
          {
            list: [
              'Only list things you own or are authorised to sell or rent, and that are actually available.',
              'Describe items honestly: a real price, the true condition, and photos and videos of the actual item.',
              'Put each listing in the right category and location, and do not post the same item repeatedly.',
              'Mark a listing as sold, or delete it, once it is no longer available.',
            ],
          },
        ],
      },
      {
        title: 'What is not allowed',
        blocks: [
          { p: 'You may not list, or use East-Market to arrange:' },
          {
            list: [
              'Anything illegal where you or the buyer are, including stolen goods, weapons and ammunition, drugs, and counterfeit or pirated goods.',
              'Wild or protected animals and their parts, such as ivory.',
              'Adult services, any trade in people, or anything that exploits children.',
              'Fake listings, advance-fee or deposit scams, and requests for payment for items that do not exist.',
            ],
          },
          { p: 'You also may not:' },
          {
            list: [
              'Harass, threaten or abuse other users, or post hateful or offensive content.',
              'Send spam, or use other users’ contact details for anything other than the listing.',
              'Scrape the site, interfere with how it works, or try to get into accounts or data that are not yours.',
            ],
          },
        ],
      },
      {
        title: 'How we moderate',
        blocks: [
          {
            p: 'To keep the marketplace safe we may review listings before or after they appear, and we may move a listing to the right category, reject or remove a listing, or suspend or close an account that breaks these terms or that we reasonably believe puts other users at risk. Listings may also expire after a period without being renewed. If you think we made a mistake, contact us and we will look at it again.',
          },
          {
            p: 'Use the Report button on any listing or user that breaks these rules. Reports help us act quickly.',
          },
        ],
      },
      {
        title: 'Paid features',
        blocks: [
          {
            p: 'Posting a listing is free. Optional paid features, such as featured listings and seller subscriptions, are charged at the price shown before you pay, through the mobile money provider you choose. A featured placement or subscription runs for the period shown at purchase and does not guarantee a sale. If a paid feature was not delivered, or you were charged in error, contact us within 30 days and we will put it right or refund you. Paid features are not refunded when a listing is removed for breaking these terms.',
          },
        ],
      },
      {
        title: 'Staying safe',
        blocks: [
          {
            list: [
              'Meet in a public place and inspect the item before you pay.',
              'Be careful with requests to pay a deposit or send money before you have seen the item.',
              'For property, land and vehicles, check ownership documents before any money changes hands.',
              'Keep conversations in East-Market messages where you can, so they can be reviewed if something goes wrong.',
            ],
          },
        ],
      },
      {
        title: 'Your content',
        blocks: [
          {
            p: 'You keep ownership of the text, photos and videos you post. By posting them you allow East-Market to store, display, resize and share them on the website and apps, and in links people share, for as long as the listing is up. You confirm you have the right to post them and that they do not infringe anyone else’s rights.',
          },
          {
            p: 'The East-Market name, logo and design belong to East-Market and may not be used without our permission.',
          },
        ],
      },
      {
        title: 'Ending your account',
        blocks: [
          {
            p: 'You can stop using East-Market at any time and ask us to delete your account by emailing {email}. We may suspend or close an account that breaks these terms. Some records may be kept after an account is closed, as described in the Privacy Policy.',
          },
        ],
      },
      {
        title: 'Disclaimers and liability',
        blocks: [
          {
            p: 'East-Market is provided “as is”. We work to keep it available and accurate, but we do not promise it will always be uninterrupted or error-free, and we cannot guarantee that listings or users are genuine. Because we are not a party to deals between users, we are not responsible for the items, the payments or the conduct of buyers and sellers.',
          },
          {
            p: 'To the extent the law allows, East-Market is not liable for indirect or consequential losses, and our total liability to you is limited to the amount you paid us for paid features in the 12 months before the claim. Nothing in these terms limits rights you have under the law that cannot be limited.',
          },
        ],
      },
      {
        title: 'Changes to these terms',
        blocks: [
          {
            p: 'We may update these terms as East-Market changes. We will update the date at the top of this page and, for significant changes, let you know before they take effect. If you keep using East-Market after that, you accept the updated terms.',
          },
        ],
      },
      {
        title: 'Contact',
        blocks: [{ p: 'Questions about these terms: {email}.' }],
      },
    ],
  },

  guidelines: {
    title: 'Community Guidelines',
    description:
      'How to buy and sell well on East-Market: honest listings, respectful messages, safe deals, and what to report.',
    intro:
      'East-Market works when buyers can trust what they see and sellers are treated fairly. These guidelines explain, in everyday terms, what that looks like. They sit alongside our [Terms of Service](/legal/terms), which are the binding rules.',
    sections: [
      {
        title: 'Be honest in your listings',
        blocks: [
          {
            list: [
              'Use your own photos and videos of the actual item, not pictures copied from the internet or another listing.',
              'Show the price you will really accept. If it is negotiable, say so — do not post a low price to attract calls and then ask for more.',
              'Describe the condition truthfully, including any faults, damage or missing parts.',
              'Give the real location of the item, so buyers know how far they will travel.',
              'Post each item once, in the category that fits it best.',
              'Mark it sold, or delete it, as soon as it is gone.',
            ],
          },
        ],
      },
      {
        title: 'Property, land, vehicles and livestock',
        blocks: [
          { p: 'These deals involve large sums, so they need extra care.' },
          {
            list: [
              'Houses and land: only list property you own or are authorised to sell or rent, and be ready to show title or authorisation documents.',
              'Vehicles: give the real year, mileage and condition, and have the registration papers ready for the buyer to check.',
              'Livestock: describe the animals’ age, breed and health honestly, and let buyers see them before paying.',
              'Rentals: state the rent, the deposit and what is included, and do not ask for money before the tenant has seen the place.',
            ],
          },
        ],
      },
      {
        title: 'Talk to each other with respect',
        blocks: [
          {
            list: [
              'Be polite, even when you disagree on a price. A “no, thank you” is enough.',
              'No insults, threats, harassment, or hateful comments about anyone’s clan, tribe, religion, nationality, gender or disability.',
              'Answer messages about your listings, and tell buyers when an item has sold.',
              'Use someone’s phone number or WhatsApp only to talk about the listing they posted.',
            ],
          },
        ],
      },
      {
        title: 'Keep deals safe',
        blocks: [
          {
            list: [
              'Meet in a busy public place, and bring someone with you for high-value items.',
              'See and check the item before you pay. Never send a deposit for something you have not seen.',
              'Be wary of prices that look too good to be true, and of pressure to decide or pay quickly.',
              'Never share your mobile money PIN or a verification code — East-Market will never ask for them.',
              'Keep your conversation in East-Market messages where you can, so there is a record if something goes wrong.',
            ],
          },
        ],
      },
      {
        title: 'Never allowed',
        blocks: [
          {
            p: 'Some things are never allowed, however they are described: illegal goods, stolen property, weapons and ammunition, drugs, counterfeit goods, protected wildlife, adult services, any trade in people, and anything that exploits children. The full list is in the [Terms of Service](/legal/terms).',
          },
        ],
      },
      {
        title: 'Report what looks wrong',
        blocks: [
          {
            p: 'Use the Report button on a listing or a user’s profile. Reports are private — the person you report is not told who reported them. Choose the reason that fits best:',
          },
          {
            list: [
              '**Scam** — asks for payment up front, pretends to be someone else, or the item does not exist.',
              '**Fake product** — counterfeit, or the photos are not of the real item.',
              '**Wrong information** — the price, condition, location or category is misleading.',
              '**Offensive** — insulting, hateful or abusive content or messages.',
              '**Illegal** — anything on the never-allowed list above.',
              '**Duplicate** — the same item posted more than once.',
              '**Spam** — repeated, irrelevant or advertising messages.',
              '**Other** — anything else that breaks these guidelines; add a short note so we understand.',
            ],
          },
          {
            p: 'If you are in danger or have been the victim of a crime, contact the local police first.',
          },
        ],
      },
      {
        title: 'What happens when guidelines are broken',
        blocks: [
          {
            p: 'Our moderators review reports and may ask you to correct a listing, move it to the right category, remove it, or — for serious or repeated problems — suspend or close the account. Scams, illegal items and threats can lead to an account being closed straight away. If you think we got it wrong, email {email} and we will look again.',
          },
        ],
      },
    ],
  },
};
