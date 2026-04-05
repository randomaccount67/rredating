export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <span className="label text-[#FF4655]">// LEGAL</span>
      <h1 className="font-extrabold text-5xl uppercase text-[#E8EAF0] mt-1 mb-8" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        PRIVACY POLICY
      </h1>
      <div className="space-y-6 text-[#8B8FA8] text-sm leading-relaxed">
        <p className="font-mono text-[10px] text-[#525566]">LAST UPDATED: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</p>

        {[
          {
            title: '1. WHAT WE COLLECT',
            content: 'We collect: your email address (via Clerk authentication), Riot ID and tag (self-reported), rank and gameplay info (self-reported), profile picture (uploaded by you), messages you send on the platform, region and role preferences.'
          },
          {
            title: '2. HOW WE USE YOUR DATA',
            content: 'Your data is used to: display your profile to other users, match you with compatible players, enable messaging between matched users, send you notifications about matches and messages. We do NOT sell your data to third parties. Ever.'
          },
          {
            title: '3. DATA STORAGE',
            content: 'Your data is stored in Supabase (PostgreSQL database) hosted in the United States. Profile pictures are stored in Supabase Storage. Authentication is handled by Clerk.'
          },
          {
            title: '4. WHO SEES YOUR DATA',
            content: 'Your profile is visible to all logged-in users on the browse page. Your messages are only visible to you and your matched duo. Your email address is never displayed publicly.'
          },
          {
            title: '5. THIRD-PARTY SERVICES',
            content: 'We use Clerk for authentication (they handle your email and OAuth), Supabase for database and storage, and Vercel for hosting. These services have their own privacy policies.'
          },
          {
            title: '6. DATA DELETION',
            content: 'You can delete your account at any time through the account settings. Upon deletion, your profile will be removed from the browse page. Messages in existing conversations may persist for the other party.'
          },
          {
            title: '7. COOKIES',
            content: 'We use cookies for authentication (managed by Clerk). We do not use tracking cookies or advertising cookies.'
          },
          {
            title: '8. MINORS',
            content: 'RRedating is strictly for users 18 and older. We do not knowingly collect data from anyone under 18. If we discover a minor has created an account, it will be immediately terminated.'
          },
          {
            title: '9. CONTACT',
            content: 'This is a community project. If you have privacy concerns, feel free to delete your account and stop using the service.'
          },
        ].map(section => (
          <div key={section.title}>
            <h2 className="font-bold text-base uppercase text-[#E8EAF0] mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              {section.title}
            </h2>
            <p>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
