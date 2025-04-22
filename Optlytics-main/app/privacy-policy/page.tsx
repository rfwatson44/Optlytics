import React from "react";

const privacyHtml = `
  <h1>Privacy Policy</h1>
  <p>
    By working with and using Mindful.agency, you agree to the collection and use of your information as stated in this policy. 
    If any changes are made to our privacy policy we will notify you via e-mail and update it on this page as well.
  </p>

  <h2>Summary</h2>
  <ul>
    <li>We will never give, sell, rent or borrow your information to anyone.</li>
    <li>We will never spam you.</li>
    <li>We will never have direct access to your payment methods without your consent.</li>
    <li>You can opt out of all marketing communication at any time.</li>
    <li>You can request or delete all data we have on you at any time.</li>
  </ul>

  <h2>How we treat your information</h2>
  <p>We will never give, sell, rent or borrow your information to anyone without your express permission.</p>
  <p>We may contact you with updates, blog posts, or newsletters — you can unsubscribe at any time.</p>
  <p>We encrypt your payment information and only charge what you've agreed to.</p>
  <p>Your information is used to personalize your experience, improve service, and process transactions. It will not be shared without your consent.</p>

  <h2>What information do we collect?</h2>
  <p>We collect information through website forms and client intake processes, including:</p>
  <ul>
    <li>Personal: name, email address, phone number</li>
    <li>Transactions: billing and payment information</li>
  </ul>

  <h2>How do we protect your information?</h2>
  <p>We use SSL (secure socket layer) technology to encrypt your data during transactions.</p>

  <h2>Do we use cookies?</h2>
  <p>Yes, we use cookies (also known as pixels) to track site usage and ad performance. You can delete cookies through your browser settings.</p>

  <h2>Facebook Marketing API & Internal Platform Usage</h2>
  <p>
    As part of our internal operations, Mindful.agency uses a secure, access-controlled application 
    (“<strong>Mindful’s Analytic Platform</strong>”) to retrieve advertising performance data via Meta’s (Facebook) Marketing API. 
    This platform is used solely by approved members of our internal team (Users and Admins), who are manually authorized through a backend approval process.
  </p>
  <p>
    The platform is used to analyze and optimize advertising campaigns we manage on behalf of our clients. 
    It allows internal users to sort, filter, and visualize ad performance data.
  </p>
  <p>
    We do <strong>not</strong> collect personal Facebook user data, and the only data stored is internal team email addresses 
    used for authentication in a secure Supabase database. 
    We do not share or resell this data. All access is compliant with Meta’s Platform Terms and Data Handling Guidelines.
  </p>

  <h2>California Online Privacy Protection Act Compliance</h2>
  <p>We will not distribute your personal information to outside parties without your consent.</p>

  <h2>Children’s Online Privacy Protection Act Compliance</h2>
  <p>We do not knowingly collect information from anyone under 13 years of age.</p>

  <h2>Online Privacy Policy Only</h2>
  <p>This policy applies only to information collected through our website, not offline data.</p>

  <h2>Terms of Service</h2>
  <p>See our Terms of Service linked from the sign-up form for usage terms, disclaimers, and liability information.</p>

  <h2>Your Consent</h2>
  <p>By using our site, you consent to our website's privacy policy.</p>

  <h2>Changes to our Privacy Policy</h2>
  <p>If we change our privacy policy, we will update the changes on this page.</p>
  <p><strong>This policy was last modified on 04/21/2025.</strong></p>
`;

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-gray-900 bg-white rounded shadow">
      <div
        className="prose prose-lg"
        dangerouslySetInnerHTML={{ __html: privacyHtml }}
      />
    </div>
  );
}
